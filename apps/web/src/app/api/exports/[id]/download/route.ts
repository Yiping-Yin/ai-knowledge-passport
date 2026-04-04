export const runtime = "nodejs";

import { NextResponse } from "next/server";
import path from "node:path";

import { getAppContext } from "@/server/context";
import { recordExportDownload } from "@/server/services/exports";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;

  try {
    const exportPackage = await recordExportDownload(getAppContext(), params.id);
    return new NextResponse(await (await import("node:fs/promises")).readFile(exportPackage.filePath), {
      headers: {
        "content-type": "application/zip",
        "content-disposition": `attachment; filename="${path.basename(exportPackage.filePath)}"`
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Export package not found" },
      { status: 404 }
    );
  }
}
