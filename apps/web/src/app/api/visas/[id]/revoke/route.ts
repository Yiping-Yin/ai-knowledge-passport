export const runtime = "nodejs";

import { NextResponse } from "next/server";

import { getAppContext } from "@/server/context";
import { revokeVisaBundle } from "@/server/services/visas";

export async function POST(_: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;

  try {
    const result = await revokeVisaBundle(getAppContext(), params.id);
    return NextResponse.json({ revoked: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Visa revoke failed" },
      { status: 404 }
    );
  }
}
