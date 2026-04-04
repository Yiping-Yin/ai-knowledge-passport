import { desc, eq, inArray } from "drizzle-orm";

import type { AppContext } from "@/server/context";
import { sourceFragments, wikiNodes } from "@/server/db/schema";
import { cosineSimilarity } from "@/server/utils/text";

import { parseJsonArray } from "./common";

function tokenizeFtsQuery(query: string) {
  return query
    .toLowerCase()
    .split(/[\s,.;:!?()[\]{}"'"'"'，。；：！？、]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
}

function buildFtsQuery(query: string) {
  const tokens = tokenizeFtsQuery(query);
  if (!tokens.length) {
    return "";
  }

  return tokens.map((token) => `"${token.replace(/"/g, '""')}"`).join(" OR ");
}

export async function searchKnowledge(
  context: AppContext,
  query: {
    q: string;
    limit?: number;
    projectKey?: string;
  }
) {
  const limit = query.limit ?? 8;
  const ftsQuery = buildFtsQuery(query.q);
  const fragmentRows = context.sqlite
    .prepare(
      `
      select fragment_id as id, source_id as sourceId, content as text
      from source_fragments_fts
      where source_fragments_fts match ?
      limit ?
    `
    );

  const nodeRows = context.sqlite
    .prepare(
      `
      select node_id as id, title, summary, body
      from wiki_nodes_fts
      where wiki_nodes_fts match ?
      limit ?
    `
    );

  const fragmentRowResults = ftsQuery
    ? (fragmentRows.all(ftsQuery, limit * 2) as Array<{ id: string; sourceId: string; text: string }>)
    : [];

  const nodeRowResults = ftsQuery
    ? (nodeRows.all(ftsQuery, limit * 2) as Array<{ id: string; title: string; summary: string; body: string }>)
    : [];

  const fallbackFragments = fragmentRowResults.length === 0
    ? await context.db.query.sourceFragments.findMany({
        orderBy: [desc(sourceFragments.createdAt)],
        limit: limit * 2
      })
    : [];

  const fallbackNodes = nodeRowResults.length === 0
    ? await context.db.query.wikiNodes.findMany({
        where: eq(wikiNodes.status, "accepted"),
        orderBy: [desc(wikiNodes.updatedAt)],
        limit: limit * 2
      })
    : [];

  if (!context.provider.isConfigured) {
    return {
      fragments: (fragmentRowResults.length
        ? fragmentRowResults
        : fallbackFragments.map((entry) => ({
            id: entry.id,
            sourceId: entry.sourceId,
            text: entry.text
          }))).slice(0, limit).map((entry) => ({
        ...entry,
        score: 0.5
      })),
      nodes: (nodeRowResults.length
        ? nodeRowResults
        : fallbackNodes.map((entry) => ({
            id: entry.id,
            title: entry.title,
            summary: entry.summary,
            body: entry.bodyMd
          }))).slice(0, limit).map((entry) => ({
        ...entry,
        score: 0.5
      }))
    };
  }

  const [queryEmbedding = []] = await context.provider.embedText([query.q]);

  const fragmentDetails = await context.db.query.sourceFragments.findMany({
    where: inArray(
      sourceFragments.id,
      (fragmentRowResults.length ? fragmentRowResults : fallbackFragments).map((row) => row.id)
    )
  });

  const nodeDetails = await context.db.query.wikiNodes.findMany({
    where: inArray(
      wikiNodes.id,
      (nodeRowResults.length ? nodeRowResults : fallbackNodes).map((row) => row.id)
    ),
    orderBy: [desc(wikiNodes.updatedAt)]
  });

  return {
    fragments: fragmentDetails
      .map((fragment) => ({
        id: fragment.id,
        sourceId: fragment.sourceId,
        text: fragment.text,
        score: cosineSimilarity(parseJsonArray<number>(fragment.embeddingJson), queryEmbedding)
      }))
      .sort((left, right) => right.score - left.score)
      .slice(0, limit),
    nodes: nodeDetails
      .filter((node) => node.status === "accepted")
      .map((node) => ({
        id: node.id,
        title: node.title,
        summary: node.summary,
        body: node.bodyMd,
        score: cosineSimilarity(parseJsonArray<number>(node.embeddingJson), queryEmbedding)
      }))
      .sort((left, right) => right.score - left.score)
      .slice(0, limit)
  };
}
