export const runtime = "nodejs";

import { NextResponse } from "next/server";

import { getAppContext } from "@/server/context";
import { listSources } from "@/server/services/sources";

export async function GET() {
  const sources = await listSources(getAppContext());
  return NextResponse.json({ sources });
}
