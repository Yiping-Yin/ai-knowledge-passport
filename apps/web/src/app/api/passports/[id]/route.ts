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

  return NextResponse.json(passport);
}
