import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { and, desc, eq, inArray } from "drizzle-orm";

import type {
  PrivacyLevel,
  VisaAccessLogEntry,
  VisaAccessResult,
  VisaAccessType,
  VisaBundleCreateInput,
  VisaBundleSnapshot,
  VisaBundleStatus,
  VisaBundleSummary,
  VisaFeedbackCreateInput,
  VisaFeedbackQueueItem,
  VisaFeedbackStatus,
  VisaRedactionConfig
} from "@ai-knowledge-passport/shared";

import type { AppContext } from "@/server/context";
import {
  grants,
  passportSnapshots,
  postcards,
  sources,
  visaAccessLogs,
  visaBundles,
  visaFeedbackQueue,
  wikiNodes
} from "@/server/db/schema";

import { writeAuditLog } from "./audit";
import { createId, nowIso, parseJsonArray, parseJsonObject } from "./common";
import { createGrant } from "./grants";
import { assertPolicyAllows, resolveObjectPolicy } from "./policies";
import { canIncludeInPassport } from "./privacy";

type VisaNode = {
  id: string;
  title: string;
  summary: string;
  tags: string[];
  projectKey: string | null;
  sourceIds: string[];
};

type VisaPostcard = {
  id: string;
  title: string;
  claim: string;
  evidenceSummary: string;
  cardType: string;
  relatedNodeIds: string[];
  relatedSourceIds: string[];
};

type SourceReferenceSummary = {
  count: number;
  sourceIds?: string[];
  originUrls?: string[];
  filePaths?: string[];
};

type VisaBundleRow = typeof visaBundles.$inferSelect;
type VisaAccessLogRow = typeof visaAccessLogs.$inferSelect;
type VisaFeedbackRow = typeof visaFeedbackQueue.$inferSelect;

export type VisaRequestMeta = {
  userAgent?: string | null;
  sessionHashSource?: string | null;
  visitorLabel?: string | null;
};

export type VisaAccessOutcome =
  | { status: "active"; visa: VisaBundleSnapshot }
  | { status: "invalid" | "revoked" | "expired" | "machine_disabled" | "human_limit_reached" | "machine_limit_reached" };

function resolveShareSecretPath(context: AppContext) {
  return path.join(context.paths.dataDir, ".share-secret");
}

function getShareSecret(context: AppContext) {
  const configured = process.env.AIKP_SHARE_SECRET?.trim();
  if (configured) {
    return configured;
  }

  const secretPath = resolveShareSecretPath(context);
  if (fs.existsSync(secretPath)) {
    return fs.readFileSync(secretPath, "utf8").trim();
  }

  fs.mkdirSync(context.paths.dataDir, { recursive: true });
  const generated = crypto.randomBytes(32).toString("hex");
  fs.writeFileSync(secretPath, generated, { mode: 0o600 });
  return generated;
}

function buildVisaToken(context: AppContext, visaId: string) {
  const secret = getShareSecret(context);
  const signature = crypto.createHmac("sha256", secret).update(visaId).digest("base64url");
  return `${visaId}.${signature}`;
}

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function buildSecretPath(token: string) {
  return `/v/${token}`;
}

function buildMachinePath(token: string) {
  return `/v/${token}/machine`;
}

function parseRedaction(value: string | null | undefined) {
  return parseJsonObject<VisaRedactionConfig>(value, {
    hideOriginUrls: false,
    hideSourcePaths: false,
    hideRawSourceIds: false
  });
}

function parseVisaStatus(row: VisaBundleRow): VisaBundleStatus {
  if (row.status === "revoked") {
    return "revoked";
  }
  if (row.status === "expired") {
    return "expired";
  }
  if (row.expiresAt && Date.parse(row.expiresAt) <= Date.now()) {
    return "expired";
  }
  return "active";
}

function normalizeCount(value: number | null | undefined) {
  return value ?? 0;
}

function normalizeLimit(value: number | null | undefined) {
  return value ?? null;
}

function buildSessionHash(context: AppContext, input: string | null | undefined) {
  const normalized = input?.trim();
  if (!normalized) {
    return null;
  }
  const secret = getShareSecret(context);
  return crypto.createHmac("sha256", secret).update(normalized).digest("hex");
}

function buildDeniedObjectId(token: string) {
  const visaId = token.split(".")[0] ?? "";
  return visaId.startsWith("visa_") ? visaId : `token_${hashToken(token).slice(0, 12)}`;
}

