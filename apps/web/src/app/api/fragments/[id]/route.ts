export const runtime = "nodejs";

import { NextResponse } from "next/server";

import { getAppContext } from "@/server/context";
import { getFragment } from "@/server/services/fragments";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const fragment = await getFragment(getAppContext(), params.id);

  if (!fragment) {
    return NextResponse.json({ error: "Fragment not found" }, { status: 404 });
  }

  return NextResponse.json(fragment);
}
