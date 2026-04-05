import { and, desc, eq } from "drizzle-orm";

import type { FocusCard, FocusCardCreateInput } from "@ai-knowledge-passport/shared";

import type { AppContext } from "@/server/context";
import { focusCards } from "@/server/db/schema";

import { writeAuditLog } from "./audit";
import { createId, nowIso, parseJsonArray } from "./common";
import { getWorkspace } from "./workspaces";

function parseFocusCard(row: typeof focusCards.$inferSelect): FocusCard {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    title: row.title,
    goal: row.goal,
    timeframe: row.timeframe,
    priority: row.priority,
    successCriteria: row.successCriteria,
    relatedTopics: parseJsonArray<string>(row.relatedTopicsJson),
    status: row.status as FocusCard["status"],
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

export async function listFocusCards(context: AppContext, workspaceId?: string) {
  const workspace = await getWorkspace(context, workspaceId);
  const rows = await context.db.query.focusCards.findMany({
    where: eq(focusCards.workspaceId, workspace.id),
    orderBy: [desc(focusCards.updatedAt)]
  });
  return rows.map(parseFocusCard);
}

export async function getActiveFocusCard(context: AppContext, workspaceId?: string) {
  const workspace = await getWorkspace(context, workspaceId);
  const row = await context.db.query.focusCards.findFirst({
    where: and(eq(focusCards.workspaceId, workspace.id), eq(focusCards.status, "active")),
    orderBy: [desc(focusCards.updatedAt)]
  });

  return row ? parseFocusCard(row) : null;
}

export async function createFocusCard(context: AppContext, input: FocusCardCreateInput) {
  const workspace = await getWorkspace(context, input.workspaceId);
  const focusCardId = createId("focus");
  const timestamp = nowIso();

  if (input.status === "active") {
    await context.db
      .update(focusCards)
      .set({
        status: "archived",
        updatedAt: timestamp
      })
      .where(and(eq(focusCards.workspaceId, workspace.id), eq(focusCards.status, "active")));
  }

  await context.db.insert(focusCards).values({
    id: focusCardId,
    workspaceId: workspace.id,
    title: input.title,
    goal: input.goal,
    timeframe: input.timeframe,
    priority: input.priority,
    successCriteria: input.successCriteria,
    relatedTopicsJson: JSON.stringify(input.relatedTopics),
    status: input.status,
    createdAt: timestamp,
    updatedAt: timestamp
  });

  const auditId = await writeAuditLog(context, {
    actionType: "create_focus_card",
    objectType: "focus_card",
    objectId: focusCardId,
    result: "succeeded",
    notes: input.title
  });

  return {
    focusCardId,
    auditId
  };
}

export async function activateFocusCard(context: AppContext, focusCardId: string) {
  const row = await context.db.query.focusCards.findFirst({
    where: eq(focusCards.id, focusCardId)
  });

  if (!row) {
    throw new Error("Focus card not found.");
  }

  const timestamp = nowIso();
  await context.db
    .update(focusCards)
    .set({
      status: "archived",
      updatedAt: timestamp
    })
    .where(and(eq(focusCards.workspaceId, row.workspaceId), eq(focusCards.status, "active")));

  await context.db
    .update(focusCards)
    .set({
      status: "active",
      updatedAt: timestamp
    })
    .where(eq(focusCards.id, focusCardId));

  const auditId = await writeAuditLog(context, {
    actionType: "activate_focus_card",
    objectType: "focus_card",
    objectId: focusCardId,
    result: "succeeded"
  });

  return {
    focusCardId,
    auditId
  };
}
