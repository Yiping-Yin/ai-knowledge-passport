import fs from "node:fs/promises";
import path from "node:path";

import AdmZip from "adm-zip";

import type { AppContext } from "@/server/context";
import { backupRuns, auditLogs, outputs, passportSnapshots, postcards, sources, wikiNodes } from "@/server/db/schema";

import { writeAuditLog } from "./audit";
import { createId, nowIso } from "./common";
import { enqueueJob, maybeRunInlineJobs } from "./jobs";

export async function enqueueBackup(context: AppContext, note: string) {
  const jobId = await enqueueJob(context, {
    jobType: "create_backup",
    payload: { note }
  });
  const auditId = await writeAuditLog(context, {
    actionType: "enqueue_backup",
    objectType: "backup_run",
    objectId: jobId,
    result: "queued",
    notes: note
  });

  await maybeRunInlineJobs(context);

  return {
    jobId,
    auditId
  };
}

export async function createBackupRun(context: AppContext, note: string) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupId = createId("backup");
  const filename = `knowledge-passport-backup-${timestamp}.zip`;
  const filePath = path.join(context.paths.backupsDir, filename);
  const manifest = {
    createdAt: nowIso(),
    databasePath: context.paths.databasePath,
    note
  };

  await fs.mkdir(context.paths.backupsDir, { recursive: true });

  const zip = new AdmZip();
  zip.addLocalFile(context.paths.databasePath);
  zip.addLocalFolder(context.paths.objectsDir, "objects");
  zip.addFile("manifest.json", Buffer.from(JSON.stringify(manifest, null, 2), "utf8"));
  zip.writeZip(filePath);

  await context.db.insert(backupRuns).values({
    id: backupId,
    filePath,
    manifestJson: JSON.stringify(manifest),
    note,
    status: "succeeded",
    createdAt: nowIso()
  });

  await writeAuditLog(context, {
    actionType: "create_backup",
    objectType: "backup_run",
    objectId: backupId,
    result: "succeeded",
    notes: note
  });

  return backupId;
}

export async function listBackups(context: AppContext) {
  return context.db.query.backupRuns.findMany();
}
