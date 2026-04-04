import type { PrivacyLevel } from "@ai-knowledge-passport/shared";

import type { AppContext } from "@/server/context";
import { postcards, sources, visaAccessLogs, visaBundles, wikiNodes } from "@/server/db/schema";

import { parseJsonArray } from "./common";

const orderedPrivacyLevels: PrivacyLevel[] = [
  "L0_SELF",
  "L1_LOCAL_AI",
  "L2_INVITED",
  "L3_PUBLIC",
  "L4_AGENT_ONLY"
];

function getRecentDateBuckets(days: number) {
  const buckets: string[] = [];
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - offset);
    buckets.push(date.toISOString().slice(0, 10));
  }
  return buckets;
}

export async function getVisualOverview(context: AppContext) {
  const [allNodes, allPostcards, allSources, allVisas, allVisaAccessLogs] = await Promise.all([
    context.db.query.wikiNodes.findMany(),
    context.db.query.postcards.findMany(),
    context.db.query.sources.findMany(),
    context.db.query.visaBundles.findMany(),
    context.db.query.visaAccessLogs.findMany()
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
    sourceCount: allSources.filter((source) => source.privacyLevel === level).length,
    visaCount: allVisas.filter((visa) => visa.privacyFloor === level).length
  }));

  const sourceMap = new Map(allSources.map((source) => [source.id, source]));
  const nodeMap = new Map(acceptedNodes.map((node) => [node.id, node]));
  const postcardMap = new Map(allPostcards.map((card) => [card.id, card]));

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
    const projectKeys = new Set(relatedNodeIds.map((id) => nodeMap.get(id)?.projectKey ?? "unscoped"));
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
    .sort((left, right) => right.nodeCount + right.postcardCount - (left.nodeCount + left.postcardCount))
    .slice(0, 12);

  const passportCirculationMap = new Map<string, { title: string; visaCount: number; accessCount: number }>();
  const postcardCirculationMap = new Map<string, { title: string; visaCount: number; accessCount: number }>();
  const projectCirculationMap = new Map<string, { visaCount: number; accessCount: number }>();

  for (const visa of allVisas) {
    const visaAccessCount = (visa.accessCount ?? 0) + (visa.machineDownloadCount ?? 0);

    if (visa.passportId) {
      const existing = passportCirculationMap.get(visa.passportId) ?? {
        title: visa.passportId,
        visaCount: 0,
        accessCount: 0
      };
      existing.visaCount += 1;
      existing.accessCount += visaAccessCount;
      passportCirculationMap.set(visa.passportId, existing);
    }

    for (const postcardId of parseJsonArray<string>(visa.includePostcardIdsJson)) {
      const postcard = postcardMap.get(postcardId);
      const existing = postcardCirculationMap.get(postcardId) ?? {
        title: postcard?.title ?? postcardId,
        visaCount: 0,
        accessCount: 0
      };
      existing.visaCount += 1;
      existing.accessCount += visaAccessCount;
      postcardCirculationMap.set(postcardId, existing);
    }

    const projectKeys = new Set<string>();
    for (const nodeId of parseJsonArray<string>(visa.includeNodeIdsJson)) {
      projectKeys.add(nodeMap.get(nodeId)?.projectKey ?? "unscoped");
    }
    for (const postcardId of parseJsonArray<string>(visa.includePostcardIdsJson)) {
      const postcard = postcardMap.get(postcardId);
      for (const relatedNodeId of parseJsonArray<string>(postcard?.relatedNodeIdsJson)) {
        projectKeys.add(nodeMap.get(relatedNodeId)?.projectKey ?? "unscoped");
      }
    }

    for (const projectKey of projectKeys) {
      const existing = projectCirculationMap.get(projectKey) ?? { visaCount: 0, accessCount: 0 };
      existing.visaCount += 1;
      existing.accessCount += visaAccessCount;
      projectCirculationMap.set(projectKey, existing);
    }
  }

  const activeVisasByPrivacy = orderedPrivacyLevels.map((level) => ({
    level,
    visaCount: allVisas.filter((visa) => visa.privacyFloor === level).length,
    activeVisaCount: allVisas.filter((visa) => visa.privacyFloor === level && visa.status === "active").length
  }));

  const topCirculatedPassports = Array.from(passportCirculationMap.entries())
    .map(([passportId, entry]) => ({
      passportId,
      title: entry.title,
      visaCount: entry.visaCount,
      accessCount: entry.accessCount
    }))
    .sort((left, right) => right.accessCount + right.visaCount - (left.accessCount + left.visaCount))
    .slice(0, 8);

  const topCirculatedPostcards = Array.from(postcardCirculationMap.entries())
    .map(([postcardId, entry]) => ({
      postcardId,
      title: entry.title,
      visaCount: entry.visaCount,
      accessCount: entry.accessCount
    }))
    .sort((left, right) => right.accessCount + right.visaCount - (left.accessCount + left.visaCount))
    .slice(0, 8);

  const projectCirculation = Array.from(projectCirculationMap.entries())
    .map(([projectKey, entry]) => ({
      projectKey,
      visaCount: entry.visaCount,
      accessCount: entry.accessCount
    }))
    .sort((left, right) => right.accessCount + right.visaCount - (left.accessCount + left.visaCount))
    .slice(0, 12);

  const recentDates = getRecentDateBuckets(7);
  const visaAccessTrendMap = new Map(
    recentDates.map((date) => [
      date,
      {
        date,
        humanViews: 0,
        machineDownloads: 0,
        feedbackSubmissions: 0
      }
    ])
  );
  for (const log of allVisaAccessLogs) {
    const date = log.createdAt.slice(0, 10);
    const bucket = visaAccessTrendMap.get(date);
    if (!bucket || log.result !== "succeeded") {
      continue;
    }
    if (log.accessType === "human_view") {
      bucket.humanViews += 1;
    }
    if (log.accessType === "machine_download") {
      bucket.machineDownloads += 1;
    }
    if (log.accessType === "feedback_submit") {
      bucket.feedbackSubmissions += 1;
    }
  }

  return {
    summary: {
      acceptedNodeCount: acceptedNodes.length,
      postcardCount: allPostcards.length,
      sourceCount: allSources.length,
      themeCount: themeClusters.length,
      visaCount: allVisas.length,
      activeVisaCount: allVisas.filter((visa) => visa.status === "active").length
    },
    themeClusters,
    privacyBoundary,
    evidenceChains,
    projectReuse,
    activeVisasByPrivacy,
    topCirculatedPassports,
    topCirculatedPostcards,
    projectCirculation,
    visaAccessTrends: recentDates.map((date) => visaAccessTrendMap.get(date)!)
  };
}
