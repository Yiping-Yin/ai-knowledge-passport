export const runtime = "nodejs";

import { NextResponse } from "next/server";

import { mistakePatternCreateSchema } from "@ai-knowledge-passport/shared";

import { getAppContext } from "@/server/context";
import { createMistakePattern, listMistakePatterns } from "@/server/services/signals";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const workspaceId = searchParams.get("workspaceId") || undefined;
  const status = searchParams.get("status") || undefined;
  const mistakes = await listMistakePatterns(getAppContext(), {
    workspaceId,
    status: status as ReturnType<typeof mistakePatternCreateSchema.parse>["status"] | undefined
  });
  return NextResponse.json({ mistakes });
}

export async function POST(request: Request) {
  try {
    const payload = mistakePatternCreateSchema.parse(await request.json());
    const result = await createMistakePattern(getAppContext(), payload);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Mistake pattern creation failed" }, { status: 400 });
  }
}
