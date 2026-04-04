import { and, desc, eq, inArray, sql } from "drizzle-orm";

import type { AppContext } from "@/server/context";
import { nodeReviews, sourceFragments, sources, wikiEdges, wikiNodes } from "@/server/db/schema";
import { cosineSimilarity } from "@/server/utils/text";

import { writeAuditLog } from "./audit";
import { createId, nowIso, parseJsonArray } from "./common";
import { syncWikiNodeFts } from "./fts";

export async function compileSource(context: AppContext, sourceId: string) {
  if (!context.provider.isConfigured) {
    throw new Error("OPENAI_API_KEY is required to compile sources.");
  }

  const source = await context.db.query.sources.findFirst({
    where: eq(sources.id, sourceId)
  });

  if (!source || !source.extractedText) {
    throw new Error(`Source ${sourceId} is not ready for compile.`);
  }

  const fragments = await context.db.query.sourceFragments.findMany({
    where: eq(sourceFragments.sourceId, sourceId)
  });

  const existingNodes = await context.db.query.wikiNodes.findMany({
    where: eq(wikiNodes.status, "accepted"),
    orderBy: [desc(wikiNodes.updatedAt)],
    limit: 20
  });

  const compileResult = await context.provider.summarizeAndLink({
    title: source.title,
    text: source.extractedText,
    fragments: fragments.map((fragment) => ({ id: fragment.id, text: fragment.text })),
    existingNodes: existingNodes.map((node) => ({
      id: node.id,
      title: node.title,
      summary: node.summary,
      tags: parseJsonArray<string>(node.tagsJson)
    })),
    projectKey: source.projectKey,
    tags: parseJsonArray<string>(source.tagsJson),
    privacyLevel: source.privacyLevel as never,
    sourceId
  });

  const candidateTexts = compileResult.nodes.map((node) => `${node.title}\n${node.summary}\n${node.bodyMd}`);
  const nodeEmbeddings = candidateTexts.length > 0 ? await context.provider.embedText(candidateTexts) : [];

  const insertedNodes: Array<{ id: string; title: string }> = [];

  for (const [index, node] of compileResult.nodes.entries()) {
    const nodeId = createId("node");
    const timestamp = nowIso();
    const embedding = nodeEmbeddings[index];
    await context.db.insert(wikiNodes).values({
      id: nodeId,
      nodeType: node.nodeType,
      title: node.title,
      summary: node.summary,
      bodyMd: node.bodyMd,
      status: "pending_review",
      sourceIdsJson: JSON.stringify([sourceId]),
      tagsJson: JSON.stringify(node.tags),
      projectKey: source.projectKey ?? null,
      privacyLevel: source.privacyLevel,
      embeddingJson: embedding ? JSON.stringify(embedding) : null,
      updatedAt: timestamp,
      createdAt: timestamp
    });

    syncWikiNodeFts(context, {
      id: nodeId,
      title: node.title,
      summary: node.summary,
      bodyMd: node.bodyMd
    });

    insertedNodes.push({
      id: nodeId,
      title: node.title
    });
  }

  for (const hint of compileResult.relationHints) {
    const sourceNode = insertedNodes.find((entry) => entry.title === hint.title);
    if (!sourceNode) {
      continue;
    }

    await context.db.insert(wikiEdges).values({
      id: createId("edge"),
      fromNodeId: sourceNode.id,
      toNodeId: hint.relatedNodeId,
      relationType: hint.relationType,
      weight: hint.weight,
      createdAt: nowIso()
    });
  }

  const fragmentEmbeddings = fragments
    .map((fragment) => ({
      id: fragment.id,
      embedding: parseJsonArray<number>(fragment.embeddingJson),
      text: fragment.text
    }))
    .filter((fragment) => fragment.embedding.length > 0);

  for (const node of insertedNodes) {
    const dbNode = await context.db.query.wikiNodes.findFirst({
      where: eq(wikiNodes.id, node.id)
    });

    if (!dbNode) {
      continue;
    }

    const embedding = parseJsonArray<number>(dbNode.embeddingJson);
    if (!embedding.length) {
      continue;
    }

    const strongest = fragmentEmbeddings
      .map((fragment) => ({
        fragmentId: fragment.id,
        score: cosineSimilarity(fragment.embedding, embedding)
      }))
      .sort((left, right) => right.score - left.score)
      .slice(0, 2);

    for (const relation of strongest) {
      await context.db.insert(nodeReviews).values({
        id: createId("review"),
        nodeId: node.id,
        action: "rewrite",
        actorType: "system",
        note: `candidate evidence ${relation.fragmentId} score=${relation.score.toFixed(3)}`,
        mergedIntoNodeId: null,
        createdAt: nowIso()
      });
    }
  }

  await context.db
    .update(sources)
    .set({
      status: "review_pending"
    })
    .where(eq(sources.id, sourceId));

  await writeAuditLog(context, {
    actionType: "compile_source",
    objectType: "source",
    objectId: sourceId,
    result: "succeeded",
    notes: `${insertedNodes.length} nodes`
  });

  return insertedNodes;
}

