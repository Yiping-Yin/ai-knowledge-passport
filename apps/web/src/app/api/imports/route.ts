export const runtime = "nodejs";

import { NextResponse } from "next/server";

import { importPayloadSchema } from "@ai-knowledge-passport/shared";

import { getAppContext } from "@/server/context";
import { createSourceImport } from "@/server/services/sources";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const payload = importPayloadSchema.parse({
      type: formData.get("type"),
      title: formData.get("title"),
      originUrl: formData.get("originUrl") || undefined,
      workspaceId: formData.get("workspaceId") || undefined,
      projectKey: formData.get("projectKey") || undefined,
      privacyLevel: formData.get("privacyLevel"),
      textContent: formData.get("textContent") || undefined,
      tags: String(formData.get("tags") ?? "")
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean),
      metadata: {}
    });

    const file = formData.get("file");
    const result = await createSourceImport(getAppContext(), {
      payload,
      file: file instanceof File ? file : null
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Import failed" },
      { status: 400 }
    );
  }
}
