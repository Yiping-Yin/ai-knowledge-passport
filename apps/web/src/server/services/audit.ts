import { desc, eq, sql } from "drizzle-orm";

import { auditLogs } from "@/server/db/schema";
import type { AppContext } from "@/server/context";

import { createId, nowIso } from "./common";

export async function writeAuditLog(
  context: AppContext,
  input: {
    actorType?: string;
    actionType: string;
    objectType: string;
    objectId: string;
    result: string;
    notes?: string;
  }
) {
  const auditId = createId("audit");
  await context.db.insert(auditLogs).values({
    id: auditId,
    actorType: input.actorType ?? "user",
    actionType: input.actionType,
    objectType: input.objectType,
    objectId: input.objectId,
    timestamp: nowIso(),
    result: input.result,
    notes: input.notes ?? ""
  });

  return auditId;
}

export async function listAuditLogs(
  context: AppContext,
  input?: {
    result?: string;
    objectType?: string;
    actionType?: string;
    limit?: number;
  }
) {
  const limit = input?.limit ?? 50;
  const allLogs = await context.db.query.auditLogs.findMany({
    orderBy: [desc(auditLogs.timestamp)],
    limit: limit * 3
  });

  return allLogs
    .filter((entry) => !input?.result || entry.result === input.result)
    .filter((entry) => !input?.objectType || entry.objectType === input.objectType)
    .filter((entry) => !input?.actionType || entry.actionType === input.actionType)
    .slice(0, limit);
}

export async function getAuditSummary(context: AppContext) {
  const [totalRow] = await context.db
    .select({ count: sql<number>`count(*)` })
    .from(auditLogs);

  const [failedRow] = await context.db
    .select({ count: sql<number>`count(*)` })
    .from(auditLogs)
    .where(eq(auditLogs.result, "failed"));

  const [warningRow] = await context.db
    .select({ count: sql<number>`count(*)` })
    .from(auditLogs)
    .where(eq(auditLogs.result, "warning"));

  const latest = await context.db.query.auditLogs.findFirst({
    orderBy: [desc(auditLogs.timestamp)]
  });

  return {
    total: totalRow?.count ?? 0,
    failed: failedRow?.count ?? 0,
    warning: warningRow?.count ?? 0,
    latest
  };
}
