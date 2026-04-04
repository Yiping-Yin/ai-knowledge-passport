export const runtime = "nodejs";

import { NextResponse } from "next/server";

import { avatarSimulationInputSchema } from "@ai-knowledge-passport/shared";

import { getAppContext } from "@/server/context";
import { simulateAvatar } from "@/server/services/avatars";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  try {
    const payload = avatarSimulationInputSchema.parse(await request.json());
    const result = await simulateAvatar(getAppContext(), params.id, payload);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Avatar simulation failed" },
      { status: 400 }
    );
  }
}
