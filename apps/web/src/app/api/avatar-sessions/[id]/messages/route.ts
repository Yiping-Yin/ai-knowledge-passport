export const runtime = "nodejs";

import { NextResponse } from "next/server";

import { avatarLiveMessageCreateSchema } from "@ai-knowledge-passport/shared";

import { getAppContext } from "@/server/context";
import { postAvatarLiveMessage } from "@/server/services/avatar-live-sessions";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  try {
    const payload = avatarLiveMessageCreateSchema.parse(await request.json());
    const result = await postAvatarLiveMessage(getAppContext(), params.id, payload);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Avatar live message failed" },
      { status: 400 }
    );
  }
}
