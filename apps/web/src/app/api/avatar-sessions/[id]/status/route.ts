export const runtime = "nodejs";

import { NextResponse } from "next/server";

import { avatarLiveSessionStatusUpdateSchema } from "@ai-knowledge-passport/shared";

import { getAppContext } from "@/server/context";
import { setAvatarLiveSessionStatus } from "@/server/services/avatar-live-sessions";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  try {
    const payload = avatarLiveSessionStatusUpdateSchema.parse(await request.json());
    const result = await setAvatarLiveSessionStatus(getAppContext(), params.id, payload.status);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Avatar live session status update failed" },
      { status: 400 }
    );
  }
}
