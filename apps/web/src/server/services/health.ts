import { desc, eq } from "drizzle-orm";

import type { AppContext } from "@/server/context";
import { backupRuns, researchSessions, sources, wikiNodes } from "@/server/db/schema";

import { parseJsonArray } from "./common";

function normalizeTitle(title: string) {
  return title.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
}

function daysBetween(isoDate: string, now = new Date()) {
  const timestamp = new Date(isoDate).getTime();
  return Math.floor((now.getTime() - timestamp) / (1000 * 60 * 60 * 24));
}

export async function getHealthReport(context: AppContext) {
  const [allSources, allNodes, allResearch, allBackups] = await Promise.all([
    context.db.query.sources.findMany({ orderBy: [desc(sources.importedAt)] }),
    context.db.query.wikiNodes.findMany({ orderBy: [desc(wikiNodes.updatedAt)] }),
    context.db.query.researchSessions.findMany({ orderBy: [desc(researchSessions.createdAt)] }),
    context.db.query.backupRuns.findMany({ orderBy: [desc(backupRuns.createdAt)] })
  ]);

  const failedSources = allSources.filter((source) => source.status === "failed" || Boolean(source.errorMessage));
  const pendingReviewNodes = allNodes.filter((node) => node.status === "pending_review");
  const traceabilityGaps = allNodes.filter((node) => parseJsonArray<string>(node.sourceIdsJson).length === 0);
  const weakResearchSessions = allResearch.filter((session) => parseJsonArray<unknown>(session.citationsJson).length < 2);

  const duplicateGroups = new Map<string, typeof allNodes>();
  for (const node of allNodes.filter((entry) => entry.status !== "rejected" && entry.status !== "merged")) {
    const key = normalizeTitle(node.title);
    if (!key) {
      continue;
    }
    const existing = duplicateGroups.get(key) ?? [];
    existing.push(node);
    duplicateGroups.set(key, existing);
  }

  const duplicateNodes = Array.from(duplicateGroups.entries())
    .filter(([, group]) => group.length > 1)
    .map(([key, group]) => ({
      normalizedTitle: key,
      nodes: group.map((node) => ({
        id: node.id,
        title: node.title,
        status: node.status,
        updatedAt: node.updatedAt
      }))
    }));

  const latestBackup = allBackups[0] ?? null;
  const backupAgeDays = latestBackup ? daysBetween(latestBackup.createdAt) : null;
  const backupStatus = !latestBackup
    ? "missing"
    : backupAgeDays !== null && backupAgeDays > 7
      ? "stale"
      : "healthy";

  const suggestions = [
    failedSources.length > 0 ? "Retry failed sources in Inbox to restore the compile pipeline." : null,
    pendingReviewNodes.length > 0 ? "Review pending nodes so they can participate in postcards, passports, and downstream research." : null,
    duplicateNodes.length > 0 ? "Merge or rewrite duplicate nodes to improve knowledge map quality." : null,
    weakResearchSessions.length > 0 ? "Revisit research sessions with weak evidence and import stronger source material." : null,
    backupStatus !== "healthy" ? "Run a fresh backup so restore points stay trustworthy." : null,
    traceabilityGaps.length > 0 ? "Attach missing source references to nodes that currently lack traceability." : null
  ].filter((entry): entry is string => Boolean(entry));

  return {
    summary: {
      failedSources: failedSources.length,
      pendingReviewNodes: pendingReviewNodes.length,
      duplicateGroups: duplicateNodes.length,
      weakResearchSessions: weakResearchSessions.length,
      traceabilityGaps: traceabilityGaps.length,
      backupStatus,
      backupAgeDays
    },
    failedSources: failedSources.slice(0, 8),
    pendingReviewNodes: pendingReviewNodes.slice(0, 8),
    duplicateNodes,
    weakResearchSessions: weakResearchSessions.slice(0, 8),
    traceabilityGaps: traceabilityGaps.slice(0, 8),
    latestBackup,
    suggestions
  };
}
