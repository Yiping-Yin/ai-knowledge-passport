export const runtime = "nodejs";

import { NextResponse } from "next/server";

import { getAppContext } from "@/server/context";
import { getAvatarLiveSession } from "@/server/services/avatar-live-sessions";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const session = await getAvatarLiveSession(getAppContext(), params.id);

  if (!session) {
    return NextResponse.json({ error: "Avatar live session not found" }, { status: 404 });
  }

  return NextResponse.json(session);
}
