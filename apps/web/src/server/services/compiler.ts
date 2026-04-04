import { and, desc, eq, inArray, sql } from "drizzle-orm";

import type { AppContext } from "@/server/context";
import { nodeReviews, sourceFragments, sources, wikiEdges, wikiNodes } from "@/server/db/schema";
import { cosineSimilarity } from "@/server/utils/text";

import { writeAuditLog } from "./audit";
import { createClaim } from "./claims";
import { completeCompilationRun, createCompilationRun } from "./compilation-runs";
import { createId, nowIso, parseJsonArray } from "./common";
import { deleteWikiNodeFts, syncWikiNodeFts } from "./fts";

type ExistingNodeRecord = {
  id: string;
  title: string;
  summary: string;
  bodyMd: string;
  status: string;
  sourceIdsJson: string;
  tagsJson: string;
  embeddingJson: string | null;
  privacyLevel: string;
  projectKey: string | null;
  updatedAt: string;
  createdAt: string;
};

type CandidateNodeRecord = {
  nodeType: typeof wikiNodes.$inferInsert.nodeType;
  title: string;
  summary: string;
  bodyMd: string;
  tags: string[];
  embedding: number[];
};

function normalizeTitle(title: string) {
  return title.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function candidateQuality(candidate: Pick<CandidateNodeRecord, "summary" | "bodyMd" | "tags">) {
  return candidate.summary.length + candidate.bodyMd.length + candidate.tags.length * 20;
}

function isSameKnowledgeTarget(
  left: { title: string; embedding: number[] },
  right: { title: string; embedding: number[] }
) {
  if (normalizeTitle(left.title) === normalizeTitle(right.title)) {
    return true;
  }

  return Boolean(left.embedding.length && right.embedding.length && cosineSimilarity(left.embedding, right.embedding) >= 0.94);
}

function mergeCandidateContent(targetBody: string, sourceTitle: string, sourceBody: string) {
  if (targetBody.includes(sourceBody)) {
    return targetBody;
  }

  return `${targetBody}\n\n---\n\n## Merged Candidate: ${sourceTitle}\n\n${sourceBody}`.trim();
}

async function updateSourceConfirmationStatus(context: AppContext, sourceIds: string[]) {
  if (!sourceIds.length) {
    return;
  }

  await context.db
    .update(sources)
    .set({
      status: "confirmed",
      errorMessage: null
    })
    .where(inArray(sources.id, sourceIds));
}

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
    limit: 50
  });

  const runId = await createCompilationRun(context, {
    sourceId,
    providerName: context.provider.constructor.name,
    inputSummary: {
      sourceTitle: source.title,
      projectKey: source.projectKey,
      fragmentCount: fragments.length,
      acceptedNodeCount: existingNodes.length
    }
  });

  try {
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
    const candidateRecords = compileResult.nodes.map((node, index) => ({
      ...node,
      embedding: nodeEmbeddings[index] ?? []
    }));

    const dedupedCandidates: CandidateNodeRecord[] = [];
    for (const candidate of candidateRecords) {
      const existingIndex = dedupedCandidates.findIndex((entry) => isSameKnowledgeTarget(entry, candidate));
      if (existingIndex < 0) {
        dedupedCandidates.push(candidate);
        continue;
      }

      const currentCandidate = dedupedCandidates[existingIndex];
      if (currentCandidate && candidateQuality(candidate) > candidateQuality(currentCandidate)) {
        dedupedCandidates[existingIndex] = candidate;
      }
    }

    const acceptedNodeRecords = existingNodes.map((node) => ({
      ...node,
      tags: parseJsonArray<string>(node.tagsJson),
      sourceIds: parseJsonArray<string>(node.sourceIdsJson),
      embedding: parseJsonArray<number>(node.embeddingJson)
    }));

    const duplicateMatches: Array<{ candidate: CandidateNodeRecord; existingNode: ExistingNodeRecord & { tags: string[]; sourceIds: string[]; embedding: number[] } }> = [];
    const insertableCandidates: CandidateNodeRecord[] = [];

    for (const candidate of dedupedCandidates) {
      const matchedExisting = acceptedNodeRecords.find((existingNode) => isSameKnowledgeTarget(existingNode, candidate));
      if (matchedExisting) {
        duplicateMatches.push({
          candidate,
          existingNode: matchedExisting
        });
        continue;
      }
      insertableCandidates.push(candidate);
    }

    const insertedNodes: Array<{ id: string; title: string }> = [];

    for (const node of insertableCandidates) {
      const nodeId = createId("node");
      const timestamp = nowIso();
      const embedding = node.embedding;
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

    for (const duplicateMatch of duplicateMatches) {
      const nextSourceIds = uniqueStrings([
        ...duplicateMatch.existingNode.sourceIds,
        sourceId
      ]);
      const nextTags = uniqueStrings([
        ...duplicateMatch.existingNode.tags,
        ...duplicateMatch.candidate.tags
      ]);

      await context.db
        .update(wikiNodes)
        .set({
          sourceIdsJson: JSON.stringify(nextSourceIds),
          tagsJson: JSON.stringify(nextTags),
          updatedAt: nowIso()
        })
        .where(eq(wikiNodes.id, duplicateMatch.existingNode.id));

      await context.db.insert(nodeReviews).values({
        id: createId("review"),
        nodeId: duplicateMatch.existingNode.id,
        action: "merge",
        actorType: "system",
        note: `compiler attached source ${sourceId} to existing node ${duplicateMatch.existingNode.title}`,
        mergedIntoNodeId: duplicateMatch.existingNode.id,
        createdAt: nowIso()
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

    for (const insertedNode of insertedNodes) {
      const dbNode = await context.db.query.wikiNodes.findFirst({
        where: eq(wikiNodes.id, insertedNode.id)
      });
      if (!dbNode) {
        continue;
      }

      const dbEmbedding = parseJsonArray<number>(dbNode.embeddingJson);
      const strongestAccepted = acceptedNodeRecords
        .map((existingNode) => ({
          id: existingNode.id,
          similarity: cosineSimilarity(existingNode.embedding, dbEmbedding)
        }))
        .filter((entry) => entry.similarity >= 0.82)
        .sort((left, right) => right.similarity - left.similarity)
        .slice(0, 2);

      for (const relation of strongestAccepted) {
        const alreadyLinked = await context.db.query.wikiEdges.findFirst({
          where: and(
            eq(wikiEdges.fromNodeId, insertedNode.id),
            eq(wikiEdges.toNodeId, relation.id)
          )
        });

        if (alreadyLinked) {
          continue;
        }

        await context.db.insert(wikiEdges).values({
          id: createId("edge"),
          fromNodeId: insertedNode.id,
          toNodeId: relation.id,
          relationType: "related",
          weight: relation.similarity,
          createdAt: nowIso()
        });
      }
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

      await createClaim(context, {
        claimType: "summary_claim",
        title: dbNode.title,
        statement: dbNode.summary,
        confidence: strongest[0]?.score ?? 0,
        sourceFragmentIds: strongest.map((entry) => entry.fragmentId),
        sourceIds: parseJsonArray<string>(dbNode.sourceIdsJson),
        nodeId: dbNode.id,
        projectKey: dbNode.projectKey,
        tags: parseJsonArray<string>(dbNode.tagsJson)
      });

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
        status: insertedNodes.length > 0 ? "review_pending" : "confirmed"
      })
      .where(eq(sources.id, sourceId));

    if (!insertedNodes.length && duplicateMatches.length > 0) {
      await updateSourceConfirmationStatus(context, [sourceId]);
    }

    await completeCompilationRun(context, {
      runId,
      status: "succeeded",
      outputNodeIds: insertedNodes.map((node) => node.id),
      attachedNodeIds: duplicateMatches.map((match) => match.existingNode.id),
      diffSummary: {
        candidateCount: candidateRecords.length,
        insertedNodeCount: insertedNodes.length,
        attachedNodeCount: duplicateMatches.length
      }
    });

    await writeAuditLog(context, {
      actionType: "compile_source",
      objectType: "source",
      objectId: sourceId,
      result: "succeeded",
      notes: `${insertedNodes.length} new nodes, ${duplicateMatches.length} duplicate attachments`
    });

    return insertedNodes;
  } catch (error) {
    await completeCompilationRun(context, {
      runId,
      status: "failed",
      errorMessage: error instanceof Error ? error.message : "Compilation failed"
    });
    throw error;
  }
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

  if (input.action === "merge") {
    if (!input.mergedIntoNodeId) {
      throw new Error("Merge requires a target node id.");
    }
    if (input.mergedIntoNodeId === input.nodeId) {
      throw new Error("A node cannot merge into itself.");
    }

    const targetNode = await context.db.query.wikiNodes.findFirst({
      where: eq(wikiNodes.id, input.mergedIntoNodeId)
    });

    if (!targetNode || targetNode.status === "rejected" || targetNode.status === "merged") {
      throw new Error("Merge target must be an active node.");
    }

    const mergedSourceIds = uniqueStrings([
      ...parseJsonArray<string>(targetNode.sourceIdsJson),
      ...parseJsonArray<string>(node.sourceIdsJson)
    ]);
    const mergedTags = uniqueStrings([
      ...parseJsonArray<string>(targetNode.tagsJson),
      ...parseJsonArray<string>(node.tagsJson)
    ]);
    const mergedBody = mergeCandidateContent(targetNode.bodyMd, node.title, node.bodyMd);
    const mergedEmbedding = context.provider.isConfigured
      ? (await context.provider.embedText([`${targetNode.title}\n${targetNode.summary}\n${mergedBody}`]))[0] ?? null
      : parseJsonArray<number>(targetNode.embeddingJson);

    await context.db
      .update(wikiNodes)
      .set({
        sourceIdsJson: JSON.stringify(mergedSourceIds),
        tagsJson: JSON.stringify(mergedTags),
        bodyMd: mergedBody,
        embeddingJson: mergedEmbedding ? JSON.stringify(mergedEmbedding) : null,
        updatedAt: nowIso()
      })
      .where(eq(wikiNodes.id, targetNode.id));

    syncWikiNodeFts(context, {
      id: targetNode.id,
      title: targetNode.title,
      summary: targetNode.summary,
      bodyMd: mergedBody
    });

    const transferredEdges = await context.db.query.wikiEdges.findMany({
      where: sql`${wikiEdges.fromNodeId} = ${node.id} or ${wikiEdges.toNodeId} = ${node.id}`
    });

    await context.db.delete(wikiEdges).where(sql`${wikiEdges.fromNodeId} = ${node.id} or ${wikiEdges.toNodeId} = ${node.id}`);

    const seenEdgeKeys = new Set<string>();
    for (const edge of transferredEdges) {
      const nextFrom = edge.fromNodeId === node.id ? targetNode.id : edge.fromNodeId;
      const nextTo = edge.toNodeId === node.id ? targetNode.id : edge.toNodeId;
      if (nextFrom === nextTo) {
        continue;
      }
      const key = `${nextFrom}:${nextTo}:${edge.relationType}`;
      if (seenEdgeKeys.has(key)) {
        continue;
      }
      seenEdgeKeys.add(key);
      await context.db.insert(wikiEdges).values({
        id: createId("edge"),
        fromNodeId: nextFrom,
        toNodeId: nextTo,
        relationType: edge.relationType,
        weight: edge.weight,
        createdAt: nowIso()
      });
    }

    deleteWikiNodeFts(context, node.id);
  }

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
      await updateSourceConfirmationStatus(context, relatedSourceIds);
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
