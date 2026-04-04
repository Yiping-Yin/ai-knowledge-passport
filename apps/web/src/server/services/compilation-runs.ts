import { desc, eq } from "drizzle-orm";

import type { AppContext } from "@/server/context";
import { compilationRuns } from "@/server/db/schema";
import { createId, nowIso, parseJsonArray, parseJsonObject } from "./common";

export async function createCompilationRun(
  context: AppContext,
  input: {
    sourceId?: string;
    providerName: string;
    inputSummary: Record<string, unknown>;
  }
) {
  const runId = createId("run");
  const startedAt = nowIso();
  await context.db.insert(compilationRuns).values({
    id: runId,
    sourceId: input.sourceId ?? null,
    providerName: input.providerName,
    status: "running",
    inputSummaryJson: JSON.stringify(input.inputSummary),
    outputNodeIdsJson: JSON.stringify([]),
    attachedNodeIdsJson: JSON.stringify([]),
    diffSummaryJson: JSON.stringify({}),
    startedAt
  });
  return runId;
}

export async function completeCompilationRun(
  context: AppContext,
  input: {
    runId: string;
    status: "succeeded" | "failed";
    outputNodeIds?: string[];
    attachedNodeIds?: string[];
    diffSummary?: Record<string, unknown>;
    errorMessage?: string;
  }
) {
  await context.db
    .update(compilationRuns)
    .set({
      status: input.status,
      outputNodeIdsJson: JSON.stringify(input.outputNodeIds ?? []),
      attachedNodeIdsJson: JSON.stringify(input.attachedNodeIds ?? []),
      diffSummaryJson: JSON.stringify(input.diffSummary ?? {}),
      errorMessage: input.errorMessage ?? null,
      finishedAt: nowIso()
    })
    .where(eq(compilationRuns.id, input.runId));
}

export async function listCompilationRuns(context: AppContext, limit = 40) {
  const runs = await context.db.query.compilationRuns.findMany({
    orderBy: [desc(compilationRuns.startedAt)],
    limit
  });

  return runs.map((run) => ({
    ...run,
    inputSummary: parseJsonObject<Record<string, unknown>>(run.inputSummaryJson, {}),
    outputNodeIds: parseJsonArray<string>(run.outputNodeIdsJson),
    attachedNodeIds: parseJsonArray<string>(run.attachedNodeIdsJson),
    diffSummary: parseJsonObject<Record<string, unknown>>(run.diffSummaryJson, {})
  }));
}

export async function getCompilationRun(context: AppContext, runId: string) {
  const run = await context.db.query.compilationRuns.findFirst({
    where: eq(compilationRuns.id, runId)
  });

  if (!run) {
    return null;
  }

  return {
    ...run,
    inputSummary: parseJsonObject<Record<string, unknown>>(run.inputSummaryJson, {}),
    outputNodeIds: parseJsonArray<string>(run.outputNodeIdsJson),
    attachedNodeIds: parseJsonArray<string>(run.attachedNodeIdsJson),
    diffSummary: parseJsonObject<Record<string, unknown>>(run.diffSummaryJson, {})
  };
}
