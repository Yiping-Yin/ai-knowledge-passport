import { desc, eq, inArray } from "drizzle-orm";

import type { AppContext } from "@/server/context";
import { claims, sourceFragments, sources, wikiNodes } from "@/server/db/schema";
import { createId, nowIso, parseJsonArray } from "./common";

export async function createClaim(
  context: AppContext,
  input: {
    claimType: string;
    title: string;
    statement: string;
    status?: string;
    confidence?: number;
    sourceFragmentIds?: string[];
    sourceIds?: string[];
    nodeId?: string;
    projectKey?: string | null;
    tags?: string[];
  }
) {
  const claimId = createId("claim");
  await context.db.insert(claims).values({
    id: claimId,
    claimType: input.claimType,
    title: input.title,
    statement: input.statement,
    status: input.status ?? "candidate",
    confidence: input.confidence ?? 0,
    sourceFragmentIdsJson: JSON.stringify(input.sourceFragmentIds ?? []),
    sourceIdsJson: JSON.stringify(input.sourceIds ?? []),
    nodeId: input.nodeId ?? null,
    projectKey: input.projectKey ?? null,
    tagsJson: JSON.stringify(input.tags ?? []),
    createdAt: nowIso(),
    updatedAt: nowIso()
  });

  return claimId;
}

export async function listClaims(context: AppContext, limit = 80) {
  const rows = await context.db.query.claims.findMany({
    orderBy: [desc(claims.updatedAt)],
    limit
  });

  const sourceIds = Array.from(new Set(rows.flatMap((claim) => parseJsonArray<string>(claim.sourceIdsJson))));
  const nodeIds = Array.from(new Set(rows.map((claim) => claim.nodeId).filter(Boolean) as string[]));

  const [claimSources, claimNodes] = await Promise.all([
    sourceIds.length ? context.db.query.sources.findMany({ where: inArray(sources.id, sourceIds) }) : [],
    nodeIds.length ? context.db.query.wikiNodes.findMany({ where: inArray(wikiNodes.id, nodeIds) }) : []
  ]);

  return rows.map((claim) => ({
    ...claim,
    sourceFragmentIds: parseJsonArray<string>(claim.sourceFragmentIdsJson),
    sourceIds: parseJsonArray<string>(claim.sourceIdsJson),
    tags: parseJsonArray<string>(claim.tagsJson),
    sources: parseJsonArray<string>(claim.sourceIdsJson)
      .map((id) => claimSources.find((source) => source.id === id))
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
      .map((source) => ({ id: source.id, title: source.title })),
    node: claim.nodeId ? claimNodes.find((node) => node.id === claim.nodeId) ?? null : null
  }));
}

export async function getClaim(context: AppContext, claimId: string) {
  const claim = await context.db.query.claims.findFirst({
    where: eq(claims.id, claimId)
  });

  if (!claim) {
    return null;
  }

  const [claimSources, fragments, node] = await Promise.all([
    parseJsonArray<string>(claim.sourceIdsJson).length
      ? context.db.query.sources.findMany({
          where: inArray(sources.id, parseJsonArray<string>(claim.sourceIdsJson))
        })
      : [],
    parseJsonArray<string>(claim.sourceFragmentIdsJson).length
      ? context.db.query.sourceFragments.findMany({
          where: inArray(sourceFragments.id, parseJsonArray<string>(claim.sourceFragmentIdsJson))
        })
      : [],
    claim.nodeId ? context.db.query.wikiNodes.findFirst({ where: eq(wikiNodes.id, claim.nodeId) }) : null
  ]);

  return {
    ...claim,
    sourceFragmentIds: parseJsonArray<string>(claim.sourceFragmentIdsJson),
    sourceIds: parseJsonArray<string>(claim.sourceIdsJson),
    tags: parseJsonArray<string>(claim.tagsJson),
    sources: claimSources,
    fragments,
    node
  };
}
