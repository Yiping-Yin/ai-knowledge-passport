export const runtime = "nodejs";

import { NextResponse } from "next/server";

import { avatarProfileCreateSchema } from "@ai-knowledge-passport/shared";

import { getAppContext } from "@/server/context";
import { createAvatarProfile, listAvatarProfiles } from "@/server/services/avatars";

export async function GET() {
  const avatars = await listAvatarProfiles(getAppContext(), 80);
  return NextResponse.json({ avatars });
}

export async function POST(request: Request) {
  try {
    const payload = avatarProfileCreateSchema.parse(await request.json());
    const result = await createAvatarProfile(getAppContext(), payload);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Avatar profile creation failed" },
      { status: 400 }
    );
  }
}
