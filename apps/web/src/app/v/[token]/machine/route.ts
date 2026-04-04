export const runtime = "nodejs";

import { NextResponse } from "next/server";

import { getAppContext } from "@/server/context";
import { accessVisaBundleByToken } from "@/server/services/visas";

function getRequestMeta(request: Request) {
  return {
    userAgent: request.headers.get("user-agent"),
    sessionHashSource: [
      request.headers.get("x-forwarded-for"),
      request.headers.get("x-real-ip"),
      request.headers.get("user-agent")
    ]
      .filter(Boolean)
      .join("|")
  };
}

export async function GET(request: Request, context: { params: Promise<{ token: string }> }) {
  const params = await context.params;
  const access = await accessVisaBundleByToken(getAppContext(), params.token, "machine", getRequestMeta(request));

  if (access.status === "invalid") {
    return NextResponse.json({ error: "Visa not found" }, { status: 404 });
  }
  if (access.status === "machine_disabled") {
    return NextResponse.json({ error: "Machine manifest download is disabled for this visa" }, { status: 403 });
  }
  if (access.status === "machine_limit_reached") {
    return NextResponse.json({ error: "Machine manifest download limit reached for this visa" }, { status: 403 });
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
