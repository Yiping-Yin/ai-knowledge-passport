export const runtime = "nodejs";

import { NextResponse } from "next/server";

import { getAppContext } from "@/server/context";
import { listVisaFeedbackQueue } from "@/server/services/visas";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const feedbackItems = await listVisaFeedbackQueue(getAppContext(), params.id, 100);
  return NextResponse.json({ feedbackItems });
}