function getHumanLimitExceeded(row: VisaBundleRow) {
  const maxAccessCount = normalizeLimit(row.maxAccessCount);
  return maxAccessCount !== null && normalizeCount(row.accessCount) >= maxAccessCount;
}

function getMachineLimitExceeded(row: VisaBundleRow) {
  const maxMachineDownloads = normalizeLimit(row.maxMachineDownloads);
  return maxMachineDownloads !== null && normalizeCount(row.machineDownloadCount) >= maxMachineDownloads;
}

function buildSourceReferenceSummary(
  sourceIds: string[],
  sourceMap: Map<string, typeof sources.$inferSelect>,
  redaction: VisaRedactionConfig
): SourceReferenceSummary {
  const uniqueSourceIds = Array.from(new Set(sourceIds));
  const refs = uniqueSourceIds
    .map((sourceId) => sourceMap.get(sourceId))
    .filter((source): source is typeof sources.$inferSelect => Boolean(source));

  return {
    count: refs.length,
    sourceIds: redaction.hideRawSourceIds ? undefined : refs.map((source) => source.id),
    originUrls: redaction.hideOriginUrls
      ? undefined
      : Array.from(new Set(refs.map((source) => source.originUrl).filter((value): value is string => Boolean(value)))),
    filePaths: redaction.hideSourcePaths
      ? undefined
      : Array.from(new Set(refs.map((source) => source.filePath).filter((value): value is string => Boolean(value))))
  };
}

function renderVisaHumanMarkdown(input: {
  title: string;
  audienceLabel: string;
  passportTitle?: string | null;
  description: string;
  purpose: string;
  expiresAt?: string | null;
  passportContext?: {
    focusCard?: { title?: string; goal?: string } | null;
    capabilitySignals?: Array<{ topic?: string; observedPractice?: string; currentGaps?: string }>;
    mistakePatterns?: Array<{ topic?: string; description?: string }>;
  } | null;
  nodes: VisaNode[];
  cards: VisaPostcard[];
  sourceMap: Map<string, typeof sources.$inferSelect>;
}) {
  const lines: string[] = [
    `# ${input.title}`,
    "",
    `Audience: ${input.audienceLabel}`,
    "Access: Read-only secret link",
    `Expiry: ${input.expiresAt ?? "No expiry"}`,
    `Origin: ${input.passportTitle ? `Passport snapshot · ${input.passportTitle}` : "Direct visa selection"}`
  ];

  if (input.description.trim()) {
    lines.push("", `Description: ${input.description.trim()}`);
  }

  if (input.purpose.trim()) {
    lines.push("", `Purpose: ${input.purpose.trim()}`);
  }

  if (input.passportContext) {
    const focusTitle = input.passportContext.focusCard?.title;
    const focusGoal = input.passportContext.focusCard?.goal;
    const signals = input.passportContext.capabilitySignals ?? [];
    const mistakes = input.passportContext.mistakePatterns ?? [];

    lines.push("", "## Passport Context");
    lines.push("", `Active focus: ${focusTitle ?? "none"}`);
    if (focusGoal) {
      lines.push("", `Goal: ${focusGoal}`);
    }

    if (signals.length) {
      lines.push("", "### Capability Signals");
      for (const signal of signals.slice(0, 5)) {
        lines.push("", `- ${signal.topic ?? "Untitled"}: ${signal.observedPractice ?? ""}${signal.currentGaps ? ` | Gaps: ${signal.currentGaps}` : ""}`);
      }
    }

    if (mistakes.length) {
      lines.push("", "### Blind Spots");
      for (const mistake of mistakes.slice(0, 5)) {
        lines.push("", `- ${mistake.topic ?? "Untitled"}: ${mistake.description ?? ""}`);
      }
    }
  }

  if (input.cards.length) {
    lines.push("", "## Postcards");
    for (const card of input.cards) {
      const sourceCount = Array.from(new Set(card.relatedSourceIds)).filter((id) => input.sourceMap.has(id)).length;
      lines.push(
        "",
        `### ${card.title}`,
        "",
        `Type: ${card.cardType}`,
        "",
        card.claim,
        "",
        `Evidence: ${card.evidenceSummary}`,
        "",
        `Related nodes: ${card.relatedNodeIds.length}`,
        `Source references: ${sourceCount}`
      );
    }
  }

  if (input.nodes.length) {
    lines.push("", "## Nodes");
    for (const node of input.nodes) {
      const sourceCount = Array.from(new Set(node.sourceIds)).filter((id) => input.sourceMap.has(id)).length;
      lines.push(
        "",
        `### ${node.title}`,
        "",
        node.summary,
        "",
        `Tags: ${node.tags.length ? node.tags.join(", ") : "None"}`,
        `Project: ${node.projectKey ?? "None"}`,
        `Source references: ${sourceCount}`
      );
    }
  }

  return lines.join("\n");
}

