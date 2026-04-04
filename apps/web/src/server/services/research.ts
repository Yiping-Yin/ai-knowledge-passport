import { citations, researchSessions, sourceFragments, wikiNodes } from "@/server/db/schema";
import type { AppContext } from "@/server/context";
import type { ResearchQuery } from "@ai-knowledge-passport/shared";

import { writeAuditLog } from "./audit";
import { createId, nowIso } from "./common";
import { searchKnowledge } from "./search";

export async function answerResearchQuery(context: AppContext, query: ResearchQuery) {
  if (!context.provider.isConfigured) {
    throw new Error("OPENAI_API_KEY is required for research queries.");
  }

  const searchResult = await searchKnowledge(context, {
    q: query.question,
    limit: query.limit,
    projectKey: query.projectKey
  });

  const evidence = [
    ...searchResult.fragments.map((fragment) => ({
      refId: fragment.id,
      kind: "source_fragment" as const,
      title: fragment.sourceId,
      text: fragment.text
    })),
    ...searchResult.nodes.map((node) => ({
      refId: node.id,
      kind: "wiki_node" as const,
      title: node.title,
      text: `${node.summary}\n\n${node.body}`
    }))
  ];

  if (!evidence.length) {
    throw new Error("No local evidence matched the query.");
  }

  const answer = await context.provider.generateAnswer({
    question: query.question,
    evidence
  });

  if (!answer.citations.length) {
    throw new Error("The model did not return valid citations.");
  }

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
    auditId
  };
}
