import { desc, eq, inArray } from "drizzle-orm";

import type { AppContext } from "@/server/context";
import { sourceFragments, sources } from "@/server/db/schema";
import { parseJsonObject } from "./common";

export async function listFragments(
  context: AppContext,
  input?: {
    sourceId?: string;
    limit?: number;
  }
) {
  const limit = input?.limit ?? 80;
  const fragments = input?.sourceId
    ? await context.db.query.sourceFragments.findMany({
        where: eq(sourceFragments.sourceId, input.sourceId),
        orderBy: [desc(sourceFragments.createdAt)],
        limit
      })
    : await context.db.query.sourceFragments.findMany({
        orderBy: [desc(sourceFragments.createdAt)],
        limit
      });

  const sourceIds = Array.from(new Set(fragments.map((fragment) => fragment.sourceId)));
  const fragmentSources = sourceIds.length
    ? await context.db.query.sources.findMany({
        where: inArray(sources.id, sourceIds)
      })
    : [];

  return fragments.map((fragment) => {
    const source = fragmentSources.find((entry) => entry.id === fragment.sourceId);
    const sourceMetadata = source ? parseJsonObject<Record<string, unknown>>(source.metadataJson, {}) : {};
    const normalization = sourceMetadata.normalization && typeof sourceMetadata.normalization === "object"
      ? (sourceMetadata.normalization as Record<string, unknown>)
      : null;

    return {
      ...fragment,
      source: source
        ? {
            id: source.id,
            title: source.title,
            type: source.type,
            privacyLevel: source.privacyLevel,
            projectKey: source.projectKey,
            parser: normalization?.parser ?? null
          }
        : null,
      anchorLabel: `fragment-${fragment.fragmentIndex + 1}`
    };
  });
}

export async function getFragment(context: AppContext, fragmentId: string) {
  const fragment = await context.db.query.sourceFragments.findFirst({
    where: eq(sourceFragments.id, fragmentId)
  });

  if (!fragment) {
    return null;
  }

  const source = await context.db.query.sources.findFirst({
    where: eq(sources.id, fragment.sourceId)
  });

  if (!source) {
    return {
      ...fragment,
      source: null,
      anchorLabel: `fragment-${fragment.fragmentIndex + 1}`
    };
  }

  const sourceMetadata = parseJsonObject<Record<string, unknown>>(source.metadataJson, {});
  const normalization = sourceMetadata.normalization && typeof sourceMetadata.normalization === "object"
    ? (sourceMetadata.normalization as Record<string, unknown>)
    : null;

  return {
    ...fragment,
    source: {
      id: source.id,
      title: source.title,
      type: source.type,
      privacyLevel: source.privacyLevel,
      projectKey: source.projectKey,
      parser: normalization?.parser ?? null,
      importedAt: source.importedAt
    },
    anchorLabel: `fragment-${fragment.fragmentIndex + 1}`
  };
}