function buildVisaMachineManifest(input: {
  visaId: string;
  title: string;
  audienceLabel: string;
  passportId: string | null;
  passportContext: Record<string, unknown> | null;
  description: string;
  purpose: string;
  privacyFloor: PrivacyLevel;
  expiresAt: string | null;
  allowMachineDownload: boolean;
  status: VisaBundleStatus;
  maxAccessCount: number | null;
  maxMachineDownloads: number | null;
  redaction: VisaRedactionConfig;
  nodes: VisaNode[];
  cards: VisaPostcard[];
  sourceMap: Map<string, typeof sources.$inferSelect>;
}) {
  return {
    visaId: input.visaId,
    title: input.title,
    audienceLabel: input.audienceLabel,
    sourcePassportId: input.passportId,
    passportContext: input.passportContext,
    description: input.description,
    purpose: input.purpose,
    generatedAt: nowIso(),
    boundaries: {
      accessMode: "secret_link",
      readOnly: true,
      status: input.status,
      expiresAt: input.expiresAt,
      allowMachineDownload: input.allowMachineDownload,
      privacyFloor: input.privacyFloor,
      maxAccessCount: input.maxAccessCount,
      maxMachineDownloads: input.maxMachineDownloads
    },
    nodes: input.nodes.map((node) => ({
      id: node.id,
      title: node.title,
      summary: node.summary,
      tags: node.tags,
      projectKey: node.projectKey,
      sourceReferences: buildSourceReferenceSummary(node.sourceIds, input.sourceMap, input.redaction)
    })),
    postcards: input.cards.map((card) => ({
      id: card.id,
      title: card.title,
      claim: card.claim,
      evidenceSummary: card.evidenceSummary,
      cardType: card.cardType,
      relatedNodeIds: card.relatedNodeIds,
      sourceReferences: buildSourceReferenceSummary(card.relatedSourceIds, input.sourceMap, input.redaction)
    }))
  };
}

async function loadPassportFallback(
  context: AppContext,
  passportId: string | undefined,
  includeNodeIds: string[],
  includePostcardIds: string[]
) {
  if (!passportId) {
    return {
      passportTitle: null,
      passportContext: null,
      resolvedNodeIds: includeNodeIds,
      resolvedPostcardIds: includePostcardIds
    };
  }

  const passport = await context.db.query.passportSnapshots.findFirst({
    where: eq(passportSnapshots.id, passportId)
  });

  if (!passport) {
    throw new Error("Passport snapshot not found.");
  }

  const usePassportSnapshot = !includeNodeIds.length && !includePostcardIds.length;

  return {
    passportTitle: passport.title,
    passportContext: JSON.parse(passport.machineManifestJson) as Record<string, unknown>,
    resolvedNodeIds: usePassportSnapshot ? parseJsonArray<string>(passport.includeNodeIdsJson) : includeNodeIds,
    resolvedPostcardIds: usePassportSnapshot ? parseJsonArray<string>(passport.includePostcardIdsJson) : includePostcardIds
  };
}

async function loadVisaContent(context: AppContext, input: VisaBundleCreateInput) {
  const fallback = await loadPassportFallback(context, input.passportId, input.includeNodeIds, input.includePostcardIds);

  if (!fallback.resolvedNodeIds.length && !fallback.resolvedPostcardIds.length) {
    throw new Error("A visa must include either a source passport or at least one node or postcard.");
  }

  const nodeRows = fallback.resolvedNodeIds.length
    ? await context.db.query.wikiNodes.findMany({
        where: inArray(wikiNodes.id, fallback.resolvedNodeIds)
      })
    : [];
  const cardRows = fallback.resolvedPostcardIds.length
    ? await context.db.query.postcards.findMany({
        where: inArray(postcards.id, fallback.resolvedPostcardIds)
      })
    : [];

  if (nodeRows.length !== fallback.resolvedNodeIds.length) {
    throw new Error("One or more selected nodes could not be found.");
  }
  if (cardRows.length !== fallback.resolvedPostcardIds.length) {
    throw new Error("One or more selected postcards could not be found.");
  }
  if (nodeRows.some((node) => node.status !== "accepted")) {
    throw new Error("Visa bundles can only include accepted nodes.");
  }

  const nodes: VisaNode[] = nodeRows
    .filter((node) => canIncludeInPassport(node.privacyLevel as PrivacyLevel, input.privacyFloor))
    .map((node) => ({
      id: node.id,
      title: node.title,
      summary: node.summary,
      tags: parseJsonArray<string>(node.tagsJson),
      projectKey: node.projectKey,
      sourceIds: parseJsonArray<string>(node.sourceIdsJson)
    }));

  const cards: VisaPostcard[] = cardRows
    .filter((card) => canIncludeInPassport(card.privacyLevel as PrivacyLevel, input.privacyFloor))
    .map((card) => ({
      id: card.id,
      title: card.title,
      claim: card.claim,
      evidenceSummary: card.evidenceSummary,
      cardType: card.cardType,
      relatedNodeIds: parseJsonArray<string>(card.relatedNodeIdsJson),
      relatedSourceIds: parseJsonArray<string>(card.relatedSourceIdsJson)
    }));

  if (!nodes.length && !cards.length) {
    throw new Error("No selected content remained visible after applying the visa privacy floor.");
  }

  return {
    passportTitle: fallback.passportTitle,
    passportContext: fallback.passportContext,
    nodes,
    cards
  };
}

