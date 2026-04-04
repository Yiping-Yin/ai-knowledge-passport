import { eq, inArray } from "drizzle-orm";

import type { PassportGenerateInput, PrivacyLevel } from "@ai-knowledge-passport/shared";

import type { AppContext } from "@/server/context";
import { passportSnapshots, postcards, wikiNodes } from "@/server/db/schema";

import { writeAuditLog } from "./audit";
import { createId, nowIso, parseJsonArray } from "./common";
import { enqueueJob, maybeRunInlineJobs } from "./jobs";
import { canIncludeInPassport } from "./privacy";

function buildThemeMap(tags: string[]) {
  return Array.from(new Set(tags.filter(Boolean))).sort();
}

function buildMachineManifest(input: {
  passportId: string;
  title: string;
  privacyFloor: PrivacyLevel;
  nodes: Array<{
    id: string;
    title: string;
    summary: string;
    tags: string[];
    privacyLevel: string;
    projectKey: string | null;
  }>;
  postcards: Array<{
    id: string;
    title: string;
    claim: string;
    cardType: string;
    privacyLevel: string;
    relatedNodeIds: string[];
  }>;
  aiSummary: Record<string, unknown>;
}) {
  const allTags = input.nodes.flatMap((node) => node.tags);
  return {
    passportId: input.passportId,
    title: input.title,
    generatedAt: nowIso(),
    privacyFloor: input.privacyFloor,
    themeMap: buildThemeMap(allTags),
    stats: {
      nodeCount: input.nodes.length,
      postcardCount: input.postcards.length
    },
    nodes: input.nodes.map((node) => ({
      id: node.id,
      title: node.title,
      summary: node.summary,
      tags: node.tags,
      privacyLevel: node.privacyLevel,
      projectKey: node.projectKey
    })),
    representativeCards: input.postcards.map((card) => ({
      id: card.id,
      title: card.title,
      claim: card.claim,
      cardType: card.cardType,
      privacyLevel: card.privacyLevel,
      relatedNodeIds: card.relatedNodeIds
    })),
    aiSummary: input.aiSummary
  };
}

export async function enqueuePassportGeneration(context: AppContext, input: PassportGenerateInput) {
  const jobId = await enqueueJob(context, {
    jobType: "generate_passport",
    payload: input
  });
  const auditId = await writeAuditLog(context, {
    actionType: "enqueue_passport",
    objectType: "passport_snapshot",
    objectId: jobId,
    result: "queued",
    notes: input.title
  });

  await maybeRunInlineJobs(context);

  return {
    jobId,
    auditId
  };
}

export async function createPassportSnapshot(context: AppContext, input: Record<string, unknown>) {
  if (!context.provider.isConfigured) {
    throw new Error("OPENAI_API_KEY is required to generate passports.");
  }

  const payload = input as PassportGenerateInput;
  const allNodes = payload.includeNodeIds.length
    ? await context.db.query.wikiNodes.findMany({
        where: inArray(wikiNodes.id, payload.includeNodeIds)
      })
    : await context.db.query.wikiNodes.findMany({
        where: eq(wikiNodes.status, "accepted")
      });

  const allCards = payload.includePostcardIds.length
    ? await context.db.query.postcards.findMany({
        where: inArray(postcards.id, payload.includePostcardIds)
      })
    : await context.db.query.postcards.findMany();

  const nodes = allNodes.filter((node) =>
    canIncludeInPassport(node.privacyLevel as PrivacyLevel, payload.privacyFloor)
  );
  const cards = allCards.filter((card) =>
    canIncludeInPassport(card.privacyLevel as PrivacyLevel, payload.privacyFloor)
  );

  const generated = await context.provider.generatePassport({
    title: payload.title,
    nodes: nodes.map((node) => ({
      title: node.title,
      summary: node.summary,
      bodyMd: node.bodyMd,
      tags: JSON.parse(node.tagsJson) as string[]
    })),
    postcards: cards.map((card) => ({
      title: card.title,
      claim: card.claim,
      userView: card.userView,
      cardType: card.cardType as never
    })),
    privacyFloor: payload.privacyFloor
  });

  const passportId = createId("passport");
  const machineManifest = buildMachineManifest({
    passportId,
    title: payload.title,
    privacyFloor: payload.privacyFloor,
    nodes: nodes.map((node) => ({
      id: node.id,
      title: node.title,
      summary: node.summary,
      tags: parseJsonArray<string>(node.tagsJson),
      privacyLevel: node.privacyLevel,
      projectKey: node.projectKey
    })),
    postcards: cards.map((card) => ({
      id: card.id,
      title: card.title,
      claim: card.claim,
      cardType: card.cardType,
      privacyLevel: card.privacyLevel,
      relatedNodeIds: parseJsonArray<string>(card.relatedNodeIdsJson)
    })),
    aiSummary: generated.machineManifest
  });

  await context.db.insert(passportSnapshots).values({
    id: passportId,
    title: payload.title,
    humanMarkdown: generated.humanMarkdown,
    machineManifestJson: JSON.stringify(machineManifest),
    includeNodeIdsJson: JSON.stringify(nodes.map((node) => node.id)),
    includePostcardIdsJson: JSON.stringify(cards.map((card) => card.id)),
    privacyFloor: payload.privacyFloor,
    createdAt: nowIso()
  });

  await writeAuditLog(context, {
    actionType: "generate_passport",
    objectType: "passport_snapshot",
    objectId: passportId,
    result: "succeeded",
    notes: payload.title
  });

  return passportId;
}

export async function listPassports(context: AppContext) {
  const snapshots = await context.db.query.passportSnapshots.findMany();
  return snapshots.map((snapshot) => ({
    ...snapshot,
    includeNodeIds: parseJsonArray<string>(snapshot.includeNodeIdsJson),
    includePostcardIds: parseJsonArray<string>(snapshot.includePostcardIdsJson),
    machineManifest: JSON.parse(snapshot.machineManifestJson) as Record<string, unknown>
  }));
}

export async function getPassportSnapshot(context: AppContext, passportId: string) {
  const snapshot = await context.db.query.passportSnapshots.findFirst({
    where: eq(passportSnapshots.id, passportId)
  });

  if (!snapshot) {
    return null;
  }

  return {
    ...snapshot,
    includeNodeIds: parseJsonArray<string>(snapshot.includeNodeIdsJson),
    includePostcardIds: parseJsonArray<string>(snapshot.includePostcardIdsJson),
    machineManifest: JSON.parse(snapshot.machineManifestJson) as Record<string, unknown>
  };
}
