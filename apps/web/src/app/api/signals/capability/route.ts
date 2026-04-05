export const runtime = "nodejs";

import { NextResponse } from "next/server";

import { capabilitySignalCreateSchema } from "@ai-knowledge-passport/shared";

import { getAppContext } from "@/server/context";
import { createCapabilitySignal, listCapabilitySignals } from "@/server/services/signals";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const workspaceId = searchParams.get("workspaceId") || undefined;
  const status = searchParams.get("status") || undefined;
  const signals = await listCapabilitySignals(getAppContext(), {
    workspaceId,
    status: status as ReturnType<typeof capabilitySignalCreateSchema.parse>["status"] | undefined
  });
  return NextResponse.json({ signals });
}

export async function POST(request: Request) {
  try {
    const payload = capabilitySignalCreateSchema.parse(await request.json());
    const result = await createCapabilitySignal(getAppContext(), payload);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Capability signal creation failed" }, { status: 400 });
  }
}