async function loadVisaSourceMap(
  context: AppContext,
  input: { nodes: VisaNode[]; cards: VisaPostcard[] }
) {
  const allSourceIds = Array.from(
    new Set([
      ...input.nodes.flatMap((node) => node.sourceIds),
      ...input.cards.flatMap((card) => card.relatedSourceIds)
    ])
  );

  const relatedSources = allSourceIds.length
    ? await context.db.query.sources.findMany({
        where: inArray(sources.id, allSourceIds)
      })
    : [];

  return new Map(relatedSources.map((source) => [source.id, source]));
}

function buildMachineManifestFromRow(
  row: VisaBundleRow,
  pendingFeedbackCount: number
) {
  const base = JSON.parse(row.machineManifestJson) as Record<string, unknown>;
  const baseBoundaries = base.boundaries && typeof base.boundaries === "object" ? (base.boundaries as Record<string, unknown>) : {};

  return {
    ...base,
    description: row.description ?? "",
    purpose: row.purpose ?? "",
    boundaries: {
      ...baseBoundaries,
      status: parseVisaStatus(row),
      expiresAt: row.expiresAt ?? null,
      allowMachineDownload: Boolean(row.allowMachineDownload),
      privacyFloor: row.privacyFloor,
      maxAccessCount: normalizeLimit(row.maxAccessCount),
      accessCount: normalizeCount(row.accessCount),
      maxMachineDownloads: normalizeLimit(row.maxMachineDownloads),
      machineDownloadCount: normalizeCount(row.machineDownloadCount)
    },
    sharingMetrics: {
      lastHumanAccessedAt: row.lastAccessedAt ?? null,
      lastMachineAccessedAt: row.lastMachineAccessedAt ?? null,
      pendingFeedbackCount
    }
  };
}

function buildVisaSummaryFromRow(
  context: AppContext,
  row: VisaBundleRow,
  pendingFeedbackCount = 0
): VisaBundleSummary {
  const token = buildVisaToken(context, row.id);
  const allowMachineDownload = Boolean(row.allowMachineDownload);

  return {
    id: row.id,
    title: row.title,
    audienceLabel: row.audienceLabel,
    passportId: row.passportId ?? null,
    description: row.description ?? "",
    purpose: row.purpose ?? "",
    includeNodeIds: parseJsonArray<string>(row.includeNodeIdsJson),
    includePostcardIds: parseJsonArray<string>(row.includePostcardIdsJson),
    privacyFloor: row.privacyFloor as PrivacyLevel,
    redaction: parseRedaction(row.redactionJson),
    allowMachineDownload,
    expiresAt: row.expiresAt ?? null,
    status: parseVisaStatus(row),
    lastAccessedAt: row.lastAccessedAt ?? null,
    lastMachineAccessedAt: row.lastMachineAccessedAt ?? null,
    accessCount: normalizeCount(row.accessCount),
    maxAccessCount: normalizeLimit(row.maxAccessCount),
    machineDownloadCount: normalizeCount(row.machineDownloadCount),
    maxMachineDownloads: normalizeLimit(row.maxMachineDownloads),
    pendingFeedbackCount,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    secretPath: buildSecretPath(token),
    machinePath: allowMachineDownload ? buildMachinePath(token) : null
  };
}

