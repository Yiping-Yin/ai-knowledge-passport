export const runtime = "nodejs";

import { NextResponse } from "next/server";

import { getAppContext } from "@/server/context";
import { listExportPackages } from "@/server/services/exports";

export async function GET() {
  const exports = await listExportPackages(getAppContext(), 80);
  return NextResponse.json({ exports });
}
