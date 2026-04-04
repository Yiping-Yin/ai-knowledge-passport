export const runtime = "nodejs";

import { NextResponse } from "next/server";

import { visaBundleCreateSchema } from "@ai-knowledge-passport/shared";

import { getAppContext } from "@/server/context";
import { createVisaBundle, listVisaBundles } from "@/server/services/visas";

export async function GET() {
  const visas = await listVisaBundles(getAppContext(), 80);
  return NextResponse.json({ visas });
}

export async function POST(request: Request) {
  try {
    const payload = visaBundleCreateSchema.parse(await request.json());
    const result = await createVisaBundle(getAppContext(), payload);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Visa creation failed" },
      { status: 400 }
    );
  }
}
