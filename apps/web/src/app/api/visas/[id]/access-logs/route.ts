export const runtime = "nodejs";

import { NextResponse } from "next/server";

import { getAppContext } from "@/server/context";
import { listVisaAccessLogs } from "@/server/services/visas";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const logs = await listVisaAccessLogs(getAppContext(), params.id, 100);
  return NextResponse.json({ logs });
}
