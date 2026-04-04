export const runtime = "nodejs";

import { NextResponse } from "next/server";

import { agentPackExportCreateSchema } from "@ai-knowledge-passport/shared";

import { getAppContext } from "@/server/context";
import { createAgentPackExportPackage } from "@/server/services/exports";

export async function POST(request: Request) {
  try {
    const payload = agentPackExportCreateSchema.parse(await request.json());
    const result = await createAgentPackExportPackage(getAppContext(), payload);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Agent pack export failed" },
      { status: 400 }
    );
  }
}
