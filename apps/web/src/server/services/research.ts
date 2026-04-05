import { citations, researchSessions } from "@/server/db/schema";
import type { AppContext } from "@/server/context";
import type { ResearchQuery } from "@ai-knowledge-passport/shared";

import { writeAuditLog } from "./audit";
import { createId, nowIso } from "./common";
import { getActiveFocusCard } from "./focus-cards";
import { searchKnowledge } from "./search";
import { listCapabilitySignals, listMistakePatterns } from "./signals";
import { defaultWorkspaceId } from "./workspaces";

type ResearchWarning = {
  code: "insufficient_evidence" | "conflicting_evidence" | "narrow_coverage";
  message: string;
};

function isComparisonQuestion(question: string) {
  return /比较|对比|区别|差异|不同|vs\b|versus|compare/i.test(question);
}

function conflictCueCount(text: string) {
  const cues = ["但是", "然而", "不过", "相反", "矛盾", "冲突", "but", "however", "whereas", "instead", "conflict"];
  const normalized = text.toLowerCase();
  return cues.reduce((count, cue) => count + (normalized.includes(cue.toLowerCase()) ? 1 : 0), 0);
}

function summarizeWeakEvidence(question: string, evidenceCount: number) {
  return [
    "## Conclusion",
    "Current local evidence is insufficient to support a reliable answer.",
    "",
    "## Why",
    `- Only ${evidenceCount} high-signal evidence item(s) were selected from the local corpus`,
    "- The overlap between the available material and the question is too weak to justify a confident answer",
    "",
    "## Suggested Next Step",
    "- Narrow the question and retry with a specific project or topic",
    "- Import more directly relevant source material",
    "- Check in the Knowledge view whether a matching topic node already exists"
  ].join("\n");
}

export async function answerResearchQuery(context: AppContext, query: ResearchQuery) {
  if (!context.provider.isConfigured) {
    throw new Error("OPENAI_API_KEY is required for research queries.");
  }

  const searchResult = await searchKnowledge(context, {
    q: query.question,
    limit: query.limit,
    projectKey: query.projectKey,
    workspaceId: query.workspaceId
  });

  const workspaceId = query.workspaceId ?? defaultWorkspaceId;
  const [activeFocusCard, acceptedSignals, acceptedMistakes] = await Promise.all([
    getActiveFocusCard(context, workspaceId),
    listCapabilitySignals(context, { workspaceId, status: "accepted", limit: 4 }),
    listMistakePatterns(context, { workspaceId, status: "accepted", limit: 4 })
  ]);

  const fragmentEvidence = searchResult.fragments.map((fragment) => ({
    refId: fragment.id,
    kind: "source_fragment" as const,
    title: fragment.sourceTitle,
    text: fragment.text,
    score: fragment.score,
    retrievalKind: fragment.retrievalKind
  }));

  const nodeEvidence = searchResult.nodes.map((node) => ({
    refId: node.id,
    kind: "wiki_node" as const,
    title: node.title,
    text: `${node.summary}\n\n${node.body}`,
    score: node.score,
    retrievalKind: node.retrievalKind
  }));

  const evidencePool = [...fragmentEvidence, ...nodeEvidence]
    .sort((left, right) => right.score - left.score);

  const selectedEvidence: typeof evidencePool = [];
  const seenRefs = new Set<string>();
  for (const candidate of evidencePool) {
    if (selectedEvidence.length >= query.limit) {
      break;
    }
    if (seenRefs.has(candidate.refId)) {
      continue;
    }
    selectedEvidence.push(candidate);
    seenRefs.add(candidate.refId);
  }

  const evidence = selectedEvidence.map((entry) => ({
    refId: entry.refId,
    kind: entry.kind,
    title: entry.title,
    text: entry.text
  }));

  const uniqueEvidenceRefs = new Set(selectedEvidence.map((entry) => `${entry.kind}:${entry.refId}`));
  const topScore = selectedEvidence[0]?.score ?? 0;
  const comparisonMode = isComparisonQuestion(query.question);
  const warnings: ResearchWarning[] = [];

  if (selectedEvidence.length < 2 || topScore < 0.18 || (comparisonMode && uniqueEvidenceRefs.size < 2)) {
    warnings.push({
      code: "insufficient_evidence",
      message: "The currently retrieved local evidence is too weak, so the answer should be treated as a refusal or a request for more material."
    });
  }

  if (comparisonMode && uniqueEvidenceRefs.size < 3) {
    warnings.push({
      code: "narrow_coverage",
      message: "This is a comparison-style question, but the current evidence set still covers too few independent references."
    });
  }

  if (selectedEvidence.filter((entry) => conflictCueCount(entry.text) > 0).length >= 2) {
    warnings.push({
      code: "conflicting_evidence",
      message: "The matched evidence includes potentially conflicting or divergent statements, so the conclusion should stay conservative."
    });
  }

  const answer = warnings.some((warning) => warning.code === "insufficient_evidence")
    ? {
        answerMd: summarizeWeakEvidence(query.question, selectedEvidence.length),
        citations: selectedEvidence.slice(0, 2).map((entry) => ({
          refId: entry.refId,
          kind: entry.kind,
          excerpt: entry.text.slice(0, 140),
          score: entry.score
        }))
      }
    : await context.provider.generateAnswer({
        question: [
          activeFocusCard
            ? `Active focus:\n- ${activeFocusCard.title}\n- Goal: ${activeFocusCard.goal}\n- Timeframe: ${activeFocusCard.timeframe}\n- Priority: ${activeFocusCard.priority}`
            : "",
          acceptedSignals.length
            ? `Capability signals:\n${acceptedSignals.map((signal) => `- ${signal.topic}: ${signal.observedPractice} | Gaps: ${signal.currentGaps}`).join("\n")}`
            : "",
          acceptedMistakes.length
            ? `Mistake patterns:\n${acceptedMistakes.map((mistake) => `- ${mistake.topic}: ${mistake.description}`).join("\n")}`
            : "",
          `User question:\n${query.question}`
        ].filter(Boolean).join("\n\n"),
        evidence
      });

  const sessionId = createId("research");
  await context.db.insert(researchSessions).values({
    id: sessionId,
    question: query.question,
    answerMd: answer.answerMd,
    citationsJson: JSON.stringify(answer.citations),
    projectKey: query.projectKey ?? null,
    tagsJson: JSON.stringify(query.tags),
    createdAt: nowIso()
  });

  for (const citation of answer.citations) {
    await context.db.insert(citations).values({
      id: createId("cite"),
      parentType: "research_session",
      parentId: sessionId,
      citationKind: citation.kind,
      refId: citation.refId,
      excerpt: citation.excerpt,
      score: citation.score,
      createdAt: nowIso()
    });
  }

  const auditId = await writeAuditLog(context, {
    actionType: "research_query",
    objectType: "research_session",
    objectId: sessionId,
    result: "succeeded",
    notes: query.question
  });

  return {
    sessionId,
    answerMd: answer.answerMd,
    citations: answer.citations,
    warnings,
    retrievalSummary: {
      selectedEvidenceCount: selectedEvidence.length,
      uniqueEvidenceRefs: uniqueEvidenceRefs.size,
      fragmentCount: searchResult.fragments.length,
      nodeCount: searchResult.nodes.length,
      topScore
    },
    auditId
  };
}
