export const runtime = "nodejs";

import { NextResponse } from "next/server";

import { getAppContext } from "@/server/context";
import { revokeGrant } from "@/server/services/grants";

export async function POST(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params;
    await revokeGrant(getAppContext(), params.id);
    return NextResponse.json({ revoked: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Grant revoke failed" },
      { status: 400 }
    );
  }
}
