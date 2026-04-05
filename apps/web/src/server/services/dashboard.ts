import { desc, eq, sql } from "drizzle-orm";

import type { AppContext } from "@/server/context";
import { backupRuns, capabilitySignals, focusCards, mistakePatterns, outputs, passportSnapshots, researchSessions, sources, wikiNodes } from "@/server/db/schema";
import { defaultWorkspaceId } from "./workspaces";

export async function getDashboardStats(context: AppContext) {
  const today = new Date().toISOString().slice(0, 10);
  const importsTodayRow = await context.db
    .select({ count: sql<number>`count(*)` })
    .from(sources)
    .where(sql`substr(${sources.importedAt}, 1, 10) = ${today}`);

  const pendingCompileRow = await context.db
    .select({ count: sql<number>`count(*)` })
    .from(sources)
    .where(eq(sources.status, "ready_for_compile"));

  const pendingReviewRow = await context.db
    .select({ count: sql<number>`count(*)` })
    .from(wikiNodes)
    .where(eq(wikiNodes.status, "pending_review"));

  const recentOutputs = await context.db.query.outputs.findMany({
    orderBy: [desc(outputs.createdAt)],
    limit: 5
  });

  const recentResearch = await context.db.query.researchSessions.findMany({
    orderBy: [desc(researchSessions.createdAt)],
    limit: 5
  });

  const latestPassport = await context.db.query.passportSnapshots.findFirst({
    orderBy: [desc(passportSnapshots.createdAt)]
  });

  const latestBackup = await context.db.query.backupRuns.findFirst({
    orderBy: [desc(backupRuns.createdAt)]
  });

  const [activeFocusCard, topSignals, pendingMistakes] = await Promise.all([
    context.db.query.focusCards.findFirst({
      where: sql`${focusCards.workspaceId} = ${defaultWorkspaceId} and ${focusCards.status} = 'active'`,
      orderBy: [desc(focusCards.updatedAt)]
    }),
    context.db.query.capabilitySignals.findMany({
      where: sql`${capabilitySignals.workspaceId} = ${defaultWorkspaceId} and ${capabilitySignals.status} = 'accepted'`,
      orderBy: [desc(capabilitySignals.updatedAt)],
      limit: 3
    }),
    context.db.query.mistakePatterns.findMany({
      where: sql`${mistakePatterns.workspaceId} = ${defaultWorkspaceId} and ${mistakePatterns.status} = 'pending_review'`,
      orderBy: [desc(mistakePatterns.updatedAt)],
      limit: 3
    })
  ]);

  return {
    importsToday: importsTodayRow[0]?.count ?? 0,
    pendingCompile: pendingCompileRow[0]?.count ?? 0,
    pendingReview: pendingReviewRow[0]?.count ?? 0,
    recentOutputs,
    recentResearch,
    latestPassport,
    latestBackup,
    activeFocusCard,
    topSignals,
    pendingMistakes
  };
}
