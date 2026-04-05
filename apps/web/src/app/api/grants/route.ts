export const runtime = "nodejs";

import { NextResponse } from "next/server";

import { grantCreateSchema } from "@ai-knowledge-passport/shared";

import { getAppContext } from "@/server/context";
import { createGrant, listGrants } from "@/server/services/grants";

export async function GET() {
  const grants = await listGrants(getAppContext(), 80);
  return NextResponse.json({ grants });
}

export async function POST(request: Request) {
  try {
    const payload = grantCreateSchema.parse(await request.json());
    const grantId = await createGrant(getAppContext(), payload);
    return NextResponse.json({ grantId }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Grant creation failed" },
      { status: 400 }
    );
  }
}
