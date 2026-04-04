export const runtime = "nodejs";

import { NextResponse } from "next/server";

import { getAppContext } from "@/server/context";
import { createGrant, listGrants } from "@/server/services/grants";

export async function GET() {
  const grants = await listGrants(getAppContext(), 80);
  return NextResponse.json({ grants });
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const grantId = await createGrant(getAppContext(), {
      objectType: String(payload.objectType),
      objectId: String(payload.objectId),
      granteeType: String(payload.granteeType),
      granteeId: payload.granteeId ? String(payload.granteeId) : undefined,
      accessLevel: String(payload.accessLevel),
      expiresAt: payload.expiresAt ? String(payload.expiresAt) : undefined,
      redactionRules: payload.redactionRules && typeof payload.redactionRules === "object" ? payload.redactionRules : {},
      notes: payload.notes ? String(payload.notes) : ""
    });
    return NextResponse.json({ grantId }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Grant creation failed" },
      { status: 400 }
    );
  }
}
