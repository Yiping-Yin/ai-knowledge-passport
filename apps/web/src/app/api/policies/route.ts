export const runtime = "nodejs";

import { NextResponse } from "next/server";

import { objectPolicyUpsertSchema } from "@ai-knowledge-passport/shared";

import { getAppContext } from "@/server/context";
import { listObjectPolicies, upsertObjectPolicy } from "@/server/services/policies";

export async function GET() {
  const policies = await listObjectPolicies(getAppContext(), 120);
  return NextResponse.json({ policies });
}

export async function POST(request: Request) {
  try {
    const payload = objectPolicyUpsertSchema.parse(await request.json());
    const policyId = await upsertObjectPolicy(getAppContext(), payload);
    return NextResponse.json({ policyId }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Policy save failed" },
      { status: 400 }
    );
  }
}
