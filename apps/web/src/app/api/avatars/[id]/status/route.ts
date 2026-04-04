export const runtime = "nodejs";

import { NextResponse } from "next/server";

import { avatarStatusUpdateSchema } from "@ai-knowledge-passport/shared";

import { getAppContext } from "@/server/context";
import { setAvatarStatus } from "@/server/services/avatars";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  try {
    const payload = avatarStatusUpdateSchema.parse(await request.json());
    const result = await setAvatarStatus(getAppContext(), params.id, payload.status);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Avatar status update failed" },
      { status: 400 }
    );
  }
}
