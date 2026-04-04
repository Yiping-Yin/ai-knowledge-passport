import { z } from "zod";

export const privacyLevels = [
  "L0_SELF",
  "L1_LOCAL_AI",
  "L2_INVITED",
  "L3_PUBLIC",
  "L4_AGENT_ONLY"
] as const;

export const sourceTypes = [
  "markdown",
  "txt",
  "pdf",
  "url",
  "image",
  "chat",
  "audio"
] as const;

export const sourceStatuses = [
  "pending_ingest",
  "ready_for_compile",
  "compiling",
  "review_pending",
  "confirmed",
  "failed"
] as const;

export const nodeTypes = [
  "summary",
  "concept",
  "theme",
  "project",
  "index"
] as const;

export const nodeStatuses = [
  "pending_review",
  "accepted",
  "rejected",
  "merged"
] as const;

export const reviewActions = [
  "accept",
  "reject",
  "rewrite",
  "merge"
] as const;

export const jobTypes = [
  "normalize_source",
  "compile_source",
  "generate_passport",
  "create_backup"
] as const;

export const jobStatuses = [
  "queued",
  "running",
  "succeeded",
  "failed"
] as const;

export const postcardTypes = [
  "knowledge",
  "project",
  "method",
  "question"
] as const;

export const outputTypes = [
  "markdown_memo",
  "brief",
  "outline",
  "action_list"
] as const;

export const citationKinds = [
  "source_fragment",
  "wiki_node",
  "output"
] as const;

export const sourceTypeSchema = z.enum(sourceTypes);
export const privacyLevelSchema = z.enum(privacyLevels);
export const sourceStatusSchema = z.enum(sourceStatuses);
export const nodeTypeSchema = z.enum(nodeTypes);
export const nodeStatusSchema = z.enum(nodeStatuses);
export const reviewActionSchema = z.enum(reviewActions);
export const jobTypeSchema = z.enum(jobTypes);
export const jobStatusSchema = z.enum(jobStatuses);
export const postcardTypeSchema = z.enum(postcardTypes);
export const outputTypeSchema = z.enum(outputTypes);
export const citationKindSchema = z.enum(citationKinds);

export const importPayloadSchema = z.object({
  type: sourceTypeSchema,
  title: z.string().min(1),
  originUrl: z.string().url().optional(),
  projectKey: z.string().trim().min(1).optional(),
  privacyLevel: privacyLevelSchema.default("L1_LOCAL_AI"),
  textContent: z.string().optional(),
  tags: z.array(z.string().min(1)).default([]),
  createdAt: z.string().datetime().optional(),
  metadata: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).default({})
});

export const compileRequestSchema = z.object({
  sourceId: z.string().min(1)
});

export const researchQuerySchema = z.object({
  question: z.string().min(3),
  projectKey: z.string().optional(),
  tags: z.array(z.string()).default([]),
  limit: z.number().int().positive().max(20).default(8)
});

export const outputCreateSchema = z.object({
  title: z.string().min(1),
  outputType: outputTypeSchema,
  content: z.string().min(1),
  relatedNodeIds: z.array(z.string()).default([]),
  relatedSourceIds: z.array(z.string()).default([]),
  promptContext: z.string().default(""),
  flowbackMode: z.enum(["none", "new_node", "append"]).default("none"),
  targetNodeId: z.string().optional()
});

export const postcardCreateSchema = z.object({
  title: z.string().min(1),
  cardType: postcardTypeSchema,
  claim: z.string().min(1),
  evidenceSummary: z.string().min(1),
  userView: z.string().min(1),
  relatedNodeIds: z.array(z.string()).default([]),
  relatedSourceIds: z.array(z.string()).default([]),
  privacyLevel: privacyLevelSchema.default("L1_LOCAL_AI")
});

export const passportGenerateSchema = z.object({
  title: z.string().default("Knowledge Passport"),
  includeNodeIds: z.array(z.string()).default([]),
  includePostcardIds: z.array(z.string()).default([]),
  privacyFloor: privacyLevelSchema.default("L1_LOCAL_AI")
});

export const backupCreateSchema = z.object({
  note: z.string().default("manual_backup")
});

export const backupRestoreSchema = z.object({
  backupId: z.string().min(1),
  targetDir: z.string().optional()
});

export type PrivacyLevel = z.infer<typeof privacyLevelSchema>;
export type SourceType = z.infer<typeof sourceTypeSchema>;
export type SourceStatus = z.infer<typeof sourceStatusSchema>;
export type NodeType = z.infer<typeof nodeTypeSchema>;
export type NodeStatus = z.infer<typeof nodeStatusSchema>;
export type ReviewAction = z.infer<typeof reviewActionSchema>;
export type JobType = z.infer<typeof jobTypeSchema>;
export type JobStatus = z.infer<typeof jobStatusSchema>;
export type PostcardType = z.infer<typeof postcardTypeSchema>;
export type OutputType = z.infer<typeof outputTypeSchema>;
export type CitationKind = z.infer<typeof citationKindSchema>;
export type ImportPayload = z.infer<typeof importPayloadSchema>;
export type ResearchQuery = z.infer<typeof researchQuerySchema>;
export type OutputCreateInput = z.infer<typeof outputCreateSchema>;
export type PostcardCreateInput = z.infer<typeof postcardCreateSchema>;
export type PassportGenerateInput = z.infer<typeof passportGenerateSchema>;
export type BackupCreateInput = z.infer<typeof backupCreateSchema>;
export type BackupRestoreInput = z.infer<typeof backupRestoreSchema>;
