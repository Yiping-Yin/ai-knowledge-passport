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