export async function listKnowledgeNodes(context: AppContext, status: "accepted" | "pending_review" = "accepted") {
  return context.db.query.wikiNodes.findMany({
    where: eq(wikiNodes.status, status),
    orderBy: [desc(wikiNodes.updatedAt)]
  });
}

export async function getKnowledgeNode(context: AppContext, nodeId: string) {
  const node = await context.db.query.wikiNodes.findFirst({
    where: eq(wikiNodes.id, nodeId)
  });
  const edges = await context.db.query.wikiEdges.findMany({
    where: sql`${wikiEdges.fromNodeId} = ${nodeId} or ${wikiEdges.toNodeId} = ${nodeId}`
  });
  return { node, edges };
}

export async function applyReviewAction(
  context: AppContext,
  input: {
    nodeId: string;
    action: "accept" | "reject" | "rewrite" | "merge";
    note?: string;
    mergedIntoNodeId?: string;
  }
) {
  const node = await context.db.query.wikiNodes.findFirst({
    where: eq(wikiNodes.id, input.nodeId)
  });

  if (!node) {
    throw new Error(`Node ${input.nodeId} not found`);
  }

  const nextStatus = input.action === "accept"
    ? "accepted"
    : input.action === "merge"
      ? "merged"
      : input.action === "reject"
        ? "rejected"
        : "pending_review";

  await context.db.insert(nodeReviews).values({
    id: createId("review"),
    nodeId: input.nodeId,
    action: input.action,
    actorType: "user",
    note: input.note ?? "",
    mergedIntoNodeId: input.mergedIntoNodeId ?? null,
    createdAt: nowIso()
  });

  await context.db
    .update(wikiNodes)
    .set({
      status: nextStatus,
      updatedAt: nowIso(),
      sourceIdsJson: node.sourceIdsJson
    })
    .where(eq(wikiNodes.id, input.nodeId));

  const relatedSourceIds = parseJsonArray<string>(node.sourceIdsJson);
  if (relatedSourceIds.length) {
    const acceptedCount = await context.db
      .select({ count: sql<number>`count(*)` })
      .from(wikiNodes)
      .where(and(eq(wikiNodes.status, "accepted"), sql`${wikiNodes.sourceIdsJson} like ${`%${relatedSourceIds[0]}%`}`));

    if ((acceptedCount[0]?.count ?? 0) > 0) {
      await context.db
        .update(sources)
        .set({
          status: "confirmed"
        })
        .where(inArray(sources.id, relatedSourceIds));
    }
  }

  const auditId = await writeAuditLog(context, {
    actionType: `review_${input.action}`,
    objectType: "wiki_node",
    objectId: input.nodeId,
    result: "succeeded",
    notes: input.note ?? ""
  });

  return auditId;
}
