import { and, desc, eq } from "drizzle-orm";

import type {
  CapabilitySignal,
  CapabilitySignalCreateInput,
  MistakePattern,
  MistakePatternCreateInput,
  PrivacyLevel
} from "@ai-knowledge-passport/shared";

import type { AppContext } from "@/server/context";
import {
  capabilitySignals,
  claims,
  mistakePatterns,
  wikiNodes
} from "@/server/db/schema";

import { writeAuditLog } from "./audit";
import { createId, nowIso, parseJsonArray } from "./common";
import { getActiveFocusCard } from "./focus-cards";
import { getWorkspace } from "./workspaces";

function parseCapabilitySignal(row: typeof capabilitySignals.$inferSelect): CapabilitySignal {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    topic: row.topic,
    observedPractice: row.observedPractice,
    currentGaps: row.currentGaps,
    confidence: row.confidence,
    evidenceNodeIds: parseJsonArray<string>(row.evidenceNodeIdsJson),
    evidenceFragmentIds: parseJsonArray<string>(row.evidenceFragmentIdsJson),
    status: row.status as CapabilitySignal["status"],
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

function parseMistakePattern(row: typeof mistakePatterns.$inferSelect): MistakePattern {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    topic: row.topic,
    description: row.description,
    fixSuggestions: row.fixSuggestions,
    recurrenceCount: row.recurrenceCount,
    exampleNodeIds: parseJsonArray<string>(row.exampleNodeIdsJson),
    exampleFragmentIds: parseJsonArray<string>(row.exampleFragmentIdsJson),
    privacyLevel: row.privacyLevel as PrivacyLevel,
    status: row.status as MistakePattern["status"],
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

export async function listCapabilitySignals(
  context: AppContext,
  input?: {
    workspaceId?: string;
    status?: CapabilitySignal["status"];
    limit?: number;
  }
) {
  const workspace = await getWorkspace(context, input?.workspaceId);
  const rows = await context.db.query.capabilitySignals.findMany({
    where: input?.status
      ? and(eq(capabilitySignals.workspaceId, workspace.id), eq(capabilitySignals.status, input.status))
      : eq(capabilitySignals.workspaceId, workspace.id),
    orderBy: [desc(capabilitySignals.updatedAt)],
    limit: input?.limit
  });
  return rows.map(parseCapabilitySignal);
}

export async function listMistakePatterns(
  context: AppContext,
  input?: {
    workspaceId?: string;
    status?: MistakePattern["status"];
    limit?: number;
  }
) {
  const workspace = await getWorkspace(context, input?.workspaceId);
  const rows = await context.db.query.mistakePatterns.findMany({
    where: input?.status
      ? and(eq(mistakePatterns.workspaceId, workspace.id), eq(mistakePatterns.status, input.status))
      : eq(mistakePatterns.workspaceId, workspace.id),
    orderBy: [desc(mistakePatterns.updatedAt)],
    limit: input?.limit
  });
  return rows.map(parseMistakePattern);
}

export async function createCapabilitySignal(context: AppContext, input: CapabilitySignalCreateInput) {
  const workspace = await getWorkspace(context, input.workspaceId);
  const signalId = createId("signal");
  const timestamp = nowIso();

  await context.db.insert(capabilitySignals).values({
    id: signalId,
    workspaceId: workspace.id,
    topic: input.topic,
    observedPractice: input.observedPractice,
    currentGaps: input.currentGaps,
    confidence: input.confidence,
    evidenceNodeIdsJson: JSON.stringify(input.evidenceNodeIds),
    evidenceFragmentIdsJson: JSON.stringify(input.evidenceFragmentIds),
    status: input.status,
    createdAt: timestamp,
    updatedAt: timestamp
  });

  const auditId = await writeAuditLog(context, {
    actionType: "create_capability_signal",
    objectType: "capability_signal",
    objectId: signalId,
    result: "succeeded",
    notes: input.topic
  });

  return {
    signalId,
    auditId
  };
}

export async function createMistakePattern(context: AppContext, input: MistakePatternCreateInput) {
  const workspace = await getWorkspace(context, input.workspaceId);
  const mistakeId = createId("mistake");
  const timestamp = nowIso();

  await context.db.insert(mistakePatterns).values({
    id: mistakeId,
    workspaceId: workspace.id,
    topic: input.topic,
    description: input.description,
    fixSuggestions: input.fixSuggestions,
    recurrenceCount: input.recurrenceCount,
    exampleNodeIdsJson: JSON.stringify(input.exampleNodeIds),
    exampleFragmentIdsJson: JSON.stringify(input.exampleFragmentIds),
    privacyLevel: input.privacyLevel,
    status: input.status,
    createdAt: timestamp,
    updatedAt: timestamp
  });

  const auditId = await writeAuditLog(context, {
    actionType: "create_mistake_pattern",
    objectType: "mistake_pattern",
    objectId: mistakeId,
    result: "succeeded",
    notes: input.topic
  });

  return {
    mistakeId,
    auditId
  };
}

export async function reviewCapabilitySignal(
  context: AppContext,
  signalId: string,
  status: CapabilitySignal["status"]
) {
  const row = await context.db.query.capabilitySignals.findFirst({
    where: eq(capabilitySignals.id, signalId)
  });

  if (!row) {
    throw new Error("Capability signal not found.");
  }

  await context.db
    .update(capabilitySignals)
    .set({
      status,
      updatedAt: nowIso()
    })
    .where(eq(capabilitySignals.id, signalId));

  await writeAuditLog(context, {
    actionType: `review_capability_signal_${status}`,
    objectType: "capability_signal",
    objectId: signalId,
    result: "succeeded",
    notes: row.topic
  });
}

export async function reviewMistakePattern(
  context: AppContext,
  mistakeId: string,
  status: MistakePattern["status"]
) {
  const row = await context.db.query.mistakePatterns.findFirst({
    where: eq(mistakePatterns.id, mistakeId)
  });

  if (!row) {
    throw new Error("Mistake pattern not found.");
  }

  await context.db
    .update(mistakePatterns)
    .set({
      status,
      updatedAt: nowIso()
    })
    .where(eq(mistakePatterns.id, mistakeId));

  await writeAuditLog(context, {
    actionType: `review_mistake_pattern_${status}`,
    objectType: "mistake_pattern",
    objectId: mistakeId,
    result: "succeeded",
    notes: row.topic
  });
}

export async function generateLearnerStateForWorkspace(context: AppContext, workspaceId: string) {
  if (!context.provider.isConfigured) {
    return {
      signalsCreated: 0,
      mistakesCreated: 0
    };
  }

  const workspace = await getWorkspace(context, workspaceId);
  const [acceptedNodes, workspaceClaims] = await Promise.all([
    context.db.query.wikiNodes.findMany({
      where: and(eq(wikiNodes.workspaceId, workspace.id), eq(wikiNodes.status, "accepted")),
      orderBy: [desc(wikiNodes.updatedAt)],
      limit: 20
    }),
    context.db.query.claims.findMany({
      where: eq(claims.workspaceId, workspace.id),
      orderBy: [desc(claims.updatedAt)],
      limit: 30
    })
  ]);

  if (!acceptedNodes.length && !workspaceClaims.length) {
    return {
      signalsCreated: 0,
      mistakesCreated: 0
    };
  }

  const generated = await context.provider.generateLearnerState({
    workspaceTitle: workspace.title,
    nodes: acceptedNodes.map((node) => ({
      id: node.id,
      title: node.title,
      summary: node.summary,
      bodyMd: node.bodyMd,
      tags: parseJsonArray<string>(node.tagsJson),
      projectKey: node.projectKey
    })),
    claims: workspaceClaims.map((claim) => ({
      id: claim.id,
      title: claim.title,
      statement: claim.statement,
      confidence: claim.confidence,
      tags: parseJsonArray<string>(claim.tagsJson),
      sourceFragmentIds: parseJsonArray<string>(claim.sourceFragmentIdsJson),
      nodeId: claim.nodeId ?? null
    }))
  });

  let signalsCreated = 0;
  for (const candidate of generated.capabilitySignals) {
    const existing = await context.db.query.capabilitySignals.findFirst({
      where: and(
        eq(capabilitySignals.workspaceId, workspace.id),
        eq(capabilitySignals.topic, candidate.topic),
        eq(capabilitySignals.status, "pending_review")
      )
    });

    const timestamp = nowIso();
    if (existing) {
      await context.db
        .update(capabilitySignals)
        .set({
          observedPractice: candidate.observedPractice,
          currentGaps: candidate.currentGaps,
          confidence: candidate.confidence,
          evidenceNodeIdsJson: JSON.stringify(candidate.evidenceNodeIds),
          evidenceFragmentIdsJson: JSON.stringify(candidate.evidenceFragmentIds),
          updatedAt: timestamp
        })
        .where(eq(capabilitySignals.id, existing.id));
    } else {
      await context.db.insert(capabilitySignals).values({
        id: createId("signal"),
        workspaceId: workspace.id,
        topic: candidate.topic,
        observedPractice: candidate.observedPractice,
        currentGaps: candidate.currentGaps,
        confidence: candidate.confidence,
        evidenceNodeIdsJson: JSON.stringify(candidate.evidenceNodeIds),
        evidenceFragmentIdsJson: JSON.stringify(candidate.evidenceFragmentIds),
        status: "pending_review",
        createdAt: timestamp,
        updatedAt: timestamp
      });
    }
    signalsCreated += 1;
  }

  let mistakesCreated = 0;
  for (const candidate of generated.mistakePatterns) {
    const existing = await context.db.query.mistakePatterns.findFirst({
      where: and(
        eq(mistakePatterns.workspaceId, workspace.id),
        eq(mistakePatterns.topic, candidate.topic),
        eq(mistakePatterns.status, "pending_review")
      )
    });

    const timestamp = nowIso();
    if (existing) {
      await context.db
        .update(mistakePatterns)
        .set({
          description: candidate.description,
          fixSuggestions: candidate.fixSuggestions,
          recurrenceCount: candidate.recurrenceCount,
          exampleNodeIdsJson: JSON.stringify(candidate.exampleNodeIds),
          exampleFragmentIdsJson: JSON.stringify(candidate.exampleFragmentIds),
          privacyLevel: candidate.privacyLevel,
          updatedAt: timestamp
        })
        .where(eq(mistakePatterns.id, existing.id));
    } else {
      await context.db.insert(mistakePatterns).values({
        id: createId("mistake"),
        workspaceId: workspace.id,
        topic: candidate.topic,
        description: candidate.description,
        fixSuggestions: candidate.fixSuggestions,
        recurrenceCount: candidate.recurrenceCount,
        exampleNodeIdsJson: JSON.stringify(candidate.exampleNodeIds),
        exampleFragmentIdsJson: JSON.stringify(candidate.exampleFragmentIds),
        privacyLevel: candidate.privacyLevel,
        status: "pending_review",
        createdAt: timestamp,
        updatedAt: timestamp
      });
    }
    mistakesCreated += 1;
  }

  await writeAuditLog(context, {
    actionType: "generate_learner_state",
    objectType: "workspace",
    objectId: workspace.id,
    result: "succeeded",
    notes: `signals:${signalsCreated} mistakes:${mistakesCreated}`
  });

  return {
    signalsCreated,
    mistakesCreated
  };
}

export async function buildWorkspaceContextBlock(context: AppContext, workspaceId?: string | null) {
  if (!workspaceId) {
    return "";
  }

  const [focusCard, acceptedSignals, acceptedMistakes] = await Promise.all([
    getActiveFocusCard(context, workspaceId),
    listCapabilitySignals(context, { workspaceId, status: "accepted", limit: 4 }),
    listMistakePatterns(context, { workspaceId, status: "accepted", limit: 4 })
  ]);

  const lines: string[] = [];
  if (focusCard) {
    lines.push(
      `Active focus: ${focusCard.title}`,
      `Goal: ${focusCard.goal}`,
      `Timeframe: ${focusCard.timeframe || "unspecified"}`,
      `Priority: ${focusCard.priority}`
    );
  }

  if (acceptedSignals.length) {
    lines.push(
      "Capability signals:",
      ...acceptedSignals.map((signal) => `- ${signal.topic}: ${signal.observedPractice} | Gaps: ${signal.currentGaps}`)
    );
  }

  if (acceptedMistakes.length) {
    lines.push(
      "Mistake patterns:",
      ...acceptedMistakes.map((mistake) => `- ${mistake.topic}: ${mistake.description}`)
    );
  }

  return lines.join("\n");
}
