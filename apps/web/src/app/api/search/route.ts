export const runtime = "nodejs";

import { NextResponse } from "next/server";

import { getAppContext } from "@/server/context";
import { searchKnowledge } from "@/server/services/search";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");
  if (!q) {
    return NextResponse.json({ error: "q is required" }, { status: 400 });
  }

  const result = await searchKnowledge(getAppContext(), {
    q,
    limit: Number(searchParams.get("limit") ?? "8"),
    workspaceId: searchParams.get("workspaceId") || undefined
  });

  return NextResponse.json(result);
}
