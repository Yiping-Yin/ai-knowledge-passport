export const runtime = "nodejs";

import { NextResponse } from "next/server";

import { avatarProfileUpdateSchema } from "@ai-knowledge-passport/shared";

import { getAppContext } from "@/server/context";
import { getAvatarProfile, updateAvatarProfile } from "@/server/services/avatars";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const avatar = await getAvatarProfile(getAppContext(), params.id);

  if (!avatar) {
    return NextResponse.json({ error: "Avatar profile not found" }, { status: 404 });
  }

  return NextResponse.json(avatar);
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  try {
    const payload = avatarProfileUpdateSchema.parse(await request.json());
    const result = await updateAvatarProfile(getAppContext(), params.id, payload);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Avatar profile update failed" },
      { status: 400 }
    );
  }
}
