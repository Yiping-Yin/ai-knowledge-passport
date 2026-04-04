export const runtime = "nodejs";

import { NextResponse } from "next/server";

import { getAppContext } from "@/server/context";
import { listFragments } from "@/server/services/fragments";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sourceId = searchParams.get("sourceId") ?? undefined;
  const limit = Number(searchParams.get("limit") ?? "80");

  const fragments = await listFragments(getAppContext(), {
    sourceId,
    limit
  });

  return NextResponse.json({ fragments });
}
