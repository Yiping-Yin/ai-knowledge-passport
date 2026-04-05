export const runtime = "nodejs";

import { NextResponse } from "next/server";

import { getAppContext } from "@/server/context";
import { activateFocusCard } from "@/server/services/focus-cards";

export async function POST(_: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const result = await activateFocusCard(getAppContext(), params.id);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Focus activation failed" }, { status: 400 });
  }
}
