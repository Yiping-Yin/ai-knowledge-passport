import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

import AdmZip from "adm-zip";

import type { AppContext } from "@/server/context";
import { backupRuns } from "@/server/db/schema";

import { writeAuditLog } from "./audit";
import { createId, nowIso } from "./common";
import { enqueueJob, maybeRunInlineJobs } from "./jobs";

type BackupManifest = {
  backupId: string;
  createdAt: string;
  databasePath: string;
  note: string;
  databaseSha256: string;
  objectFileCount: number;
};

async function fileSha256(filePath: string) {
  const buffer = await fs.readFile(filePath);
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

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
  const databaseSha256 = await fileSha256(context.paths.databasePath);
  const objectEntries = await fs.readdir(context.paths.objectsDir, { recursive: true });
  const manifest: BackupManifest = {
    backupId,
    createdAt: nowIso(),
    databasePath: context.paths.databasePath,
    note,
    databaseSha256,
    objectFileCount: objectEntries.filter((entry) => typeof entry === "string" && !entry.endsWith(".gitkeep")).length
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
  const runs = await context.db.query.backupRuns.findMany();
  return runs.map((run) => ({
    ...run,
    manifest: JSON.parse(run.manifestJson) as BackupManifest
  }));
}

export async function restoreBackupToDirectory(
  context: AppContext,
  input: {
    backupId: string;
    targetDir?: string;
  }
) {
  const backup = await context.db.query.backupRuns.findFirst({
    where: (table, { eq }) => eq(table.id, input.backupId)
  });

  if (!backup) {
    throw new Error(`Backup ${input.backupId} not found`);
  }

  const manifest = JSON.parse(backup.manifestJson) as BackupManifest;
  const targetDir = input.targetDir
    ? path.resolve(input.targetDir)
    : path.join(context.paths.dataDir, "restores", input.backupId);

  await fs.mkdir(targetDir, { recursive: true });
  const zip = new AdmZip(backup.filePath);
  zip.extractAllTo(targetDir, true);

  const restoredDatabasePath = path.join(targetDir, path.basename(context.paths.databasePath));
  const restoredManifestPath = path.join(targetDir, "manifest.json");
  const restoredObjectsDir = path.join(targetDir, "objects");

  const [databaseExists, manifestExists] = await Promise.all([
    fs.access(restoredDatabasePath).then(() => true).catch(() => false),
    fs.access(restoredManifestPath).then(() => true).catch(() => false)
  ]);

  if (!databaseExists || !manifestExists) {
    throw new Error("The backup archive did not restore the expected database and manifest files.");
  }

  const restoredSha256 = await fileSha256(restoredDatabasePath);
  const integrityOk = restoredSha256 === manifest.databaseSha256;

  await writeAuditLog(context, {
    actionType: "restore_backup",
    objectType: "backup_run",
    objectId: backup.id,
    result: integrityOk ? "succeeded" : "warning",
    notes: targetDir
  });

  return {
    backupId: backup.id,
    targetDir,
    restoredDatabasePath,
    restoredManifestPath,
    restoredObjectsDir,
    integrityOk,
    expectedDatabaseSha256: manifest.databaseSha256,
    restoredDatabaseSha256: restoredSha256
  };
}
