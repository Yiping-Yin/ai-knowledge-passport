export const runtime = "nodejs";

import { NextResponse } from "next/server";

import { outputCreateSchema } from "@ai-knowledge-passport/shared";

import { getAppContext } from "@/server/context";
import { createOutput } from "@/server/services/outputs";

export async function POST(request: Request) {
  try {
    const payload = outputCreateSchema.parse(await request.json());
    const result = await createOutput(getAppContext(), payload);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Output create failed" },
      { status: 400 }
    );
  }
}
