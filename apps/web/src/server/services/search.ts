import { desc, eq, inArray } from "drizzle-orm";

import type { AppContext } from "@/server/context";
import { sourceFragments, sources, wikiNodes } from "@/server/db/schema";
import { cosineSimilarity } from "@/server/utils/text";

import { parseJsonArray } from "./common";

function tokenizeQuery(query: string) {
  return query
    .toLowerCase()
    .split(/[\s,.;:!?()[\]{}"'，。；：！？、]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
}

function buildFtsQuery(query: string) {
  const tokens = tokenizeQuery(query);
  if (!tokens.length) {
    return "";
  }

  return tokens.map((token) => `"${token.replace(/"/g, '""')}"`).join(" OR ");
}

function lexicalScore(text: string, queryTokens: string[]) {
  if (!queryTokens.length) {
    return 0;
  }

  const normalized = text.toLowerCase();
  const hits = queryTokens.filter((token) => normalized.includes(token)).length;
  return hits / queryTokens.length;
}

type FragmentSearchHit = {
  id: string;
  sourceId: string;
  sourceTitle: string;
  text: string;
  score: number;
  lexicalScore: number;
  semanticScore: number;
  retrievalKind: "fts" | "fallback";
};

type NodeSearchHit = {
  id: string;
  title: string;
  summary: string;
  body: string;
  projectKey?: string | null;
  score: number;
  lexicalScore: number;
  semanticScore: number;
  retrievalKind: "fts" | "fallback";
};

export type SearchKnowledgeResult = {
  fragments: FragmentSearchHit[];
  nodes: NodeSearchHit[];
};

export async function searchKnowledge(
  context: AppContext,
  query: {
    q: string;
    limit?: number;
    projectKey?: string;
    workspaceId?: string;
  }
): Promise<SearchKnowledgeResult> {
  const limit = query.limit ?? 8;
  const queryTokens = tokenizeQuery(query.q);
  const ftsQuery = buildFtsQuery(query.q);

  const fragmentStatement = context.sqlite.prepare(`
    select fragment_id as id, source_id as sourceId, content as text
    from source_fragments_fts
    where source_fragments_fts match ?
    limit ?
  `);

  const nodeStatement = context.sqlite.prepare(`
    select node_id as id, title, summary, body
    from wiki_nodes_fts
    where wiki_nodes_fts match ?
    limit ?
  `);

  const fragmentRows = ftsQuery
    ? (fragmentStatement.all(ftsQuery, limit * 2) as Array<{ id: string; sourceId: string; text: string }>)
    : [];

  const nodeRows = ftsQuery
    ? (nodeStatement.all(ftsQuery, limit * 2) as Array<{ id: string; title: string; summary: string; body: string }>)
    : [];

  const fallbackFragments = fragmentRows.length === 0
    ? await context.db.query.sourceFragments.findMany({
        orderBy: [desc(sourceFragments.createdAt)],
        limit: limit * 2
      })
    : [];

  const fallbackNodes = nodeRows.length === 0
    ? await context.db.query.wikiNodes.findMany({
        where: eq(wikiNodes.status, "accepted"),
        orderBy: [desc(wikiNodes.updatedAt)],
        limit: limit * 2
      })
    : [];

  const [queryEmbedding = []] = context.provider.isConfigured
    ? await context.provider.embedText([query.q])
    : [[]];

  const fragmentDetails = await context.db.query.sourceFragments.findMany({
    where: inArray(
      sourceFragments.id,
      (fragmentRows.length ? fragmentRows : fallbackFragments).map((row) => row.id)
    )
  });
  const fragmentSourceIds = Array.from(new Set(fragmentDetails.map((fragment) => fragment.sourceId)));
  const fragmentSources = fragmentSourceIds.length
    ? await context.db.query.sources.findMany({
        where: inArray(sources.id, fragmentSourceIds)
      })
    : [];

  const nodeDetails = await context.db.query.wikiNodes.findMany({
    where: inArray(
      wikiNodes.id,
      (nodeRows.length ? nodeRows : fallbackNodes).map((row) => row.id)
    ),
    orderBy: [desc(wikiNodes.updatedAt)]
  });

  const fragmentHits: FragmentSearchHit[] = fragmentDetails
    .map((fragment) => {
      const source = fragmentSources.find((entry) => entry.id === fragment.sourceId);
      if (!source) {
        return null;
      }

      if (query.projectKey && source.projectKey !== query.projectKey) {
        return null;
      }

      if (query.workspaceId && source.workspaceId !== query.workspaceId) {
        return null;
      }

      const semantic = context.provider.isConfigured
        ? cosineSimilarity(parseJsonArray<number>(fragment.embeddingJson), queryEmbedding)
        : 0;
      const lexical = lexicalScore(fragment.text, queryTokens);

      return {
        id: fragment.id,
        sourceId: fragment.sourceId,
        sourceTitle: source.title,
        text: fragment.text,
        lexicalScore: lexical,
        semanticScore: semantic,
        score: context.provider.isConfigured ? (semantic * 0.65) + (lexical * 0.35) : lexical,
        retrievalKind: (fragmentRows.some((row) => row.id === fragment.id) ? "fts" : "fallback") as "fts" | "fallback"
      };
    })
    .filter((entry): entry is FragmentSearchHit => Boolean(entry))
    .sort((left, right) => right.score - left.score)
    .slice(0, limit);

  const nodeHits: NodeSearchHit[] = nodeDetails
    .filter((node) => node.status === "accepted")
    .filter((node) => !query.projectKey || node.projectKey === query.projectKey)
    .filter((node) => !query.workspaceId || node.workspaceId === query.workspaceId)
    .map((node) => {
      const semantic = context.provider.isConfigured
        ? cosineSimilarity(parseJsonArray<number>(node.embeddingJson), queryEmbedding)
        : 0;
      const lexical = lexicalScore(`${node.title}\n${node.summary}\n${node.bodyMd}`, queryTokens);

      return {
        id: node.id,
        title: node.title,
        summary: node.summary,
        body: node.bodyMd,
        projectKey: node.projectKey,
        lexicalScore: lexical,
        semanticScore: semantic,
        score: context.provider.isConfigured ? (semantic * 0.65) + (lexical * 0.35) : lexical,
        retrievalKind: (nodeRows.some((row) => row.id === node.id) ? "fts" : "fallback") as "fts" | "fallback"
      };
    })
    .sort((left, right) => right.score - left.score)
    .slice(0, limit);

  return {
    fragments: fragmentHits,
    nodes: nodeHits
  };
}
