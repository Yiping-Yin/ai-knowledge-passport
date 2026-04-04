import { eq, inArray } from "drizzle-orm";

import type { PassportGenerateInput } from "@ai-knowledge-passport/shared";

import type { AppContext } from "@/server/context";
import { passportSnapshots, postcards, wikiNodes } from "@/server/db/schema";

import { writeAuditLog } from "./audit";
import { createId, nowIso } from "./common";
import { enqueueJob, maybeRunInlineJobs } from "./jobs";

export async function enqueuePassportGeneration(context: AppContext, input: PassportGenerateInput) {
  const jobId = await enqueueJob(context, {
    jobType: "generate_passport",
    payload: input
  });
  const auditId = await writeAuditLog(context, {
    actionType: "enqueue_passport",
    objectType: "passport_snapshot",
    objectId: jobId,
    result: "queued",
    notes: input.title
  });

  await maybeRunInlineJobs(context);

  return {
    jobId,
    auditId
  };
}

export async function createPassportSnapshot(context: AppContext, input: Record<string, unknown>) {
  if (!context.provider.isConfigured) {
    throw new Error("OPENAI_API_KEY is required to generate passports.");
  }

  const payload = input as PassportGenerateInput;
  const nodes = payload.includeNodeIds.length
    ? await context.db.query.wikiNodes.findMany({
        where: inArray(wikiNodes.id, payload.includeNodeIds)
      })
    : await context.db.query.wikiNodes.findMany({
        where: eq(wikiNodes.status, "accepted")
      });

  const cards = payload.includePostcardIds.length
    ? await context.db.query.postcards.findMany({
        where: inArray(postcards.id, payload.includePostcardIds)
      })
    : await context.db.query.postcards.findMany();

  const generated = await context.provider.generatePassport({
    title: payload.title,
    nodes: nodes.map((node) => ({
      title: node.title,
      summary: node.summary,
      bodyMd: node.bodyMd,
      tags: JSON.parse(node.tagsJson) as string[]
    })),
    postcards: cards.map((card) => ({
      title: card.title,
      claim: card.claim,
      userView: card.userView,
      cardType: card.cardType as never
    })),
    privacyFloor: payload.privacyFloor
  });

  const passportId = createId("passport");
  await context.db.insert(passportSnapshots).values({
    id: passportId,
    title: payload.title,
    humanMarkdown: generated.humanMarkdown,
    machineManifestJson: JSON.stringify(generated.machineManifest),
    includeNodeIdsJson: JSON.stringify(nodes.map((node) => node.id)),
    includePostcardIdsJson: JSON.stringify(cards.map((card) => card.id)),
    privacyFloor: payload.privacyFloor,
    createdAt: nowIso()
  });

  await writeAuditLog(context, {
    actionType: "generate_passport",
    objectType: "passport_snapshot",
    objectId: passportId,
    result: "succeeded",
    notes: payload.title
  });

  return passportId;
}

export async function listPassports(context: AppContext) {
  return context.db.query.passportSnapshots.findMany();
}
