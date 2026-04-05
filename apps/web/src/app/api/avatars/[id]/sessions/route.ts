export const runtime = "nodejs";

import { NextResponse } from "next/server";

import { avatarLiveSessionCreateSchema } from "@ai-knowledge-passport/shared";

import { getAppContext } from "@/server/context";
import { createAvatarLiveSession, listAvatarLiveSessions } from "@/server/services/avatar-live-sessions";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const sessions = await listAvatarLiveSessions(getAppContext(), params.id, 80);
  return NextResponse.json({ sessions });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  try {
    const payload = avatarLiveSessionCreateSchema.parse(await request.json());
    const result = await createAvatarLiveSession(getAppContext(), params.id, payload);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Avatar live session creation failed" },
      { status: 400 }
    );
  }
}
