import { desc, eq, sql } from "drizzle-orm";

import type { AppContext } from "@/server/context";
import { backupRuns, outputs, passportSnapshots, researchSessions, sources, wikiNodes } from "@/server/db/schema";

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

  return {
    importsToday: importsTodayRow[0]?.count ?? 0,
    pendingCompile: pendingCompileRow[0]?.count ?? 0,
    pendingReview: pendingReviewRow[0]?.count ?? 0,
    recentOutputs,
    recentResearch,
    latestPassport,
    latestBackup
  };
}
