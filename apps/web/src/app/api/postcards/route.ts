export const runtime = "nodejs";

import { NextResponse } from "next/server";

import { postcardCreateSchema } from "@ai-knowledge-passport/shared";

import { getAppContext } from "@/server/context";
import { createPostcard, createSuggestedPostcard } from "@/server/services/postcards";

export async function POST(request: Request) {
  try {
    const raw = await request.json();
    const appContext = getAppContext();

    if (raw.autoGenerate) {
      const result = await createSuggestedPostcard(appContext, {
        cardType: raw.cardType,
        title: raw.title,
        nodeIds: Array.isArray(raw.relatedNodeIds) ? raw.relatedNodeIds : [],
        sourceIds: Array.isArray(raw.relatedSourceIds) ? raw.relatedSourceIds : []
      });
      return NextResponse.json(result, { status: 201 });
    }

    const payload = postcardCreateSchema.parse(raw);
    const result = await createPostcard(appContext, payload);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Postcard create failed" },
      { status: 400 }
    );
  }
}
