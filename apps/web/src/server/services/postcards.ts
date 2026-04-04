import { eq, inArray } from "drizzle-orm";

import type { PostcardCreateInput, PostcardType } from "@ai-knowledge-passport/shared";

import type { AppContext } from "@/server/context";
import { postcards, sources, wikiNodes } from "@/server/db/schema";

import { writeAuditLog } from "./audit";
import { createId, nowIso, parseJsonArray } from "./common";

export async function createPostcard(context: AppContext, input: PostcardCreateInput) {
  if (!input.relatedNodeIds.length) {
    throw new Error("Postcards must reference at least one accepted node.");
  }

  const nodes = await context.db.query.wikiNodes.findMany({
    where: inArray(wikiNodes.id, input.relatedNodeIds)
  });

  if (nodes.length !== input.relatedNodeIds.length || nodes.some((node) => node.status !== "accepted")) {
    throw new Error("Postcards can only be created from accepted wiki nodes.");
  }

  const postcardId = createId("card");
  await context.db.insert(postcards).values({
    id: postcardId,
    cardType: input.cardType,
    title: input.title,
    claim: input.claim,
    evidenceSummary: input.evidenceSummary,
    userView: input.userView,
    relatedNodeIdsJson: JSON.stringify(input.relatedNodeIds),
    relatedSourceIdsJson: JSON.stringify(input.relatedSourceIds),
    privacyLevel: input.privacyLevel,
    version: 1,
    updatedAt: nowIso(),
    createdAt: nowIso()
  });

  const auditId = await writeAuditLog(context, {
    actionType: "create_postcard",
    objectType: "postcard",
    objectId: postcardId,
    result: "succeeded",
    notes: input.cardType
  });

  return {
    postcardId,
    auditId
  };
}

export async function createSuggestedPostcard(
  context: AppContext,
  input: {
    cardType: PostcardType;
    title: string;
    nodeIds: string[];
    sourceIds: string[];
  }
) {
  if (!context.provider.isConfigured) {
    throw new Error("OPENAI_API_KEY is required to auto-generate postcards.");
  }

  if (!input.nodeIds.length) {
    throw new Error("AI-generated postcards still require at least one accepted node.");
  }

  const relatedNodes = input.nodeIds.length
    ? await context.db.query.wikiNodes.findMany({ where: inArray(wikiNodes.id, input.nodeIds) })
    : [];
  const relatedSources = input.sourceIds.length
    ? await context.db.query.sources.findMany({ where: inArray(sources.id, input.sourceIds) })
    : [];

  const sourceMaterial = [
    ...relatedNodes.map((node) => `# ${node.title}\n${node.summary}\n\n${node.bodyMd}`),
    ...relatedSources.map((source) => `# ${source.title}\n${source.extractedText ?? ""}`)
  ].join("\n\n");

  const generated = await context.provider.generateCard({
    cardType: input.cardType,
    title: input.title,
    sourceMaterial
  });

  return createPostcard(context, {
    title: input.title,
    cardType: input.cardType,
    claim: generated.claim,
    evidenceSummary: generated.evidenceSummary,
    userView: generated.userView,
    relatedNodeIds: input.nodeIds,
    relatedSourceIds: input.sourceIds,
    privacyLevel: "L1_LOCAL_AI"
  });
}

export async function listPostcards(context: AppContext) {
  const cards = await context.db.query.postcards.findMany();
  return cards.map((card) => ({
    ...card,
    relatedNodeIds: parseJsonArray<string>(card.relatedNodeIdsJson),
    relatedSourceIds: parseJsonArray<string>(card.relatedSourceIdsJson)
  }));
}
