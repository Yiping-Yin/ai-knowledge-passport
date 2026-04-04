import fs from "node:fs";

import OpenAI from "openai";

import type { ModelProvider, ProviderCitation, ProviderNodeDraft } from "./model-provider";
import { extractJsonObject } from "@/server/utils/json";

type JsonRecord = Record<string, unknown>;

function toArrayOfStrings(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((entry): entry is string => typeof entry === "string").map((entry) => entry.trim()).filter(Boolean);
}

function safeJsonPrompt(instructions: string, payload: JsonRecord) {
  return `${instructions}\n\nReturn JSON only.\n\n${JSON.stringify(payload, null, 2)}`;
}

export class OpenAIProvider implements ModelProvider {
  readonly isConfigured: boolean;
  private readonly client: OpenAI | null;
  private readonly textModel: string;
  private readonly embeddingModel: string;

  constructor(options?: { apiKey?: string; textModel?: string; embeddingModel?: string }) {
    const apiKey = options?.apiKey ?? process.env.OPENAI_API_KEY;
    this.isConfigured = Boolean(apiKey);
    this.client = apiKey ? new OpenAI({ apiKey }) : null;
    this.textModel = options?.textModel ?? process.env.OPENAI_MODEL ?? "gpt-4.1-mini";
    this.embeddingModel = options?.embeddingModel ?? process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small";
  }

  private ensureClient() {
    if (!this.client) {
      throw new Error("OPENAI_API_KEY is required for AI compile, research, audio transcription and passport generation.");
    }

    return this.client;
  }

  private async jsonResponse<T>(instructions: string, payload: JsonRecord) {
    const client = this.ensureClient();
    const response = await client.responses.create({
      model: this.textModel,
      input: safeJsonPrompt(instructions, payload)
    });

    return extractJsonObject<T>(response.output_text);
  }

  async extractStructured(input: {
    title: string;
    type: "markdown" | "txt" | "pdf" | "url" | "image" | "chat" | "audio";
    text: string;
    projectKey?: string | null;
    tags: string[];
  }) {
    const response = await this.jsonResponse<{
      summary?: unknown;
      keyClaims?: unknown;
      concepts?: unknown;
      themes?: unknown;
      tags?: unknown;
    }>(
      "You are a knowledge compiler. Read the source and extract a concise summary, factual key claims, important concepts, themes and durable tags.",
      input
    );

    return {
      summary: typeof response.summary === "string" ? response.summary.trim() : "",
      keyClaims: toArrayOfStrings(response.keyClaims),
      concepts: toArrayOfStrings(response.concepts),
      themes: toArrayOfStrings(response.themes),
      tags: toArrayOfStrings(response.tags)
    };
  }

  async summarizeAndLink(input: {
    title: string;
    text: string;
    fragments: Array<{ id: string; text: string }>;
    existingNodes: Array<{ id: string; title: string; summary: string; tags: string[] }>;
    projectKey?: string | null;
    tags: string[];
    privacyLevel: "L0_SELF" | "L1_LOCAL_AI" | "L2_INVITED" | "L3_PUBLIC" | "L4_AGENT_ONLY";
    sourceId: string;
  }) {
    const response = await this.jsonResponse<{
      nodes?: unknown;
      relationHints?: unknown;
    }>(
      "You are compiling a personal wiki from user-owned materials. Produce 2-5 candidate wiki nodes. Each node must have nodeType, title, summary, bodyMd and tags. Relation hints should reference only existing node ids from the provided list.",
      input
    );

    const nodes = Array.isArray(response.nodes)
      ? response.nodes.flatMap((entry) => {
          if (!entry || typeof entry !== "object") {
            return [];
          }

          const candidate = entry as Record<string, unknown>;
          const nodeType = typeof candidate.nodeType === "string" ? candidate.nodeType : "summary";
          const title = typeof candidate.title === "string" ? candidate.title.trim() : "";
          const summary = typeof candidate.summary === "string" ? candidate.summary.trim() : "";
          const bodyMd = typeof candidate.bodyMd === "string" ? candidate.bodyMd.trim() : "";

          if (!title || !summary || !bodyMd) {
            return [];
          }

          return [
            {
              nodeType: nodeType as ProviderNodeDraft["nodeType"],
              title,
              summary,
              bodyMd,
              tags: toArrayOfStrings(candidate.tags)
            }
          ];
        })
      : [];

    const relationHints = Array.isArray(response.relationHints)
      ? response.relationHints.flatMap((entry) => {
          if (!entry || typeof entry !== "object") {
            return [];
          }
          const candidate = entry as Record<string, unknown>;
          const title = typeof candidate.title === "string" ? candidate.title.trim() : "";
          const relatedNodeId = typeof candidate.relatedNodeId === "string" ? candidate.relatedNodeId.trim() : "";
          const relationType = typeof candidate.relationType === "string" ? candidate.relationType.trim() : "related";
          const weight = typeof candidate.weight === "number" ? candidate.weight : 0.5;

          if (!title || !relatedNodeId) {
            return [];
          }

          return [
            {
              title,
              relatedNodeId,
              relationType,
              weight
            }
          ];
        })
      : [];

    return { nodes, relationHints };
  }

