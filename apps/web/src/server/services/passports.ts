import { eq, inArray } from "drizzle-orm";

import type { PassportGenerateInput, PrivacyLevel } from "@ai-knowledge-passport/shared";

import type { AppContext } from "@/server/context";
import { passportSnapshots, postcards, wikiNodes } from "@/server/db/schema";

import { writeAuditLog } from "./audit";
import { createId, nowIso, parseJsonArray } from "./common";
import { getActiveFocusCard } from "./focus-cards";
import { enqueueJob, maybeRunInlineJobs } from "./jobs";
import { canIncludeInPassport } from "./privacy";
import { listCapabilitySignals, listMistakePatterns } from "./signals";
import { getWorkspace } from "./workspaces";

function buildThemeMap(tags: string[]) {
  return Array.from(new Set(tags.filter(Boolean))).sort();
}

function buildMachineManifest(input: {
  passportId: string;
  title: string;
  workspaceId: string;
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
  capabilitySignals: Array<{
    id: string;
    topic: string;
    observedPractice: string;
    currentGaps: string;
    confidence: number;
  }>;
  mistakePatterns: Array<{
    id: string;
    topic: string;
    description: string;
    fixSuggestions: string;
    recurrenceCount: number;
    privacyLevel: string;
  }>;
  focusCard: {
    id: string;
    title: string;
    goal: string;
    timeframe: string;
    priority: string;
    successCriteria: string;
    relatedTopics: string[];
  } | null;
  aiSummary: Record<string, unknown>;
}) {
  const allTags = input.nodes.flatMap((node) => node.tags);
  return {
    passportId: input.passportId,
    title: input.title,
    generatedAt: nowIso(),
    workspaceId: input.workspaceId,
    privacyFloor: input.privacyFloor,
    themeMap: buildThemeMap(allTags),
    stats: {
      nodeCount: input.nodes.length,
      postcardCount: input.postcards.length,
      capabilitySignalCount: input.capabilitySignals.length,
      mistakePatternCount: input.mistakePatterns.length,
      hasActiveFocusCard: Boolean(input.focusCard)
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
    capabilitySignals: input.capabilitySignals.map((signal) => ({
      id: signal.id,
      topic: signal.topic,
      observedPractice: signal.observedPractice,
      currentGaps: signal.currentGaps,
      confidence: signal.confidence
    })),
    mistakePatterns: input.mistakePatterns.map((mistake) => ({
      id: mistake.id,
      topic: mistake.topic,
      description: mistake.description,
      fixSuggestions: mistake.fixSuggestions,
      recurrenceCount: mistake.recurrenceCount,
      privacyLevel: mistake.privacyLevel
    })),
    focusCard: input.focusCard,
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
  const workspace = await getWorkspace(context, payload.workspaceId);
  const allNodes = payload.includeNodeIds.length
    ? await context.db.query.wikiNodes.findMany({
        where: inArray(wikiNodes.id, payload.includeNodeIds)
      })
    : await context.db.query.wikiNodes.findMany({
        where: eq(wikiNodes.workspaceId, workspace.id)
      });

  const allCards = payload.includePostcardIds.length
    ? await context.db.query.postcards.findMany({
        where: inArray(postcards.id, payload.includePostcardIds)
      })
    : await context.db.query.postcards.findMany();

  const nodes = allNodes.filter((node) =>
    node.workspaceId === workspace.id && node.status === "accepted" && canIncludeInPassport(node.privacyLevel as PrivacyLevel, payload.privacyFloor)
  );
  const cards = allCards.filter((card) =>
    card.workspaceId === workspace.id && canIncludeInPassport(card.privacyLevel as PrivacyLevel, payload.privacyFloor)
  );

  const [acceptedSignals, acceptedMistakes, activeFocusCard] = await Promise.all([
    listCapabilitySignals(context, { workspaceId: workspace.id, status: "accepted", limit: 20 }),
    listMistakePatterns(context, { workspaceId: workspace.id, status: "accepted", limit: 20 }),
    getActiveFocusCard(context, workspace.id)
  ]);

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
    capabilitySignals: acceptedSignals.map((signal) => ({
      topic: signal.topic,
      observedPractice: signal.observedPractice,
      currentGaps: signal.currentGaps,
      confidence: signal.confidence
    })),
    mistakePatterns: acceptedMistakes.map((mistake) => ({
      topic: mistake.topic,
      description: mistake.description,
      fixSuggestions: mistake.fixSuggestions,
      recurrenceCount: mistake.recurrenceCount
    })),
    focusCard: activeFocusCard
      ? {
          title: activeFocusCard.title,
          goal: activeFocusCard.goal,
          timeframe: activeFocusCard.timeframe,
          priority: activeFocusCard.priority,
          successCriteria: activeFocusCard.successCriteria
        }
      : null,
    privacyFloor: payload.privacyFloor
  });

  const passportId = createId("passport");
  const machineManifest = buildMachineManifest({
    passportId,
    title: payload.title,
    workspaceId: workspace.id,
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
    capabilitySignals: acceptedSignals.map((signal) => ({
      id: signal.id,
      topic: signal.topic,
      observedPractice: signal.observedPractice,
      currentGaps: signal.currentGaps,
      confidence: signal.confidence
    })),
    mistakePatterns: acceptedMistakes.map((mistake) => ({
      id: mistake.id,
      topic: mistake.topic,
      description: mistake.description,
      fixSuggestions: mistake.fixSuggestions,
      recurrenceCount: mistake.recurrenceCount,
      privacyLevel: mistake.privacyLevel
    })),
    focusCard: activeFocusCard
      ? {
          id: activeFocusCard.id,
          title: activeFocusCard.title,
          goal: activeFocusCard.goal,
          timeframe: activeFocusCard.timeframe,
          priority: activeFocusCard.priority,
          successCriteria: activeFocusCard.successCriteria,
          relatedTopics: activeFocusCard.relatedTopics
        }
      : null,
    aiSummary: generated.machineManifest
  });

  await context.db.insert(passportSnapshots).values({
    id: passportId,
    title: payload.title,
    workspaceId: workspace.id,
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
