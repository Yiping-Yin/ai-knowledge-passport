import { and, asc, eq } from "drizzle-orm";

import type { JobType } from "@ai-knowledge-passport/shared";

import type { AppContext } from "@/server/context";
import { jobs, sources } from "@/server/db/schema";

import { createBackupRun } from "./backups";
import { compileSource } from "./compiler";
import { createPassportSnapshot } from "./passports";
import { normalizeSource } from "./sources";
import { createId, nowIso, parseJsonObject } from "./common";

export async function enqueueJob(
  context: AppContext,
  input: {
    jobType: JobType;
    sourceId?: string;
    payload?: Record<string, unknown>;
  }
) {
  const jobId = createId("job");
  await context.db.insert(jobs).values({
    id: jobId,
    jobType: input.jobType,
    status: "queued",
    sourceId: input.sourceId,
    payloadJson: JSON.stringify(input.payload ?? {}),
    attempts: 0,
    queuedAt: nowIso()
  });

  return jobId;
}

async function performJob(context: AppContext, jobId: string) {
  const job = await context.db.query.jobs.findFirst({
    where: eq(jobs.id, jobId)
  });

  if (!job) {
    throw new Error(`Job ${jobId} not found`);
  }

  const payload = parseJsonObject<Record<string, unknown>>(job.payloadJson, {});

  switch (job.jobType) {
    case "normalize_source":
      if (!job.sourceId) throw new Error("normalize_source requires sourceId");
      await normalizeSource(context, job.sourceId);
      return;
    case "compile_source":
      if (!job.sourceId) throw new Error("compile_source requires sourceId");
      await compileSource(context, job.sourceId);
      return;
    case "generate_passport":
      await createPassportSnapshot(context, payload);
      return;
    case "create_backup":
      await createBackupRun(context, payload.note ? String(payload.note) : "manual_backup");
      return;
    default:
      throw new Error(`Unsupported job type: ${job.jobType}`);
  }
}

export async function runJob(context: AppContext, jobId: string) {
  const job = await context.db.query.jobs.findFirst({
    where: eq(jobs.id, jobId)
  });

  if (!job) {
    throw new Error(`Job ${jobId} not found`);
  }

  await context.db
    .update(jobs)
    .set({
      status: "running",
      startedAt: nowIso()
    })
    .where(eq(jobs.id, jobId));

  if (job.sourceId && job.jobType === "compile_source") {
    await context.db
      .update(sources)
      .set({
        status: "compiling",
        errorMessage: null
      })
      .where(eq(sources.id, job.sourceId));
  }

  try {
    await performJob(context, jobId);
    const attempts = (context.sqlite.prepare("select attempts from jobs where id = ?").get(jobId) as { attempts?: number } | undefined)?.attempts ?? 0;
    await context.db
      .update(jobs)
      .set({
        status: "succeeded",
        finishedAt: nowIso(),
        attempts: attempts + 1
      })
      .where(eq(jobs.id, jobId));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown worker error";
    const attempts = (context.sqlite.prepare("select attempts from jobs where id = ?").get(jobId) as { attempts?: number } | undefined)?.attempts ?? 0;
    await context.db
      .update(jobs)
      .set({
        status: "failed",
        finishedAt: nowIso(),
        attempts: attempts + 1,
        errorMessage: message
      })
      .where(eq(jobs.id, jobId));

    if (job.sourceId) {
      await context.db
        .update(sources)
        .set({
          status: "failed",
          errorMessage: message
        })
        .where(eq(sources.id, job.sourceId));
    }
    throw error;
  }
}

export async function drainQueue(context: AppContext, limit = 5) {
  const pending = await context.db.query.jobs.findMany({
    where: eq(jobs.status, "queued"),
    orderBy: [asc(jobs.queuedAt)],
    limit
  });

  const failures: Array<{ jobId: string; message: string }> = [];
  for (const job of pending) {
    try {
      await runJob(context, job.id);
    } catch (error) {
      failures.push({
        jobId: job.id,
        message: error instanceof Error ? error.message : "Unknown worker error"
      });
    }
  }

  return failures;
}

export async function maybeRunInlineJobs(context: AppContext) {
  if (process.env.AIKP_INLINE_JOBS === "false") {
    return;
  }

  await drainQueue(context, 3);
}

export async function listJobsBySource(context: AppContext, sourceId: string) {
  return context.db.query.jobs.findMany({
    where: and(eq(jobs.sourceId, sourceId)),
    orderBy: [asc(jobs.queuedAt)]
  });
}
