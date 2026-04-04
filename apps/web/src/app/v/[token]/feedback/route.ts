export const runtime = "nodejs";

import { NextResponse } from "next/server";

import { visaFeedbackCreateSchema } from "@ai-knowledge-passport/shared";

import { getAppContext } from "@/server/context";
import { submitVisaFeedbackByToken } from "@/server/services/visas";

function getRequestMeta(request: Request) {
  return {
    userAgent: request.headers.get("user-agent"),
    sessionHashSource: [
      request.headers.get("x-forwarded-for"),
      request.headers.get("x-real-ip"),
      request.headers.get("user-agent")
    ]
      .filter(Boolean)
      .join("|"),
    visitorLabel: null
  };
}

export async function POST(request: Request, context: { params: Promise<{ token: string }> }) {
  const params = await context.params;

  try {
    const payload = visaFeedbackCreateSchema.parse(await request.json());
    const result = await submitVisaFeedbackByToken(getAppContext(), params.token, payload, {
      ...getRequestMeta(request),
      visitorLabel: payload.visitorLabel ?? null
    });

    if (result.status === "invalid") {
      return NextResponse.json({ error: "Visa not found" }, { status: 404 });
    }
    if (result.status === "revoked") {
      return NextResponse.json({ error: "Visa has been revoked" }, { status: 403 });
    }
    if (result.status === "expired") {
      return NextResponse.json({ error: "Visa has expired" }, { status: 403 });
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Visa feedback submission failed" },
      { status: 400 }
    );
  }
}
