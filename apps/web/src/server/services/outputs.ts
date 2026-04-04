import { eq } from "drizzle-orm";

import type { OutputCreateInput } from "@ai-knowledge-passport/shared";

import type { AppContext } from "@/server/context";
import { outputs, wikiNodes } from "@/server/db/schema";

import { writeAuditLog } from "./audit";
import { createId, nowIso, parseJsonArray } from "./common";
import { syncWikiNodeFts } from "./fts";

export async function createOutput(context: AppContext, input: OutputCreateInput) {
  const outputId = createId("out");
  await context.db.insert(outputs).values({
    id: outputId,
    title: input.title,
    outputType: input.outputType,
    promptContext: input.promptContext,
    contentMd: input.content,
    relatedSourceIdsJson: JSON.stringify(input.relatedSourceIds),
    relatedNodeIdsJson: JSON.stringify(input.relatedNodeIds),
    status: "saved",
    createdAt: nowIso()
  });

  let flowbackNodeId: string | null = null;

  if (input.flowbackMode === "new_node") {
    flowbackNodeId = createId("node");
    await context.db.insert(wikiNodes).values({
      id: flowbackNodeId,
      nodeType: "summary",
      title: input.title,
      summary: input.content.split("\n").slice(0, 3).join(" ").slice(0, 280),
      bodyMd: input.content,
      status: "accepted",
      sourceIdsJson: JSON.stringify(input.relatedSourceIds),
      tagsJson: JSON.stringify([]),
      projectKey: null,
      privacyLevel: "L1_LOCAL_AI",
      embeddingJson: null,
      updatedAt: nowIso(),
      createdAt: nowIso()
    });

    syncWikiNodeFts(context, {
      id: flowbackNodeId,
      title: input.title,
      summary: input.content.slice(0, 280),
      bodyMd: input.content
    });
  } else if (input.flowbackMode === "append" && input.targetNodeId) {
    const target = await context.db.query.wikiNodes.findFirst({
      where: eq(wikiNodes.id, input.targetNodeId)
    });

    if (target) {
      const nextBody = `${target.bodyMd}\n\n---\n\n## Output Append\n\n${input.content}`;
      await context.db
        .update(wikiNodes)
        .set({
          bodyMd: nextBody,
          updatedAt: nowIso()
        })
        .where(eq(wikiNodes.id, target.id));

      syncWikiNodeFts(context, {
        id: target.id,
        title: target.title,
        summary: target.summary,
        bodyMd: nextBody
      });
      flowbackNodeId = target.id;
    }
  }

  const auditId = await writeAuditLog(context, {
    actionType: "create_output",
    objectType: "output",
    objectId: outputId,
    result: "succeeded",
    notes: flowbackNodeId ? `flowback:${flowbackNodeId}` : ""
  });

  return {
    outputId,
    flowbackNodeId,
    auditId
  };
}

export async function listOutputs(context: AppContext) {
  return context.db.query.outputs.findMany();
}
