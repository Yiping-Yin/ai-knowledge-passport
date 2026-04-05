export const runtime = "nodejs";

import { NextResponse } from "next/server";

import { objectPolicyObjectTypeSchema } from "@ai-knowledge-passport/shared";

import { getAppContext } from "@/server/context";
import { resolveObjectPolicy } from "@/server/services/policies";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const objectType = searchParams.get("objectType");
  const objectId = searchParams.get("objectId");

  if (!objectType || !objectId) {
    return NextResponse.json({ error: "objectType and objectId are required" }, { status: 400 });
  }

  try {
    const parsedObjectType = objectPolicyObjectTypeSchema.parse(objectType);
    const resolved = await resolveObjectPolicy(getAppContext(), parsedObjectType, objectId);
    return NextResponse.json({ resolved });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Policy resolution failed" },
      { status: 400 }
    );
  }
}
