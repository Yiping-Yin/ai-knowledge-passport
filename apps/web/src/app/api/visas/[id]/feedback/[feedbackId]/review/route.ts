export const runtime = "nodejs";

import { NextResponse } from "next/server";

import { visaFeedbackReviewSchema } from "@ai-knowledge-passport/shared";

import { getAppContext } from "@/server/context";
import { reviewVisaFeedback } from "@/server/services/visas";

export async function POST(request: Request, context: { params: Promise<{ id: string; feedbackId: string }> }) {
  const params = await context.params;

  try {
    const payload = visaFeedbackReviewSchema.parse(await request.json());
    const result = await reviewVisaFeedback(getAppContext(), params.id, params.feedbackId, payload.status);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Visa feedback review failed" },
      { status: 400 }
    );
  }
}
