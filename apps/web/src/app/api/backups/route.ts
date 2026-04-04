export const runtime = "nodejs";

import { NextResponse } from "next/server";

import { backupCreateSchema, backupRestoreSchema } from "@ai-knowledge-passport/shared";

import { getAppContext } from "@/server/context";
import { enqueueBackup, listBackups, restoreBackupToDirectory } from "@/server/services/backups";

export async function GET() {
  const backups = await listBackups(getAppContext());
  return NextResponse.json({ backups });
}

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

export async function PATCH(request: Request) {
  try {
    const payload = backupRestoreSchema.parse(await request.json());
    const result = await restoreBackupToDirectory(getAppContext(), payload);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Restore failed" },
      { status: 400 }
    );
  }
}
