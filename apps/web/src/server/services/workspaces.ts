import { asc, eq } from "drizzle-orm";

import type { WorkspaceCreateInput, WorkspaceRecord } from "@ai-knowledge-passport/shared";

import type { AppContext } from "@/server/context";
import { workspaces } from "@/server/db/schema";

import { writeAuditLog } from "./audit";
import { createId, nowIso } from "./common";

export const defaultWorkspaceId = "ws_personal";

function parseWorkspace(row: typeof workspaces.$inferSelect): WorkspaceRecord {
  return {
    id: row.id,
    title: row.title,
    workspaceType: row.workspaceType as WorkspaceRecord["workspaceType"],
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

export async function ensureDefaultWorkspace(context: AppContext) {
  const existing = await context.db.query.workspaces.findFirst({
    where: eq(workspaces.id, defaultWorkspaceId)
  });

  if (existing) {
    return parseWorkspace(existing);
  }

  const timestamp = nowIso();
  await context.db.insert(workspaces).values({
    id: defaultWorkspaceId,
    title: "Personal",
    workspaceType: "personal",
    createdAt: timestamp,
    updatedAt: timestamp
  });

  return {
    id: defaultWorkspaceId,
    title: "Personal",
    workspaceType: "personal" as const,
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

export async function listWorkspaces(context: AppContext) {
  await ensureDefaultWorkspace(context);
  const rows = await context.db.query.workspaces.findMany({
    orderBy: [asc(workspaces.createdAt)]
  });
  return rows.map(parseWorkspace);
}

export async function createWorkspace(context: AppContext, input: WorkspaceCreateInput) {
  const workspaceId = createId("ws");
  const timestamp = nowIso();
  await context.db.insert(workspaces).values({
    id: workspaceId,
    title: input.title,
    workspaceType: input.workspaceType,
    createdAt: timestamp,
    updatedAt: timestamp
  });

  const auditId = await writeAuditLog(context, {
    actionType: "create_workspace",
    objectType: "workspace",
    objectId: workspaceId,
    result: "succeeded",
    notes: input.title
  });

  return {
    workspaceId,
    auditId
  };
}

export async function getWorkspace(context: AppContext, workspaceId?: string | null) {
  if (!workspaceId) {
    return ensureDefaultWorkspace(context);
  }

  const row = await context.db.query.workspaces.findFirst({
    where: eq(workspaces.id, workspaceId)
  });

  if (!row) {
    throw new Error("Workspace not found.");
  }

  return parseWorkspace(row);
}