function buildVisaSnapshotFromRow(
  context: AppContext,
  row: VisaBundleRow,
  pendingFeedbackCount = 0
): VisaBundleSnapshot {
  return {
    ...buildVisaSummaryFromRow(context, row, pendingFeedbackCount),
    humanMarkdown: row.humanMarkdown,
    machineManifest: buildMachineManifestFromRow(row, pendingFeedbackCount)
  };
}

function parseVisaAccessLogRow(row: VisaAccessLogRow): VisaAccessLogEntry {
  return {
    id: row.id,
    visaId: row.visaId,
    accessType: row.accessType as VisaAccessType,
    result: row.result as VisaAccessResult,
    denialReason: row.denialReason ?? null,
    visitorLabel: row.visitorLabel ?? null,
    sessionHash: row.sessionHash ?? null,
    userAgent: row.userAgent ?? null,
    createdAt: row.createdAt
  };
}

function parseVisaFeedbackRow(row: VisaFeedbackRow): VisaFeedbackQueueItem {
  return {
    id: row.id,
    visaId: row.visaId,
    feedbackType: row.feedbackType as VisaFeedbackQueueItem["feedbackType"],
    visitorLabel: row.visitorLabel ?? null,
    message: row.message,
    status: row.status as VisaFeedbackStatus,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

async function setVisaStatus(context: AppContext, visaId: string, status: VisaBundleStatus) {
  await context.db
    .update(visaBundles)
    .set({
      status,
      updatedAt: nowIso()
    })
    .where(eq(visaBundles.id, visaId));

  await context.db
    .update(grants)
    .set({
      status,
      updatedAt: nowIso()
    })
    .where(
      and(
        eq(grants.objectType, "visa_bundle"),
        eq(grants.objectId, visaId),
        eq(grants.granteeType, "secret_link")
      )
    );
}

async function writeVisaAccessEvent(
  context: AppContext,
  input: {
    visaId: string;
    accessType: VisaAccessType;
    result: VisaAccessResult;
    denialReason?: string;
    meta?: VisaRequestMeta;
  }
) {
  const logId = createId("visa_access");
  await context.db.insert(visaAccessLogs).values({
    id: logId,
    visaId: input.visaId,
    accessType: input.accessType,
    result: input.result,
    denialReason: input.denialReason ?? null,
    visitorLabel: input.meta?.visitorLabel ?? null,
    sessionHash: buildSessionHash(context, input.meta?.sessionHashSource),
    userAgent: input.meta?.userAgent ?? null,
    createdAt: nowIso()
  });

  await writeAuditLog(context, {
    actorType: "external",
    actionType:
      input.accessType === "human_view"
        ? "access_visa"
        : input.accessType === "machine_download"
          ? "download_visa_machine_manifest"
          : "submit_visa_feedback",
    objectType: "visa_bundle",
    objectId: input.visaId,
    result: input.result === "succeeded" ? "succeeded" : "failed",
    notes: input.denialReason ?? input.meta?.visitorLabel ?? input.accessType
  });

  return logId;
}

async function getPendingFeedbackCountMap(context: AppContext, visaIds?: string[]) {
  const rows = visaIds?.length
    ? await context.db.query.visaFeedbackQueue.findMany({
        where: inArray(visaFeedbackQueue.visaId, visaIds)
      })
    : await context.db.query.visaFeedbackQueue.findMany();

  const counts = new Map<string, number>();
  for (const row of rows) {
    if (row.status !== "pending_review") {
      continue;
    }
    counts.set(row.visaId, (counts.get(row.visaId) ?? 0) + 1);
  }
  return counts;
}

async function resolveVisaRowByToken(context: AppContext, token: string) {
  const objectId = buildDeniedObjectId(token);
  const visaId = token.split(".")[0] ?? "";

  if (!visaId || !visaId.startsWith("visa_")) {
    return { status: "invalid" as const, objectId };
  }

  const row = await context.db.query.visaBundles.findFirst({
    where: eq(visaBundles.id, visaId)
  });

  if (!row) {
    return { status: "invalid" as const, objectId: visaId };
  }

  const expectedToken = buildVisaToken(context, visaId);
  if (!safeEqual(token, expectedToken) || !safeEqual(hashToken(token), row.tokenHash)) {
    return { status: "invalid" as const, objectId: row.id };
  }

  return { status: "resolved" as const, row };
}

export async function createVisaBundle(context: AppContext, input: VisaBundleCreateInput) {
  let effectivePrivacyFloor = input.privacyFloor;
  if (input.passportId) {
    const sourcePolicy = await assertPolicyAllows(context, "passport_snapshot", input.passportId, "secret_links");
    effectivePrivacyFloor = sourcePolicy.privacyFloor ?? input.privacyFloor;
    if (input.allowMachineDownload && !sourcePolicy.allowMachineAccess) {
      throw new Error(`Policy denied machine_access for passport_snapshot:${input.passportId}`);
    }
  }

  const content = await loadVisaContent(context, {
    ...input,
    privacyFloor: effectivePrivacyFloor
  });
  const sourceMap = await loadVisaSourceMap(context, content);

  const visaId = createId("visa");
  const token = buildVisaToken(context, visaId);
  const tokenHash = hashToken(token);

  const initialStatus: VisaBundleStatus =
    input.expiresAt && Date.parse(input.expiresAt) <= Date.now() ? "expired" : "active";

  const humanMarkdown = renderVisaHumanMarkdown({
    title: input.title,
    audienceLabel: input.audienceLabel,
    passportTitle: content.passportTitle,
    passportContext: content.passportContext as {
      focusCard?: { title?: string; goal?: string } | null;
      capabilitySignals?: Array<{ topic?: string; observedPractice?: string; currentGaps?: string }>;
      mistakePatterns?: Array<{ topic?: string; description?: string }>;
    } | null,
    description: input.description,
    purpose: input.purpose,
    expiresAt: input.expiresAt ?? null,
    nodes: content.nodes,
    cards: content.cards,
    sourceMap
  });

  const machineManifest = buildVisaMachineManifest({
    visaId,
    title: input.title,
    audienceLabel: input.audienceLabel,
    passportId: input.passportId ?? null,
    passportContext: content.passportContext ?? null,
    description: input.description,
    purpose: input.purpose,
    privacyFloor: effectivePrivacyFloor,
    expiresAt: input.expiresAt ?? null,
    allowMachineDownload: input.allowMachineDownload,
    status: initialStatus,
    maxAccessCount: input.maxAccessCount ?? null,
    maxMachineDownloads: input.maxMachineDownloads ?? null,
    redaction: input.redaction,
    nodes: content.nodes,
    cards: content.cards,
    sourceMap
  });

  const timestamp = nowIso();
  await context.db.insert(visaBundles).values({
    id: visaId,
    title: input.title,
    audienceLabel: input.audienceLabel,
    passportId: input.passportId ?? null,
    description: input.description,
    purpose: input.purpose,
    humanMarkdown,
    machineManifestJson: JSON.stringify(machineManifest),
    includeNodeIdsJson: JSON.stringify(content.nodes.map((node) => node.id)),
    includePostcardIdsJson: JSON.stringify(content.cards.map((card) => card.id)),
    privacyFloor: effectivePrivacyFloor,
    redactionJson: JSON.stringify(input.redaction),
    allowMachineDownload: input.allowMachineDownload ? 1 : 0,
    expiresAt: input.expiresAt ?? null,
    status: initialStatus,
    tokenHash,
    lastAccessedAt: null,
    lastMachineAccessedAt: null,
    accessCount: 0,
    maxAccessCount: input.maxAccessCount ?? null,
    machineDownloadCount: 0,
    maxMachineDownloads: input.maxMachineDownloads ?? null,
    createdAt: timestamp,
    updatedAt: timestamp
  });

  const grantId = await createGrant(context, {
    objectType: "visa_bundle",
    objectId: visaId,
    granteeType: "secret_link",
    accessLevel: "topic_read",
    expiresAt: input.expiresAt,
    redactionRules: input.redaction,
    notes: input.audienceLabel
  });

  const auditId = await writeAuditLog(context, {
    actionType: "create_visa",
    objectType: "visa_bundle",
    objectId: visaId,
    result: "succeeded",
    notes: input.audienceLabel
  });

  return {
    visaId,
    grantId,
    auditId,
    secretPath: buildSecretPath(token),
    machinePath: input.allowMachineDownload ? buildMachinePath(token) : null
  };
}

export async function listVisaBundles(context: AppContext, limit = 80) {
  const rows = await context.db.query.visaBundles.findMany({
    orderBy: [desc(visaBundles.updatedAt)],
    limit
  });

  const pendingCounts = await getPendingFeedbackCountMap(context, rows.map((row) => row.id));
  return rows.map((row) => buildVisaSummaryFromRow(context, row, pendingCounts.get(row.id) ?? 0));
}

export async function getVisaBundleById(context: AppContext, visaId: string) {
  const row = await context.db.query.visaBundles.findFirst({
    where: eq(visaBundles.id, visaId)
  });

  if (!row) {
    return null;
  }

  const pendingCounts = await getPendingFeedbackCountMap(context, [visaId]);
  return buildVisaSnapshotFromRow(context, row, pendingCounts.get(visaId) ?? 0);
}

export async function listVisaAccessLogs(context: AppContext, visaId: string, limit = 80) {
  const rows = await context.db.query.visaAccessLogs.findMany({
    where: eq(visaAccessLogs.visaId, visaId),
    orderBy: [desc(visaAccessLogs.createdAt)],
    limit
  });

  return rows.map(parseVisaAccessLogRow);
}

export async function listVisaFeedbackQueue(context: AppContext, visaId: string, limit = 80) {
  const rows = await context.db.query.visaFeedbackQueue.findMany({
    where: eq(visaFeedbackQueue.visaId, visaId),
    orderBy: [desc(visaFeedbackQueue.updatedAt)],
    limit
  });

  return rows
    .map(parseVisaFeedbackRow)
    .sort((left, right) => {
      if (left.status === right.status) {
        return right.updatedAt.localeCompare(left.updatedAt);
      }
      if (left.status === "pending_review") {
        return -1;
      }
      if (right.status === "pending_review") {
        return 1;
      }
      return right.updatedAt.localeCompare(left.updatedAt);
    });
}

export async function reviewVisaFeedback(
  context: AppContext,
  visaId: string,
  feedbackId: string,
  status: VisaFeedbackStatus
) {
  const row = await context.db.query.visaFeedbackQueue.findFirst({
    where: and(eq(visaFeedbackQueue.id, feedbackId), eq(visaFeedbackQueue.visaId, visaId))
  });

  if (!row) {
    throw new Error("Visa feedback item not found.");
  }

  await context.db
    .update(visaFeedbackQueue)
    .set({
      status,
      updatedAt: nowIso()
    })
    .where(and(eq(visaFeedbackQueue.id, feedbackId), eq(visaFeedbackQueue.visaId, visaId)));

  const auditId = await writeAuditLog(context, {
    actionType: "review_visa_feedback",
    objectType: "visa_feedback",
    objectId: feedbackId,
    result: "succeeded",
    notes: status
  });

  return {
    feedbackId,
    auditId
  };
}

export async function revokeVisaBundle(context: AppContext, visaId: string) {
  const row = await context.db.query.visaBundles.findFirst({
    where: eq(visaBundles.id, visaId)
  });

  if (!row) {
    throw new Error("Visa bundle not found.");
  }

  await setVisaStatus(context, visaId, "revoked");

  const auditId = await writeAuditLog(context, {
    actionType: "revoke_visa",
    objectType: "visa_bundle",
    objectId: visaId,
    result: "succeeded"
  });

  return {
    visaId,
    auditId
  };
}

async function buildSuccessfulAccessSnapshot(context: AppContext, visaId: string) {
  const refreshed = await context.db.query.visaBundles.findFirst({
    where: eq(visaBundles.id, visaId)
  });

  if (!refreshed) {
    throw new Error("Visa bundle not found after access update.");
  }

  const pendingCounts = await getPendingFeedbackCountMap(context, [visaId]);
  return buildVisaSnapshotFromRow(context, refreshed, pendingCounts.get(visaId) ?? 0);
}

export async function accessVisaBundleByToken(
  context: AppContext,
  token: string,
  mode: "human" | "machine",
  meta?: VisaRequestMeta
): Promise<VisaAccessOutcome> {
  const resolved = await resolveVisaRowByToken(context, token);
  if (resolved.status === "invalid") {
    await writeAuditLog(context, {
      actorType: "external",
      actionType: mode === "human" ? "access_visa" : "download_visa_machine_manifest",
      objectType: "visa_bundle",
      objectId: resolved.objectId,
      result: "failed",
      notes: "invalid_token"
    });
    return { status: "invalid" };
  }

  const row = resolved.row;
  const policy = await resolveObjectPolicy(context, "visa_bundle", row.id);
  const effectiveStatus = parseVisaStatus(row);
  if (effectiveStatus === "revoked") {
    await writeVisaAccessEvent(context, {
      visaId: row.id,
      accessType: mode === "human" ? "human_view" : "machine_download",
      result: "denied",
      denialReason: "revoked",
      meta
    });
    return { status: "revoked" };
  }

  if (effectiveStatus === "expired") {
    if (row.status !== "expired") {
      await setVisaStatus(context, row.id, "expired");
    }
    await writeVisaAccessEvent(context, {
      visaId: row.id,
      accessType: mode === "human" ? "human_view" : "machine_download",
      result: "denied",
      denialReason: "expired",
      meta
    });
    return { status: "expired" };
  }

  if (!policy.allowSecretLinks) {
    await writeVisaAccessEvent(context, {
      visaId: row.id,
      accessType: mode === "human" ? "human_view" : "machine_download",
      result: "denied",
      denialReason: "policy_secret_links_disabled",
      meta
    });
    return { status: "revoked" };
  }

  if (mode === "human" && getHumanLimitExceeded(row)) {
    await writeVisaAccessEvent(context, {
      visaId: row.id,
      accessType: "human_view",
      result: "denied",
      denialReason: "human_limit_reached",
      meta
    });
    return { status: "human_limit_reached" };
  }

  if (mode === "machine" && (!row.allowMachineDownload || !policy.allowMachineAccess)) {
    await writeVisaAccessEvent(context, {
      visaId: row.id,
      accessType: "machine_download",
      result: "denied",
      denialReason: !row.allowMachineDownload ? "machine_download_disabled" : "policy_machine_access_disabled",
      meta
    });
    return { status: "machine_disabled" };
  }

  if (mode === "machine" && getMachineLimitExceeded(row)) {
    await writeVisaAccessEvent(context, {
      visaId: row.id,
      accessType: "machine_download",
      result: "denied",
      denialReason: "machine_limit_reached",
      meta
    });
    return { status: "machine_limit_reached" };
  }

  if (mode === "human") {
    await context.db
      .update(visaBundles)
      .set({
        lastAccessedAt: nowIso(),
        accessCount: normalizeCount(row.accessCount) + 1
      })
      .where(eq(visaBundles.id, row.id));
  } else {
    await context.db
      .update(visaBundles)
      .set({
        lastMachineAccessedAt: nowIso(),
        machineDownloadCount: normalizeCount(row.machineDownloadCount) + 1
      })
      .where(eq(visaBundles.id, row.id));
  }

  await writeVisaAccessEvent(context, {
    visaId: row.id,
    accessType: mode === "human" ? "human_view" : "machine_download",
    result: "succeeded",
    meta
  });

  return {
    status: "active",
    visa: await buildSuccessfulAccessSnapshot(context, row.id)
  };
}

export async function submitVisaFeedbackByToken(
  context: AppContext,
  token: string,
  input: VisaFeedbackCreateInput,
  meta?: VisaRequestMeta
) {
  const resolved = await resolveVisaRowByToken(context, token);
  if (resolved.status === "invalid") {
    await writeAuditLog(context, {
      actorType: "external",
      actionType: "submit_visa_feedback",
      objectType: "visa_bundle",
      objectId: resolved.objectId,
      result: "failed",
      notes: "invalid_token"
    });
    return { status: "invalid" as const };
  }

  const row = resolved.row;
  const effectiveStatus = parseVisaStatus(row);
  if (effectiveStatus === "revoked") {
    await writeVisaAccessEvent(context, {
      visaId: row.id,
      accessType: "feedback_submit",
      result: "denied",
      denialReason: "revoked",
      meta
    });
    return { status: "revoked" as const };
  }
  if (effectiveStatus === "expired") {
    if (row.status !== "expired") {
      await setVisaStatus(context, row.id, "expired");
    }
    await writeVisaAccessEvent(context, {
      visaId: row.id,
      accessType: "feedback_submit",
      result: "denied",
      denialReason: "expired",
      meta
    });
    return { status: "expired" as const };
  }

  const feedbackId = createId("visa_feedback");
  const timestamp = nowIso();
  await context.db.insert(visaFeedbackQueue).values({
    id: feedbackId,
    visaId: row.id,
    feedbackType: input.feedbackType,
    visitorLabel: input.visitorLabel ?? null,
    message: input.message,
    status: "pending_review",
    createdAt: timestamp,
    updatedAt: timestamp
  });

  await writeVisaAccessEvent(context, {
    visaId: row.id,
    accessType: "feedback_submit",
    result: "succeeded",
    meta: {
      ...meta,
      visitorLabel: input.visitorLabel ?? meta?.visitorLabel ?? null
    }
  });

  await writeAuditLog(context, {
    actorType: "external",
    actionType: "submit_visa_feedback",
    objectType: "visa_feedback",
    objectId: feedbackId,
    result: "succeeded",
    notes: input.feedbackType
  });

  return {
    status: "active" as const,
    feedbackId
  };
}
