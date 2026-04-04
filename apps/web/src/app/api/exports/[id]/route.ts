export const runtime = "nodejs";

import { NextResponse } from "next/server";

import { getAppContext } from "@/server/context";
import { getExportPackage } from "@/server/services/exports";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const exportPackage = await getExportPackage(getAppContext(), params.id);

  if (!exportPackage) {
    return NextResponse.json({ error: "Export package not found" }, { status: 404 });
  }

  return NextResponse.json(exportPackage);
}
