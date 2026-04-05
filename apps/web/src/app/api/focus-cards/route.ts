export const runtime = "nodejs";

import { NextResponse } from "next/server";

import { focusCardCreateSchema } from "@ai-knowledge-passport/shared";

import { getAppContext } from "@/server/context";
import { createFocusCard, listFocusCards } from "@/server/services/focus-cards";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const workspaceId = searchParams.get("workspaceId") || undefined;
  const focusCards = await listFocusCards(getAppContext(), workspaceId);
  return NextResponse.json({ focusCards });
}

export async function POST(request: Request) {
  try {
    const payload = focusCardCreateSchema.parse(await request.json());
    const result = await createFocusCard(getAppContext(), payload);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Focus card creation failed" }, { status: 400 });
  }
}
