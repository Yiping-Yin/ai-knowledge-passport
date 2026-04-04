import type { PrivacyLevel } from "@ai-knowledge-passport/shared";

import type { AppContext } from "@/server/context";
import { postcards, sources, wikiNodes } from "@/server/db/schema";

import { parseJsonArray } from "./common";

const orderedPrivacyLevels: PrivacyLevel[] = [
  "L0_SELF",
  "L1_LOCAL_AI",
  "L2_INVITED",
  "L3_PUBLIC",
  "L4_AGENT_ONLY"
];

export async function getVisualOverview(context: AppContext) {
  const [allNodes, allPostcards, allSources] = await Promise.all([
    context.db.query.wikiNodes.findMany(),
    context.db.query.postcards.findMany(),
    context.db.query.sources.findMany()
  ]);

  const acceptedNodes = allNodes.filter((node) => node.status === "accepted");

  const themeMap = new Map<string, Array<{ id: string; title: string }>>();
  for (const node of acceptedNodes) {
    const tags = parseJsonArray<string>(node.tagsJson);
    for (const tag of tags) {
      const existing = themeMap.get(tag) ?? [];
      existing.push({ id: node.id, title: node.title });
      themeMap.set(tag, existing);
    }
  }

  const themeClusters = Array.from(themeMap.entries())
    .map(([tag, nodes]) => ({
      tag,
      count: nodes.length,
      nodes: nodes.slice(0, 5)
    }))
    .sort((left, right) => right.count - left.count)
    .slice(0, 12);

  const privacyBoundary = orderedPrivacyLevels.map((level) => ({
    level,
    nodeCount: acceptedNodes.filter((node) => node.privacyLevel === level).length,
    postcardCount: allPostcards.filter((card) => card.privacyLevel === level).length,
    sourceCount: allSources.filter((source) => source.privacyLevel === level).length
  }));

  const sourceMap = new Map(allSources.map((source) => [source.id, source]));
  const nodeMap = new Map(acceptedNodes.map((node) => [node.id, node]));

  const evidenceChains = allPostcards
    .map((card) => {
      const relatedNodeIds = parseJsonArray<string>(card.relatedNodeIdsJson);
      const relatedSourceIds = new Set(parseJsonArray<string>(card.relatedSourceIdsJson));

      const relatedNodes = relatedNodeIds
        .map((id) => nodeMap.get(id))
        .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

      for (const node of relatedNodes) {
        for (const sourceId of parseJsonArray<string>(node.sourceIdsJson)) {
          relatedSourceIds.add(sourceId);
        }
      }

      return {
        postcardId: card.id,
        title: card.title,
        cardType: card.cardType,
        nodeCount: relatedNodes.length,
        sourceCount: relatedSourceIds.size,
        nodes: relatedNodes.slice(0, 4).map((node) => ({
          id: node.id,
          title: node.title
        })),
        sources: Array.from(relatedSourceIds)
          .map((id) => sourceMap.get(id))
          .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
          .slice(0, 4)
          .map((source) => ({
            id: source.id,
            title: source.title
          }))
      };
    })
    .sort((left, right) => right.nodeCount + right.sourceCount - (left.nodeCount + left.sourceCount))
    .slice(0, 8);

  const projectMap = new Map<string, { nodeCount: number; postcardCount: number }>();
  for (const node of acceptedNodes) {
    const projectKey = node.projectKey ?? "unscoped";
    const existing = projectMap.get(projectKey) ?? { nodeCount: 0, postcardCount: 0 };
    existing.nodeCount += 1;
    projectMap.set(projectKey, existing);
  }
  for (const card of allPostcards) {
    const relatedNodeIds = parseJsonArray<string>(card.relatedNodeIdsJson);
    const projectKeys = new Set(
      relatedNodeIds
        .map((id) => nodeMap.get(id)?.projectKey ?? "unscoped")
    );
    for (const projectKey of projectKeys) {
      const existing = projectMap.get(projectKey) ?? { nodeCount: 0, postcardCount: 0 };
      existing.postcardCount += 1;
      projectMap.set(projectKey, existing);
    }
  }

  const projectReuse = Array.from(projectMap.entries())
    .map(([projectKey, counts]) => ({
      projectKey,
      nodeCount: counts.nodeCount,
      postcardCount: counts.postcardCount
    }))
    .sort((left, right) => (right.nodeCount + right.postcardCount) - (left.nodeCount + left.postcardCount))
    .slice(0, 12);

  return {
    summary: {
      acceptedNodeCount: acceptedNodes.length,
      postcardCount: allPostcards.length,
      sourceCount: allSources.length,
      themeCount: themeClusters.length
    },
    themeClusters,
    privacyBoundary,
    evidenceChains,
    projectReuse
  };
}
