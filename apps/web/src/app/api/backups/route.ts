export const runtime = "nodejs";

import { NextResponse } from "next/server";

import { backupCreateSchema } from "@ai-knowledge-passport/shared";

import { getAppContext } from "@/server/context";
import { enqueueBackup } from "@/server/services/backups";

export async function POST(request: Request) {
  try {
    const payload = backupCreateSchema.parse(await request.json());
    const result = await enqueueBackup(getAppContext(), payload.note);
    return NextResponse.json(result, { status: 202 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Backup failed" },
      { status: 400 }
    );
  }
}
