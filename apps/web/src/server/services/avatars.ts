import { desc, eq, inArray } from "drizzle-orm";

import type {
  AgentPackSnapshot,
  AvatarProfileCreateInput,
  AvatarProfileSummary,
  AvatarProfileUpdateInput,
  AvatarSimulationCitation,
  AvatarSimulationInput,
  AvatarSimulationSession,
  AvatarSimulationStatus,
  AvatarStatus
} from "@ai-knowledge-passport/shared";

import type { AppContext } from "@/server/context";
import {
  agentPackSnapshots,
  avatarProfiles,
  avatarSimulationSessions,
  postcards,
  wikiNodes
} from "@/server/db/schema";

import { writeAuditLog } from "./audit";
import { createId, nowIso, parseJsonArray, parseJsonObject } from "./common";
import { getAgentPackSnapshot } from "./agent-packs";
import { assertPolicyAllows, resolveObjectPolicy } from "./policies";

type AvatarProfileRow = typeof avatarProfiles.$inferSelect;
type AvatarSimulationSessionRow = typeof avatarSimulationSessions.$inferSelect;

const defaultEscalationRules = {
  escalateOnForbiddenTopic: true,
  escalateOnInsufficientEvidence: true,
  escalateOnOutOfScope: true
};

const stopwords = new Set([
  "the",
  "and",
  "for",
  "with",
  "this",
  "that",
  "what",
  "when",
  "where",
  "which",
  "your",
  "from",
  "into",
  "about",
  "best"
]);

