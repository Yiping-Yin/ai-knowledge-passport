export const runtime = "nodejs";

import { NextResponse } from "next/server";

import { passportGenerateSchema } from "@ai-knowledge-passport/shared";

import { getAppContext } from "@/server/context";
import { enqueuePassportGeneration } from "@/server/services/passports";

export async function POST(request: Request) {
  try {
    const payload = passportGenerateSchema.parse(await request.json());
    const result = await enqueuePassportGeneration(getAppContext(), payload);
    return NextResponse.json(result, { status: 202 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Passport generation failed" },
      { status: 400 }
    );
  }
}
