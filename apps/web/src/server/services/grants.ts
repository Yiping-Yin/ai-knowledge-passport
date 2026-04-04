import { desc, eq } from "drizzle-orm";

import type { AppContext } from "@/server/context";
import { grants } from "@/server/db/schema";
import { createId, nowIso, parseJsonObject } from "./common";
import { writeAuditLog } from "./audit";

export async function createGrant(
  context: AppContext,
  input: {
    objectType: string;
    objectId: string;
    granteeType: string;
    granteeId?: string;
    accessLevel: string;
    expiresAt?: string;
    redactionRules?: Record<string, unknown>;
    notes?: string;
  }
) {
  const grantId = createId("grant");
  await context.db.insert(grants).values({
    id: grantId,
    objectType: input.objectType,
    objectId: input.objectId,
    granteeType: input.granteeType,
    granteeId: input.granteeId ?? null,
    accessLevel: input.accessLevel,
    expiresAt: input.expiresAt ?? null,
    status: "active",
    redactionRulesJson: JSON.stringify(input.redactionRules ?? {}),
    notes: input.notes ?? "",
    createdAt: nowIso(),
    updatedAt: nowIso()
  });

  await writeAuditLog(context, {
    actionType: "create_grant",
    objectType: "grant",
    objectId: grantId,
    result: "succeeded",
    notes: input.objectType
  });

  return grantId;
}

export async function revokeGrant(context: AppContext, grantId: string) {
  await context.db
    .update(grants)
    .set({
      status: "revoked",
      updatedAt: nowIso()
    })
    .where(eq(grants.id, grantId));

  await writeAuditLog(context, {
    actionType: "revoke_grant",
    objectType: "grant",
    objectId: grantId,
    result: "succeeded"
  });
}

export async function listGrants(context: AppContext, limit = 80) {
  const rows = await context.db.query.grants.findMany({
    orderBy: [desc(grants.updatedAt)],
    limit
  });

  return rows.map((grant) => ({
    ...grant,
    redactionRules: parseJsonObject<Record<string, unknown>>(grant.redactionRulesJson, {})
  }));
}
