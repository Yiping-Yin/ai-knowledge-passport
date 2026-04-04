export const runtime = "nodejs";

import { NextResponse } from "next/server";

import { getAppContext } from "@/server/context";
import { getAgentPackSnapshot } from "@/server/services/agent-packs";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const pack = await getAgentPackSnapshot(getAppContext(), params.id);

  if (!pack) {
    return NextResponse.json({ error: "Agent pack not found" }, { status: 404 });
  }

  return NextResponse.json(pack);
}
