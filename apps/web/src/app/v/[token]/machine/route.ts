export const runtime = "nodejs";

import { NextResponse } from "next/server";

import { getAppContext } from "@/server/context";
import { accessVisaBundleByToken } from "@/server/services/visas";

export async function GET(_: Request, context: { params: Promise<{ token: string }> }) {
  const params = await context.params;
  const access = await accessVisaBundleByToken(getAppContext(), params.token, "machine");

  if (access.status === "invalid") {
    return NextResponse.json({ error: "Visa not found" }, { status: 404 });
  }
  if (access.status === "machine_disabled") {
    return NextResponse.json({ error: "Machine manifest download is disabled for this visa" }, { status: 403 });
  }
  if (access.status === "revoked") {
    return NextResponse.json({ error: "Visa has been revoked" }, { status: 403 });
  }
  if (access.status === "expired") {
    return NextResponse.json({ error: "Visa has expired" }, { status: 403 });
  }

  if (access.status !== "active") {
    return NextResponse.json({ error: "Visa is unavailable" }, { status: 403 });
  }

  return new NextResponse(JSON.stringify(access.visa.machineManifest, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="${access.visa.id}-machine-manifest.json"`
    }
  });
}
