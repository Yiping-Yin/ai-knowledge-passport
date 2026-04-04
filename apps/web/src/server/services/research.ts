import { citations, researchSessions } from "@/server/db/schema";
import type { AppContext } from "@/server/context";
import type { ResearchQuery } from "@ai-knowledge-passport/shared";

import { writeAuditLog } from "./audit";
import { createId, nowIso } from "./common";
import { searchKnowledge } from "./search";

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
    "## 结论",
    "当前本地证据不足，暂时不能对这个问题给出可靠结论。",
    "",
    "## 原因",
    `- 命中的高质量证据数量不足，当前仅整理出 ${evidenceCount} 条可参考证据`,
    "- 现有材料与问题的语义重合度偏低，继续回答会放大幻觉风险",
    "",
    "## 建议下一步",
    "- 缩小问题范围，指定项目或主题后重试",
    "- 导入更直接相关的原始材料",
    "- 先在知识 IDE 中确认是否已有对应主题节点"
  ].join("\n");
}

export async function answerResearchQuery(context: AppContext, query: ResearchQuery) {
  if (!context.provider.isConfigured) {
    throw new Error("OPENAI_API_KEY is required for research queries.");
  }

  const searchResult = await searchKnowledge(context, {
    q: query.question,
    limit: query.limit,
    projectKey: query.projectKey
  });

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
      message: "当前命中的本地证据不足，回答应被视为拒答或待补材料。"
    });
  }

  if (comparisonMode && uniqueEvidenceRefs.size < 3) {
    warnings.push({
      code: "narrow_coverage",
      message: "这是一个比较类问题，但当前覆盖到的独立证据源仍然偏少。"
    });
  }

  if (selectedEvidence.filter((entry) => conflictCueCount(entry.text) > 0).length >= 2) {
    warnings.push({
      code: "conflicting_evidence",
      message: "命中的证据中存在潜在冲突或不同表述，结论应保守处理。"
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
        question: query.question,
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
