import { inArray } from "drizzle-orm";

import type { AgentPackSnapshot, AvatarProfileSummary } from "@ai-knowledge-passport/shared";

import type { AppContext } from "@/server/context";
import { postcards, wikiNodes } from "@/server/db/schema";
import { parseJsonArray } from "./common";

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

export type PackEvidenceItem = {
  id: string;
  title: string;
  text: string;
  workspaceId?: string;
};

export type AvatarQuestionClassification = {
  kind: "answered" | "refused" | "escalated";
  reason: string;
  evidence: Array<PackEvidenceItem & { hits?: number }>;
};

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

export async function resolvePackEvidence(context: AppContext, pack: AgentPackSnapshot): Promise<PackEvidenceItem[]> {
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
      text: `${node.title}\n${node.summary}\n${node.bodyMd}`,
      workspaceId: node.workspaceId
    }));
}

export function classifyAvatarQuestion(
  profile: AvatarProfileSummary,
  scopedEvidence: PackEvidenceItem[],
  question: string
): AvatarQuestionClassification {
  const normalizedQuestion = question.toLowerCase();
  const forbiddenTopic = profile.forbiddenTopics.find((topic) => topic.trim() && normalizedQuestion.includes(topic.toLowerCase()));
  if (forbiddenTopic) {
    return {
      kind: profile.escalationRules.escalateOnForbiddenTopic ? "escalated" : "refused",
      reason: `forbidden_topic:${forbiddenTopic}`,
      evidence: []
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
    kind: "answered",
    reason: "",
    evidence: scored.filter((entry) => entry.hits > 0).slice(0, 5)
  };
}

export function buildAvatarPromptQuestion(
  transcript: Array<{ role: "user" | "assistant"; contentMd: string }>,
  question: string
) {
  if (!transcript.length) {
    return question;
  }

  const transcriptBlock = transcript
    .map((entry) => `${entry.role}: ${entry.contentMd}`)
    .join("\n\n");

  return `Session transcript:\n${transcriptBlock}\n\nCurrent user message:\n${question}`;
}
