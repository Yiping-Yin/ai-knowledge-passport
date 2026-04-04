export const runtime = "nodejs";

import { NextResponse } from "next/server";

import { getAppContext } from "@/server/context";
import { writeAuditLog } from "@/server/services/audit";
import { enqueueJob, maybeRunInlineJobs } from "@/server/services/jobs";

export async function POST(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params;
    const appContext = getAppContext();
    const jobId = await enqueueJob(appContext, {
      jobType: "compile_source",
      sourceId: params.id
    });
    const auditId = await writeAuditLog(appContext, {
      actionType: "enqueue_compile",
      objectType: "source",
      objectId: params.id,
      result: "queued",
      notes: jobId
    });
    await maybeRunInlineJobs(appContext);
    return NextResponse.json({ jobId, auditId });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Compile failed" },
      { status: 400 }
    );
  }
}
