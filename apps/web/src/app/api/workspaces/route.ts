export const runtime = "nodejs";

import { NextResponse } from "next/server";

import { workspaceCreateSchema } from "@ai-knowledge-passport/shared";

import { getAppContext } from "@/server/context";
import { createWorkspace, listWorkspaces } from "@/server/services/workspaces";

export async function GET() {
  const workspaces = await listWorkspaces(getAppContext());
  return NextResponse.json({ workspaces });
}

export async function POST(request: Request) {
  try {
    const payload = workspaceCreateSchema.parse(await request.json());
    const result = await createWorkspace(getAppContext(), payload);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Workspace creation failed" }, { status: 400 });
  }
}
