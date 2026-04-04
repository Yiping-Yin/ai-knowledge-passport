export const runtime = "nodejs";

import { NextResponse } from "next/server";

import { getAppContext } from "@/server/context";
import { getPassportSnapshot } from "@/server/services/passports";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const passport = await getPassportSnapshot(getAppContext(), params.id);

  if (!passport) {
    return NextResponse.json({ error: "Passport not found" }, { status: 404 });
  }

  return new NextResponse(JSON.stringify(passport.machineManifest, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="${passport.id}-machine-manifest.json"`
    }
  });
}
