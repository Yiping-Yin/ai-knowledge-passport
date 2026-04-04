export const runtime = "nodejs";

import { NextResponse } from "next/server";

import { researchQuerySchema } from "@ai-knowledge-passport/shared";

import { getAppContext } from "@/server/context";
import { answerResearchQuery } from "@/server/services/research";

export async function POST(request: Request) {
  try {
    const payload = researchQuerySchema.parse(await request.json());
    const result = await answerResearchQuery(getAppContext(), payload);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Research query failed" },
      { status: 400 }
    );
  }
}
