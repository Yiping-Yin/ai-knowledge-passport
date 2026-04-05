import { desc, eq } from "drizzle-orm";

import type {
  AvatarLiveMessage,
  AvatarLiveMessageCreateInput,
  AvatarLiveSessionCreateInput,
  AvatarLiveSessionSnapshot,
  AvatarLiveSessionStatus,
  AvatarLiveSessionSummary,
  AvatarSimulationCitation,
  AvatarSimulationStatus
} from "@ai-knowledge-passport/shared";

import type { AppContext } from "@/server/context";
import {
  avatarLiveMessages,
  avatarLiveSessions,
  avatarProfiles
} from "@/server/db/schema";

import { getAgentPackSnapshot } from "./agent-packs";
import { buildAvatarPromptQuestion, classifyAvatarQuestion, resolvePackEvidence } from "./avatar-governance";
import { getAvatarProfile } from "./avatars";
import { writeAuditLog } from "./audit";
import { createId, nowIso, parseJsonArray } from "./common";
import { resolveObjectPolicy } from "./policies";

type AvatarLiveSessionRow = typeof avatarLiveSessions.$inferSelect;
type AvatarLiveMessageRow = typeof avatarLiveMessages.$inferSelect;

function parseLiveSession(row: AvatarLiveSessionRow): AvatarLiveSessionSummary {
  return {
    id: row.id,
    avatarProfileId: row.avatarProfileId,
    title: row.title,
    status: row.status as AvatarLiveSessionStatus,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

function parseLiveMessage(row: AvatarLiveMessageRow): AvatarLiveMessage {
  return {
    id: row.id,
    sessionId: row.sessionId,
    role: row.role as AvatarLiveMessage["role"],
    contentMd: row.contentMd,
    resultStatus: (row.resultStatus as AvatarSimulationStatus | null) ?? null,
    citations: parseJsonArray<AvatarSimulationCitation>(row.citationsJson),
    reason: row.reason,
    createdAt: row.createdAt
  };
}

function defaultSessionTitle(avatarTitle: string) {
  return `${avatarTitle} session`;
}

async function createLiveMessageRow(
  context: AppContext,
  input: {
    sessionId: string;
    role: "user" | "assistant";
    contentMd: string;
    resultStatus?: AvatarSimulationStatus | null;
    citations?: AvatarSimulationCitation[];
    reason?: string;
  }
) {
  const messageId = createId("avatar_live_msg");
  await context.db.insert(avatarLiveMessages).values({
    id: messageId,
    sessionId: input.sessionId,
    role: input.role,
    contentMd: input.contentMd,
    resultStatus: input.resultStatus ?? null,
    citationsJson: JSON.stringify(input.citations ?? []),
    reason: input.reason ?? "",
    createdAt: nowIso()
  });
  return messageId;
}

async function touchLiveSession(context: AppContext, sessionId: string) {
  await context.db
    .update(avatarLiveSessions)
    .set({
      updatedAt: nowIso()
    })
    .where(eq(avatarLiveSessions.id, sessionId));
}

export async function createAvatarLiveSession(
  context: AppContext,
  avatarProfileId: string,
  input: AvatarLiveSessionCreateInput
) {
  const avatar = await getAvatarProfile(context, avatarProfileId);
  if (!avatar) {
    throw new Error("Avatar profile not found.");
  }

  const sessionId = createId("avatar_live_session");
  await context.db.insert(avatarLiveSessions).values({
    id: sessionId,
    avatarProfileId,
    title: input.title.trim() || defaultSessionTitle(avatar.title),
    status: "active",
    createdAt: nowIso(),
    updatedAt: nowIso()
  });

  const auditId = await writeAuditLog(context, {
    actionType: "create_live_avatar_session",
    objectType: "avatar_live_session",
    objectId: sessionId,
    result: "succeeded",
    notes: avatarProfileId
  });

  return {
    sessionId,
    auditId
  };
}

export async function listAvatarLiveSessions(context: AppContext, avatarProfileId: string, limit = 40) {
  const rows = await context.db.query.avatarLiveSessions.findMany({
    where: eq(avatarLiveSessions.avatarProfileId, avatarProfileId),
    orderBy: [desc(avatarLiveSessions.updatedAt)],
    limit
  });
  return rows.map(parseLiveSession);
}

export async function getAvatarLiveSession(context: AppContext, sessionId: string) {
  const session = await context.db.query.avatarLiveSessions.findFirst({
    where: eq(avatarLiveSessions.id, sessionId)
  });
  if (!session) {
    return null;
  }

  const messages = await context.db.query.avatarLiveMessages.findMany({
    where: eq(avatarLiveMessages.sessionId, sessionId),
    orderBy: [avatarLiveMessages.createdAt]
  });

  return {
    ...parseLiveSession(session),
    messages: messages.map(parseLiveMessage)
  } satisfies AvatarLiveSessionSnapshot;
}

export async function setAvatarLiveSessionStatus(
  context: AppContext,
  sessionId: string,
  status: AvatarLiveSessionStatus
) {
  const session = await context.db.query.avatarLiveSessions.findFirst({
    where: eq(avatarLiveSessions.id, sessionId)
  });
  if (!session) {
    throw new Error("Avatar live session not found.");
  }

  await context.db
    .update(avatarLiveSessions)
    .set({
      status,
      updatedAt: nowIso()
    })
    .where(eq(avatarLiveSessions.id, sessionId));

  const auditId = await writeAuditLog(context, {
    actionType: status === "closed" ? "close_live_avatar_session" : "reopen_live_avatar_session",
    objectType: "avatar_live_session",
    objectId: sessionId,
    result: "succeeded"
  });

  return {
    sessionId,
    auditId
  };
}

export async function postAvatarLiveMessage(
  context: AppContext,
  sessionId: string,
  input: AvatarLiveMessageCreateInput
) {
  const session = await context.db.query.avatarLiveSessions.findFirst({
    where: eq(avatarLiveSessions.id, sessionId)
  });
  if (!session) {
    throw new Error("Avatar live session not found.");
  }
  if (session.status === "closed") {
    throw new Error("Closed live sessions cannot accept new messages.");
  }

  const avatar = await getAvatarProfile(context, session.avatarProfileId);
  if (!avatar) {
    throw new Error("Avatar profile not found.");
  }

  const userMessageId = await createLiveMessageRow(context, {
    sessionId,
    role: "user",
    contentMd: input.contentMd
  });
  await writeAuditLog(context, {
    actionType: "post_live_avatar_message",
    objectType: "avatar_live_message",
    objectId: userMessageId,
    result: "succeeded",
    notes: avatar.id
  });

  const profilePolicy = await resolveObjectPolicy(context, "avatar_profile", avatar.id);
  if (!profilePolicy.allowAvatarSimulation) {
    const answerMd = "This avatar is not permitted to run live governed sessions under the current object policy.";
    const assistantMessageId = await createLiveMessageRow(context, {
      sessionId,
      role: "assistant",
      contentMd: answerMd,
      resultStatus: "refused",
      citations: [],
      reason: "policy_avatar_simulation_disabled"
    });
    await touchLiveSession(context, sessionId);
    await writeAuditLog(context, {
      actionType: "refuse_live_avatar_message",
      objectType: "avatar_live_message",
      objectId: assistantMessageId,
      result: "succeeded",
      notes: "policy_avatar_simulation_disabled"
    });
    return {
      userMessageId,
      assistantMessageId,
      resultStatus: "refused" as const,
      answerMd,
      citations: [],
      reason: "policy_avatar_simulation_disabled"
    };
  }

  if (avatar.status === "paused") {
    const answerMd = "This avatar is paused and cannot respond until it is reactivated.";
    const assistantMessageId = await createLiveMessageRow(context, {
      sessionId,
      role: "assistant",
      contentMd: answerMd,
      resultStatus: "refused",
      citations: [],
      reason: "avatar_paused"
    });
    await touchLiveSession(context, sessionId);
    await writeAuditLog(context, {
      actionType: "refuse_live_avatar_message",
      objectType: "avatar_live_message",
      objectId: assistantMessageId,
      result: "succeeded",
      notes: "avatar_paused"
    });
    return {
      userMessageId,
      assistantMessageId,
      resultStatus: "refused" as const,
      answerMd,
      citations: [],
      reason: "avatar_paused"
    };
  }

  const pack = await getAgentPackSnapshot(context, avatar.activePackId);
  if (!pack) {
    const answerMd = "The active agent pack could not be loaded. Escalate to the owner.";
    const assistantMessageId = await createLiveMessageRow(context, {
      sessionId,
      role: "assistant",
      contentMd: answerMd,
      resultStatus: "escalated",
      citations: [],
      reason: "missing_active_pack"
    });
    await touchLiveSession(context, sessionId);
    await writeAuditLog(context, {
      actionType: "escalate_live_avatar_message",
      objectType: "avatar_live_message",
      objectId: assistantMessageId,
      result: "succeeded",
      notes: "missing_active_pack"
    });
    return {
      userMessageId,
      assistantMessageId,
      resultStatus: "escalated" as const,
      answerMd,
      citations: [],
      reason: "missing_active_pack"
    };
  }

  const scopedEvidence = await resolvePackEvidence(context, pack);
  const classification = classifyAvatarQuestion(avatar, scopedEvidence, input.contentMd);

  const transcriptSnapshot = await getAvatarLiveSession(context, sessionId);
  const transcript = transcriptSnapshot?.messages.slice(-12).map((message) => ({
    role: message.role,
    contentMd: message.contentMd
  })) ?? [];

  if (classification.kind !== "answered") {
    const answerMd =
      classification.kind === "escalated"
        ? "This request falls outside the avatar’s safe authority and should be escalated to the owner."
        : "This avatar cannot answer that request within its current rules and evidence boundary.";
    const assistantMessageId = await createLiveMessageRow(context, {
      sessionId,
      role: "assistant",
      contentMd: answerMd,
      resultStatus: classification.kind,
      citations: [],
      reason: classification.reason
    });
    await touchLiveSession(context, sessionId);
    await writeAuditLog(context, {
      actionType: classification.kind === "escalated" ? "escalate_live_avatar_message" : "refuse_live_avatar_message",
      objectType: "avatar_live_message",
      objectId: assistantMessageId,
      result: "succeeded",
      notes: classification.reason
    });
    return {
      userMessageId,
      assistantMessageId,
      resultStatus: classification.kind,
      answerMd,
      citations: [],
      reason: classification.reason
    };
  }

  if (!context.provider.isConfigured) {
    const answerMd = "The avatar cannot generate a governed live reply because no model provider is configured. Escalate to the owner.";
    const assistantMessageId = await createLiveMessageRow(context, {
      sessionId,
      role: "assistant",
      contentMd: answerMd,
      resultStatus: "escalated",
      citations: [],
      reason: "provider_unavailable"
    });
    await touchLiveSession(context, sessionId);
    await writeAuditLog(context, {
      actionType: "escalate_live_avatar_message",
      objectType: "avatar_live_message",
      objectId: assistantMessageId,
      result: "succeeded",
      notes: "provider_unavailable"
    });
    return {
      userMessageId,
      assistantMessageId,
      resultStatus: "escalated" as const,
      answerMd,
      citations: [],
      reason: "provider_unavailable"
    };
  }

  const generated = await context.provider.generateAvatarReply({
    avatarTitle: avatar.title,
    intro: avatar.intro,
    toneRules: avatar.toneRules,
    question: buildAvatarPromptQuestion(transcript, input.contentMd),
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

  const assistantMessageId = await createLiveMessageRow(context, {
    sessionId,
    role: "assistant",
    contentMd: generated.answerMd,
    resultStatus: "answered",
    citations,
    reason: ""
  });
  await touchLiveSession(context, sessionId);
  await writeAuditLog(context, {
    actionType: "answer_live_avatar_message",
    objectType: "avatar_live_message",
    objectId: assistantMessageId,
    result: "succeeded"
  });

  return {
    userMessageId,
    assistantMessageId,
    resultStatus: "answered" as const,
    answerMd: generated.answerMd,
    citations,
    reason: ""
  };
}
