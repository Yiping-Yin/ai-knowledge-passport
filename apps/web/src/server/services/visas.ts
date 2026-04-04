import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { and, desc, eq, inArray } from "drizzle-orm";

import type {
  PrivacyLevel,
  VisaBundleCreateInput,
  VisaBundleSnapshot,
  VisaBundleStatus,
  VisaBundleSummary,
  VisaRedactionConfig
} from "@ai-knowledge-passport/shared";

import type { AppContext } from "@/server/context";
import {
  grants,
  passportSnapshots,
  postcards,
  sources,
  visaBundles,
  wikiNodes
} from "@/server/db/schema";

import { writeAuditLog } from "./audit";
import { createId, nowIso, parseJsonArray, parseJsonObject } from "./common";
import { createGrant } from "./grants";
import { canIncludeInPassport } from "./privacy";

type VisaNode = {
  id: string;
  title: string;
  summary: string;
  tags: string[];
  projectKey: string | null;
  privacyLevel: string;
  sourceIds: string[];
};

type VisaPostcard = {
  id: string;
  title: string;
  claim: string;
  evidenceSummary: string;
  cardType: string;
  privacyLevel: string;
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

function parseRedaction(value: string) {
  return parseJsonObject<VisaRedactionConfig>(value, {
    hideOriginUrls: false,
    hideSourcePaths: false,
    hideRawSourceIds: false
  });
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
  expiresAt?: string | null;
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
  privacyFloor: PrivacyLevel;
  expiresAt: string | null;
  allowMachineDownload: boolean;
  status: VisaBundleStatus;
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
    generatedAt: nowIso(),
    boundaries: {
      accessMode: "secret_link",
      readOnly: true,
      status: input.status,
      expiresAt: input.expiresAt,
      allowMachineDownload: input.allowMachineDownload,
      privacyFloor: input.privacyFloor
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

function buildVisaSummaryFromRow(context: AppContext, row: VisaBundleRow): VisaBundleSummary {
  const token = buildVisaToken(context, row.id);
  const allowMachineDownload = Boolean(row.allowMachineDownload);

  return {
    id: row.id,
    title: row.title,
    audienceLabel: row.audienceLabel,
    passportId: row.passportId ?? null,
    includeNodeIds: parseJsonArray<string>(row.includeNodeIdsJson),
    includePostcardIds: parseJsonArray<string>(row.includePostcardIdsJson),
    privacyFloor: row.privacyFloor as PrivacyLevel,
    redaction: parseRedaction(row.redactionJson),
    allowMachineDownload,
    expiresAt: row.expiresAt ?? null,
    status: parseVisaStatus(row),
    lastAccessedAt: row.lastAccessedAt ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    secretPath: buildSecretPath(token),
    machinePath: allowMachineDownload ? buildMachinePath(token) : null
  };
}

function buildVisaSnapshotFromRow(context: AppContext, row: VisaBundleRow): VisaBundleSnapshot {
  const summary = buildVisaSummaryFromRow(context, row);
  return {
    ...summary,
    humanMarkdown: row.humanMarkdown,
    machineManifest: JSON.parse(row.machineManifestJson) as Record<string, unknown>
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
    resolvedNodeIds: usePassportSnapshot ? parseJsonArray<string>(passport.includeNodeIdsJson) : includeNodeIds,
    resolvedPostcardIds: usePassportSnapshot ? parseJsonArray<string>(passport.includePostcardIdsJson) : includePostcardIds
  };
}

async function loadVisaContent(
  context: AppContext,
  input: VisaBundleCreateInput
) {
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
      privacyLevel: node.privacyLevel,
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
      privacyLevel: card.privacyLevel,
      relatedNodeIds: parseJsonArray<string>(card.relatedNodeIdsJson),
      relatedSourceIds: parseJsonArray<string>(card.relatedSourceIdsJson)
    }));

  if (!nodes.length && !cards.length) {
    throw new Error("No selected content remained visible after applying the visa privacy floor.");
  }

  return {
    passportTitle: fallback.passportTitle,
    nodes,
    cards
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
}

function buildDeniedObjectId(token: string) {
  const visaId = token.split(".")[0] ?? "";
  return visaId.startsWith("visa_") ? visaId : `token_${hashToken(token).slice(0, 12)}`;
}

export async function createVisaBundle(context: AppContext, input: VisaBundleCreateInput) {
  const content = await loadVisaContent(context, input);
  const sourceMap = await loadVisaSourceMap(context, content);

  const visaId = createId("visa");
  const token = buildVisaToken(context, visaId);
  const tokenHash = hashToken(token);

  const humanMarkdown = renderVisaHumanMarkdown({
    title: input.title,
    audienceLabel: input.audienceLabel,
    passportTitle: content.passportTitle,
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
    privacyFloor: input.privacyFloor,
    expiresAt: input.expiresAt ?? null,
    allowMachineDownload: input.allowMachineDownload,
    status: input.expiresAt && Date.parse(input.expiresAt) <= Date.now() ? "expired" : "active",
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
    humanMarkdown,
    machineManifestJson: JSON.stringify(machineManifest),
    includeNodeIdsJson: JSON.stringify(content.nodes.map((node) => node.id)),
    includePostcardIdsJson: JSON.stringify(content.cards.map((card) => card.id)),
    privacyFloor: input.privacyFloor,
    redactionJson: JSON.stringify(input.redaction),
    allowMachineDownload: input.allowMachineDownload ? 1 : 0,
    expiresAt: input.expiresAt ?? null,
    status: input.expiresAt && Date.parse(input.expiresAt) <= Date.now() ? "expired" : "active",
    tokenHash,
    lastAccessedAt: null,
    createdAt: timestamp,
    updatedAt: timestamp
  });

  const grantId = await createGrant(context, {
    objectType: "visa_bundle",
    objectId: visaId,
    granteeType: "secret_link",
    accessLevel: "read_only",
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

  return rows.map((row) => buildVisaSummaryFromRow(context, row));
}

export async function getVisaBundleById(context: AppContext, visaId: string) {
  const row = await context.db.query.visaBundles.findFirst({
    where: eq(visaBundles.id, visaId)
  });

  if (!row) {
    return null;
  }

  return buildVisaSnapshotFromRow(context, row);
}

export async function revokeVisaBundle(context: AppContext, visaId: string) {
  const row = await context.db.query.visaBundles.findFirst({
    where: eq(visaBundles.id, visaId)
  });

  if (!row) {
    throw new Error("Visa bundle not found.");
  }

  await context.db
    .update(visaBundles)
    .set({
      status: "revoked",
      updatedAt: nowIso()
    })
    .where(eq(visaBundles.id, visaId));

  await context.db
    .update(grants)
    .set({
      status: "revoked",
      updatedAt: nowIso()
    })
    .where(
      and(
        eq(grants.objectType, "visa_bundle"),
        eq(grants.objectId, visaId),
        eq(grants.granteeType, "secret_link")
      )
    );

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

export async function accessVisaBundleByToken(
  context: AppContext,
  token: string,
  mode: "human" | "machine"
): Promise<
  | { status: "active"; visa: VisaBundleSnapshot }
  | { status: "invalid" | "revoked" | "expired" | "machine_disabled" }
> {
  const objectId = buildDeniedObjectId(token);
  const visaId = token.split(".")[0] ?? "";
  if (!visaId || !visaId.startsWith("visa_")) {
    await writeAuditLog(context, {
      actorType: "external",
      actionType: mode === "human" ? "access_visa" : "download_visa_machine_manifest",
      objectType: "visa_bundle",
      objectId,
      result: "failed",
      notes: "invalid_token"
    });
    return { status: "invalid" };
  }

  const row = await context.db.query.visaBundles.findFirst({
    where: eq(visaBundles.id, visaId)
  });

  if (!row) {
    await writeAuditLog(context, {
      actorType: "external",
      actionType: mode === "human" ? "access_visa" : "download_visa_machine_manifest",
      objectType: "visa_bundle",
      objectId,
      result: "failed",
      notes: "invalid_token"
    });
    return { status: "invalid" };
  }

  const expectedToken = buildVisaToken(context, visaId);
  if (!safeEqual(token, expectedToken) || !safeEqual(hashToken(token), row.tokenHash)) {
    await writeAuditLog(context, {
      actorType: "external",
      actionType: mode === "human" ? "access_visa" : "download_visa_machine_manifest",
      objectType: "visa_bundle",
      objectId: row.id,
      result: "failed",
      notes: "invalid_token"
    });
    return { status: "invalid" };
  }

  const effectiveStatus = parseVisaStatus(row);
  if (effectiveStatus === "revoked") {
    await writeAuditLog(context, {
      actorType: "external",
      actionType: mode === "human" ? "access_visa" : "download_visa_machine_manifest",
      objectType: "visa_bundle",
      objectId: row.id,
      result: "failed",
      notes: "revoked"
    });
    return { status: "revoked" };
  }

  if (effectiveStatus === "expired") {
    if (row.status !== "expired") {
      await setVisaStatus(context, row.id, "expired");
    }
    await writeAuditLog(context, {
      actorType: "external",
      actionType: mode === "human" ? "access_visa" : "download_visa_machine_manifest",
      objectType: "visa_bundle",
      objectId: row.id,
      result: "failed",
      notes: "expired"
    });
    return { status: "expired" };
  }

  if (mode === "machine" && !row.allowMachineDownload) {
    await writeAuditLog(context, {
      actorType: "external",
      actionType: "download_visa_machine_manifest",
      objectType: "visa_bundle",
      objectId: row.id,
      result: "failed",
      notes: "machine_download_disabled"
    });
    return { status: "machine_disabled" };
  }

  await context.db
    .update(visaBundles)
    .set({
      lastAccessedAt: nowIso()
    })
    .where(eq(visaBundles.id, row.id));

  await writeAuditLog(context, {
    actorType: "external",
    actionType: mode === "human" ? "access_visa" : "download_visa_machine_manifest",
    objectType: "visa_bundle",
    objectId: row.id,
    result: "succeeded",
    notes: mode
  });

  const refreshed = await context.db.query.visaBundles.findFirst({
    where: eq(visaBundles.id, row.id)
  });

  return {
    status: "active",
    visa: buildVisaSnapshotFromRow(context, refreshed ?? row)
  };
}
