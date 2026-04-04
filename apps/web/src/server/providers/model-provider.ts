import type {
  NodeType,
  PostcardType,
  PrivacyLevel,
  SourceType
} from "@ai-knowledge-passport/shared";

export type ProviderNodeDraft = {
  nodeType: NodeType;
  title: string;
  summary: string;
  bodyMd: string;
  tags: string[];
};

export type ProviderCitation = {
  refId: string;
  kind: "source_fragment" | "wiki_node" | "output";
  excerpt: string;
  score: number;
};

export interface ModelProvider {
  readonly isConfigured: boolean;
  extractStructured(input: {
    title: string;
    type: SourceType;
    text: string;
    projectKey?: string | null;
    tags: string[];
  }): Promise<{
    summary: string;
    keyClaims: string[];
    concepts: string[];
    themes: string[];
    tags: string[];
  }>;
  summarizeAndLink(input: {
    title: string;
    text: string;
    fragments: Array<{ id: string; text: string }>;
    existingNodes: Array<{ id: string; title: string; summary: string; tags: string[] }>;
    projectKey?: string | null;
    tags: string[];
    privacyLevel: PrivacyLevel;
    sourceId: string;
  }): Promise<{
    nodes: ProviderNodeDraft[];
    relationHints: Array<{ title: string; relatedNodeId: string; relationType: string; weight: number }>;
  }>;
  embedText(input: string[]): Promise<number[][]>;
  transcribeAudio(input: { filePath: string; mimeType?: string | null }): Promise<string>;
  generateAnswer(input: {
    question: string;
    evidence: Array<{ refId: string; kind: "source_fragment" | "wiki_node"; title: string; text: string }>;
  }): Promise<{
    answerMd: string;
    citations: ProviderCitation[];
  }>;
  generateCard(input: {
    cardType: PostcardType;
    title: string;
    sourceMaterial: string;
  }): Promise<{
    claim: string;
    evidenceSummary: string;
    userView: string;
  }>;
  generatePassport(input: {
    title: string;
    nodes: Array<{ title: string; summary: string; bodyMd: string; tags: string[] }>;
    postcards: Array<{ title: string; claim: string; userView: string; cardType: PostcardType }>;
    privacyFloor: PrivacyLevel;
  }): Promise<{
    humanMarkdown: string;
    machineManifest: Record<string, unknown>;
  }>;
}
