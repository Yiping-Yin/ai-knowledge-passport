export const runtime = "nodejs";

import { NextResponse } from "next/server";

import { getAppContext } from "@/server/context";
import { getVisaBundleById } from "@/server/services/visas";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const visa = await getVisaBundleById(getAppContext(), params.id);

  if (!visa) {
    return NextResponse.json({ error: "Visa bundle not found" }, { status: 404 });
  }

  return NextResponse.json(visa);
}