function parseProfile(row: AvatarProfileRow): AvatarProfileSummary {
  return {
    id: row.id,
    title: row.title,
    activePackId: row.activePackId,
    intro: row.intro,
    toneRules: parseJsonArray<string>(row.toneRulesJson),
    forbiddenTopics: parseJsonArray<string>(row.forbiddenTopicsJson),
    escalationRules: parseJsonObject(row.escalationRulesJson, defaultEscalationRules),
    status: row.status as AvatarStatus,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

function parseSimulationSession(row: AvatarSimulationSessionRow): AvatarSimulationSession {
  return {
    id: row.id,
    avatarProfileId: row.avatarProfileId,
    question: row.question,
    resultStatus: row.resultStatus as AvatarSimulationStatus,
    answerMd: row.answerMd,
    citations: parseJsonArray<AvatarSimulationCitation>(row.citationsJson),
    reason: row.reason,
    createdAt: row.createdAt
  };
}

function tokenizeQuestion(question: string) {
  return question
    .toLowerCase()
    .split(/[\s,.;:!?()[\]{}"'，。；：！？、]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3)
    .filter((token) => !stopwords.has(token));
}

function lexicalHits(text: string, tokens: string[]) {
  const normalized = text.toLowerCase();
  return tokens.filter((token) => normalized.includes(token)).length;
}

async function ensureAgentPackExists(context: AppContext, packId: string) {
  const pack = await context.db.query.agentPackSnapshots.findFirst({
    where: eq(agentPackSnapshots.id, packId)
  });
  if (!pack) {
    throw new Error("Agent pack snapshot not found.");
  }
  return pack;
}

async function resolvePackEvidence(context: AppContext, pack: AgentPackSnapshot) {
  const includedNodeIds = new Set(pack.includeNodeIds);
  const includedCardIds = pack.includePostcardIds;
  if (includedCardIds.length) {
    const cardRows = await context.db.query.postcards.findMany({
      where: inArray(postcards.id, includedCardIds)
    });
    for (const card of cardRows) {
      for (const nodeId of parseJsonArray<string>(card.relatedNodeIdsJson)) {
        includedNodeIds.add(nodeId);
      }
    }
  }

  const nodeIds = Array.from(includedNodeIds);
  if (!nodeIds.length) {
    return [];
  }

  const nodeRows = await context.db.query.wikiNodes.findMany({
    where: inArray(wikiNodes.id, nodeIds)
  });

  return nodeRows
    .filter((node) => node.status === "accepted")
    .map((node) => ({
      id: node.id,
      title: node.title,
      text: `${node.title}\n${node.summary}\n${node.bodyMd}`
    }));
}

function classifyQuestion(
  profile: AvatarProfileSummary,
  scopedEvidence: Array<{ id: string; title: string; text: string }>,
  question: string
): {
  kind: "answered" | "refused" | "escalated";
  reason: string;
  evidence: Array<{ id: string; title: string; text: string; hits?: number }>;
} {
  const normalizedQuestion = question.toLowerCase();
  const forbiddenTopic = profile.forbiddenTopics.find((topic) => topic.trim() && normalizedQuestion.includes(topic.toLowerCase()));
  if (forbiddenTopic) {
    return {
      kind: profile.escalationRules.escalateOnForbiddenTopic ? "escalated" : "refused",
      reason: `forbidden_topic:${forbiddenTopic}`,
      evidence: [] as Array<{ id: string; title: string; text: string }>
    };
  }

  const tokens = tokenizeQuestion(question);
  const scored = scopedEvidence
    .map((entry) => ({
      ...entry,
      hits: lexicalHits(entry.text, tokens)
    }))
    .sort((left, right) => right.hits - left.hits);

  const topHits = scored[0]?.hits ?? 0;
  if (!scored.length) {
    return {
      kind: profile.escalationRules.escalateOnInsufficientEvidence ? "escalated" : "refused",
      reason: "insufficient_evidence",
      evidence: []
    };
  }

  if (topHits === 0) {
    return {
      kind: profile.escalationRules.escalateOnOutOfScope ? "escalated" : "refused",
      reason: "out_of_scope",
      evidence: []
    };
  }

  const requiredHits = Math.min(2, Math.max(tokens.length, 1));
  if (topHits < requiredHits) {
    return {
      kind: profile.escalationRules.escalateOnInsufficientEvidence ? "escalated" : "refused",
      reason: "insufficient_evidence",
      evidence: scored.filter((entry) => entry.hits > 0).slice(0, 5)
    };
  }

  return {
    kind: "answered" as const,
    reason: "",
    evidence: scored.filter((entry) => entry.hits > 0).slice(0, 5)
  };
}

async function createSimulationSession(
  context: AppContext,
  input: {
    avatarProfileId: string;
    question: string;
    resultStatus: AvatarSimulationStatus;
    answerMd: string;
    citations: AvatarSimulationCitation[];
    reason: string;
  }
) {
  const sessionId = createId("avatar_session");
  await context.db.insert(avatarSimulationSessions).values({
    id: sessionId,
    avatarProfileId: input.avatarProfileId,
    question: input.question,
    resultStatus: input.resultStatus,
    answerMd: input.answerMd,
    citationsJson: JSON.stringify(input.citations),
    reason: input.reason,
    createdAt: nowIso()
  });

  await writeAuditLog(context, {
    actionType: "simulate_avatar",
    objectType: "avatar_simulation_session",
    objectId: sessionId,
    result: "succeeded",
    notes: input.resultStatus
  });

  if (input.resultStatus === "refused") {
    await writeAuditLog(context, {
      actionType: "refuse_avatar",
      objectType: "avatar_profile",
      objectId: input.avatarProfileId,
      result: "succeeded",
      notes: input.reason
    });
  }

  if (input.resultStatus === "escalated") {
    await writeAuditLog(context, {
      actionType: "escalate_avatar",
      objectType: "avatar_profile",
      objectId: input.avatarProfileId,
      result: "succeeded",
      notes: input.reason
    });
  }

  return sessionId;
}

export async function createAvatarProfile(context: AppContext, input: AvatarProfileCreateInput) {
  await ensureAgentPackExists(context, input.activePackId);
  await assertPolicyAllows(context, "agent_pack_snapshot", input.activePackId, "avatar_binding");

  const avatarId = createId("avatar");
  const timestamp = nowIso();
  await context.db.insert(avatarProfiles).values({
    id: avatarId,
    title: input.title,
    activePackId: input.activePackId,
    intro: input.intro,
    toneRulesJson: JSON.stringify(input.toneRules),
    forbiddenTopicsJson: JSON.stringify(input.forbiddenTopics),
    escalationRulesJson: JSON.stringify(input.escalationRules),
    status: input.status,
    createdAt: timestamp,
    updatedAt: timestamp
  });

  const auditId = await writeAuditLog(context, {
    actionType: "create_avatar_profile",
    objectType: "avatar_profile",
    objectId: avatarId,
    result: "succeeded",
    notes: input.title
  });

  return {
    avatarId,
    auditId
  };
}

export async function listAvatarProfiles(context: AppContext, limit = 80) {
  const rows = await context.db.query.avatarProfiles.findMany({
    orderBy: [desc(avatarProfiles.updatedAt)],
    limit
  });
  return rows.map(parseProfile);
}

export async function getAvatarProfile(context: AppContext, avatarId: string) {
  const row = await context.db.query.avatarProfiles.findFirst({
    where: eq(avatarProfiles.id, avatarId)
  });
  return row ? parseProfile(row) : null;
}

export async function updateAvatarProfile(context: AppContext, avatarId: string, input: AvatarProfileUpdateInput) {
  const row = await context.db.query.avatarProfiles.findFirst({
    where: eq(avatarProfiles.id, avatarId)
  });

  if (!row) {
    throw new Error("Avatar profile not found.");
  }

  if (input.activePackId) {
    await ensureAgentPackExists(context, input.activePackId);
    await assertPolicyAllows(context, "agent_pack_snapshot", input.activePackId, "avatar_binding");
  }

  await context.db
    .update(avatarProfiles)
    .set({
      activePackId: input.activePackId ?? row.activePackId,
      intro: input.intro ?? row.intro,
      toneRulesJson: JSON.stringify(input.toneRules ?? parseJsonArray<string>(row.toneRulesJson)),
      forbiddenTopicsJson: JSON.stringify(input.forbiddenTopics ?? parseJsonArray<string>(row.forbiddenTopicsJson)),
      escalationRulesJson: JSON.stringify(input.escalationRules ?? parseJsonObject(row.escalationRulesJson, defaultEscalationRules)),
      updatedAt: nowIso()
    })
    .where(eq(avatarProfiles.id, avatarId));

  const auditId = await writeAuditLog(context, {
    actionType: "update_avatar_profile",
    objectType: "avatar_profile",
    objectId: avatarId,
    result: "succeeded"
  });

  return {
    avatarId,
    auditId
  };
}

export async function setAvatarStatus(context: AppContext, avatarId: string, status: AvatarStatus) {
  const row = await context.db.query.avatarProfiles.findFirst({
    where: eq(avatarProfiles.id, avatarId)
  });

  if (!row) {
    throw new Error("Avatar profile not found.");
  }

  await context.db
    .update(avatarProfiles)
    .set({
      status,
      updatedAt: nowIso()
    })
    .where(eq(avatarProfiles.id, avatarId));

  const auditId = await writeAuditLog(context, {
    actionType: status === "paused" ? "pause_avatar" : "activate_avatar",
    objectType: "avatar_profile",
    objectId: avatarId,
    result: "succeeded"
  });

  return {
    avatarId,
    auditId
  };
}

export async function listAvatarSimulationSessions(context: AppContext, avatarProfileId: string, limit = 40) {
  const rows = await context.db.query.avatarSimulationSessions.findMany({
    where: eq(avatarSimulationSessions.avatarProfileId, avatarProfileId),
    orderBy: [desc(avatarSimulationSessions.createdAt)],
    limit
  });
  return rows.map(parseSimulationSession);
}

export async function simulateAvatar(context: AppContext, avatarId: string, input: AvatarSimulationInput) {
  const profile = await getAvatarProfile(context, avatarId);
  if (!profile) {
    throw new Error("Avatar profile not found.");
  }

  const profilePolicy = await resolveObjectPolicy(context, "avatar_profile", avatarId);
  if (!profilePolicy.allowAvatarSimulation) {
    const answerMd = "This avatar is not permitted to simulate replies under the current object policy.";
    const sessionId = await createSimulationSession(context, {
      avatarProfileId: profile.id,
      question: input.question,
      resultStatus: "refused",
      answerMd,
      citations: [],
      reason: "policy_avatar_simulation_disabled"
    });
    return {
      sessionId,
      resultStatus: "refused" as const,
      answerMd,
      citations: [],
      reason: "policy_avatar_simulation_disabled"
    };
  }

  if (profile.status === "paused") {
    const answerMd = "This avatar is paused and cannot respond until it is reactivated.";
    const sessionId = await createSimulationSession(context, {
      avatarProfileId: profile.id,
      question: input.question,
      resultStatus: "refused",
      answerMd,
      citations: [],
      reason: "avatar_paused"
    });
    return {
      sessionId,
      resultStatus: "refused" as const,
      answerMd,
      citations: [],
      reason: "avatar_paused"
    };
  }

  const pack = await getAgentPackSnapshot(context, profile.activePackId);
  if (!pack) {
    const answerMd = "The active agent pack could not be loaded. Escalate to the owner.";
    const sessionId = await createSimulationSession(context, {
      avatarProfileId: profile.id,
      question: input.question,
      resultStatus: "escalated",
      answerMd,
      citations: [],
      reason: "missing_active_pack"
    });
    return {
      sessionId,
      resultStatus: "escalated" as const,
      answerMd,
      citations: [],
      reason: "missing_active_pack"
    };
  }

  const scopedEvidence = await resolvePackEvidence(context, pack);
  const classification = classifyQuestion(profile, scopedEvidence, input.question);

  if (classification.kind !== "answered") {
    const answerMd =
      classification.kind === "escalated"
        ? "This request falls outside the avatar’s safe authority and should be escalated to the owner."
        : "This avatar cannot answer that request within its current rules and evidence boundary.";
    const sessionId = await createSimulationSession(context, {
      avatarProfileId: profile.id,
      question: input.question,
      resultStatus: classification.kind,
      answerMd,
      citations: [],
      reason: classification.reason
    });

    return {
      sessionId,
      resultStatus: classification.kind,
      answerMd,
      citations: [],
      reason: classification.reason
    };
  }

  if (!context.provider.isConfigured) {
    const answerMd = "The avatar cannot generate a governed reply because no model provider is configured. Escalate to the owner.";
    const sessionId = await createSimulationSession(context, {
      avatarProfileId: profile.id,
      question: input.question,
      resultStatus: "escalated",
      answerMd,
      citations: [],
      reason: "provider_unavailable"
    });
    return {
      sessionId,
      resultStatus: "escalated" as const,
      answerMd,
      citations: [],
      reason: "provider_unavailable"
    };
  }

  const generated = await context.provider.generateAvatarReply({
    avatarTitle: profile.title,
    intro: profile.intro,
    toneRules: profile.toneRules,
    question: input.question,
    evidence: classification.evidence.map((entry) => ({
      refId: entry.id,
      title: entry.title,
      text: entry.text
    }))
  });

  const allowedRefIds = new Set(classification.evidence.map((entry) => entry.id));
  const citations = generated.citations
    .filter((entry) => entry.kind === "wiki_node" && allowedRefIds.has(entry.refId))
    .map((entry) => ({
      refId: entry.refId,
      kind: "wiki_node" as const,
      excerpt: entry.excerpt,
      score: entry.score
    }));

  const sessionId = await createSimulationSession(context, {
    avatarProfileId: profile.id,
    question: input.question,
    resultStatus: "answered",
    answerMd: generated.answerMd,
    citations,
    reason: ""
  });

  return {
    sessionId,
    resultStatus: "answered" as const,
    answerMd: generated.answerMd,
    citations,
    reason: ""
  };
}