  async embedText(input: string[]) {
    if (!input.length) {
      return [];
    }

    const client = this.ensureClient();
    const response = await client.embeddings.create({
      model: this.embeddingModel,
      input
    });

    return response.data.map((entry) => entry.embedding);
  }

  async transcribeAudio(input: { filePath: string; mimeType?: string | null }) {
    const client = this.ensureClient();
    const transcript = await client.audio.transcriptions.create({
      file: fs.createReadStream(input.filePath),
      model: "gpt-4o-mini-transcribe"
    });

    return transcript.text.trim();
  }

  async generateAnswer(input: {
    question: string;
    evidence: Array<{ refId: string; kind: "source_fragment" | "wiki_node"; title: string; text: string }>;
  }) {
    const response = await this.jsonResponse<{
      answerMd?: unknown;
      citations?: unknown;
    }>(
      "Answer only from the provided evidence. If the evidence is insufficient, say so explicitly. Return markdown in answerMd and a citations array with refId, kind, excerpt, score.",
      input
    );

    const citations = Array.isArray(response.citations)
      ? response.citations.flatMap((entry) => {
          if (!entry || typeof entry !== "object") {
            return [];
          }

          const candidate = entry as Record<string, unknown>;
          const refId = typeof candidate.refId === "string" ? candidate.refId : "";
          const kind = candidate.kind === "wiki_node" ? "wiki_node" : "source_fragment";
          const excerpt = typeof candidate.excerpt === "string" ? candidate.excerpt : "";
          const score = typeof candidate.score === "number" ? candidate.score : 0.5;

          if (!refId || !excerpt) {
            return [];
          }

          return [
            {
              refId,
              kind,
              excerpt,
              score
            } satisfies ProviderCitation
          ];
        })
      : [];

    return {
      answerMd: typeof response.answerMd === "string" ? response.answerMd.trim() : "",
      citations
    };
  }

  async generateCard(input: {
    cardType: "knowledge" | "project" | "method" | "question";
    title: string;
    sourceMaterial: string;
  }) {
    const response = await this.jsonResponse<{
      claim?: unknown;
      evidenceSummary?: unknown;
      userView?: unknown;
    }>(
      "Generate a crisp knowledge postcard from the supplied material.",
      input
    );

    return {
      claim: typeof response.claim === "string" ? response.claim.trim() : "",
      evidenceSummary: typeof response.evidenceSummary === "string" ? response.evidenceSummary.trim() : "",
      userView: typeof response.userView === "string" ? response.userView.trim() : ""
    };
  }

  async generatePassport(input: {
    title: string;
    nodes: Array<{ title: string; summary: string; bodyMd: string; tags: string[] }>;
    postcards: Array<{ title: string; claim: string; userView: string; cardType: "knowledge" | "project" | "method" | "question" }>;
    privacyFloor: "L0_SELF" | "L1_LOCAL_AI" | "L2_INVITED" | "L3_PUBLIC" | "L4_AGENT_ONLY";
  }) {
    const response = await this.jsonResponse<{
      humanMarkdown?: unknown;
      machineManifest?: unknown;
    }>(
      "Generate a concise human-readable knowledge passport and a machine-readable manifest that captures themes, methods, evidence coverage and collaboration boundaries.",
      input
    );

    return {
      humanMarkdown: typeof response.humanMarkdown === "string" ? response.humanMarkdown.trim() : "",
      machineManifest: response.machineManifest && typeof response.machineManifest === "object"
        ? (response.machineManifest as Record<string, unknown>)
        : {}
    };
  }
}
