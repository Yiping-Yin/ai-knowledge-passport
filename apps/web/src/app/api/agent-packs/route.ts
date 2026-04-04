export const runtime = "nodejs";

import { NextResponse } from "next/server";

import { agentPackCreateSchema } from "@ai-knowledge-passport/shared";

import { getAppContext } from "@/server/context";
import { createAgentPackSnapshot, listAgentPacks } from "@/server/services/agent-packs";

export async function GET() {
  const packs = await listAgentPacks(getAppContext(), 80);
  return NextResponse.json({ packs });
}

export async function POST(request: Request) {
  try {
    const payload = agentPackCreateSchema.parse(await request.json());
    const result = await createAgentPackSnapshot(getAppContext(), payload);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Agent pack creation failed" },
      { status: 400 }
    );
  }
}
