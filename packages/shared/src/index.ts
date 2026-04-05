import { z } from "zod";

export const privacyLevels = [
  "L0_SELF",
  "L1_LOCAL_AI",
  "L2_INVITED",
  "L3_PUBLIC",
  "L4_AGENT_ONLY"
] as const;

export const workspaceTypes = [
  "personal",
  "work",
  "project"
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

export const visaBundleStatuses = [
  "active",
  "revoked",
  "expired"
] as const;

export const visaAccessTypes = [
  "human_view",
  "machine_download",
  "feedback_submit"
] as const;

export const visaAccessResults = [
  "succeeded",
  "denied"
] as const;

export const visaFeedbackTypes = [
  "question",
  "feedback",
  "collaboration_intent"
] as const;

export const visaFeedbackStatuses = [
  "pending_review",
  "accepted",
  "ignored"
] as const;

export const avatarStatuses = [
  "active",
  "paused"
] as const;

export const avatarSimulationStatuses = [
  "answered",
  "refused",
  "escalated"
] as const;

export const avatarLiveSessionStatuses = [
  "active",
  "closed"
] as const;

export const avatarLiveMessageRoles = [
  "user",
  "assistant"
] as const;

export const exportPackageStatuses = [
  "succeeded",
  "failed"
] as const;

export const capabilitySignalStatuses = [
  "pending_review",
  "accepted",
  "rejected"
] as const;

export const mistakePatternStatuses = [
  "pending_review",
  "accepted",
  "rejected"
] as const;

export const focusCardStatuses = [
  "active",
  "archived"
] as const;

export const grantAccessLevels = [
  "passport_read",
  "topic_read",
  "writeback_candidate"
] as const;

export const objectPolicyObjectTypes = [
  "passport_snapshot",
  "visa_bundle",
  "agent_pack_snapshot",
  "avatar_profile",
  "export_package"
] as const;

export const sourceTypeSchema = z.enum(sourceTypes);
export const privacyLevelSchema = z.enum(privacyLevels);
export const workspaceTypeSchema = z.enum(workspaceTypes);
export const sourceStatusSchema = z.enum(sourceStatuses);
export const nodeTypeSchema = z.enum(nodeTypes);
export const nodeStatusSchema = z.enum(nodeStatuses);
export const reviewActionSchema = z.enum(reviewActions);
export const jobTypeSchema = z.enum(jobTypes);
export const jobStatusSchema = z.enum(jobStatuses);
export const postcardTypeSchema = z.enum(postcardTypes);
export const outputTypeSchema = z.enum(outputTypes);
export const citationKindSchema = z.enum(citationKinds);
export const visaBundleStatusSchema = z.enum(visaBundleStatuses);
export const visaAccessTypeSchema = z.enum(visaAccessTypes);
export const visaAccessResultSchema = z.enum(visaAccessResults);
export const visaFeedbackTypeSchema = z.enum(visaFeedbackTypes);
export const visaFeedbackStatusSchema = z.enum(visaFeedbackStatuses);
export const avatarStatusSchema = z.enum(avatarStatuses);
export const avatarSimulationStatusSchema = z.enum(avatarSimulationStatuses);
export const avatarLiveSessionStatusSchema = z.enum(avatarLiveSessionStatuses);
export const avatarLiveMessageRoleSchema = z.enum(avatarLiveMessageRoles);
export const exportPackageStatusSchema = z.enum(exportPackageStatuses);
export const capabilitySignalStatusSchema = z.enum(capabilitySignalStatuses);
export const mistakePatternStatusSchema = z.enum(mistakePatternStatuses);
export const focusCardStatusSchema = z.enum(focusCardStatuses);
export const grantAccessLevelSchema = z.enum(grantAccessLevels);
export const objectPolicyObjectTypeSchema = z.enum(objectPolicyObjectTypes);

export const workspaceCreateSchema = z.object({
  title: z.string().min(1),
  workspaceType: workspaceTypeSchema.default("personal")
});

export const importPayloadSchema = z.object({
  type: sourceTypeSchema,
  title: z.string().min(1),
  originUrl: z.string().url().optional(),
  workspaceId: z.string().optional(),
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
  workspaceId: z.string().optional(),
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
  workspaceId: z.string().optional(),
  claim: z.string().min(1),
  evidenceSummary: z.string().min(1),
  userView: z.string().min(1),
  relatedNodeIds: z.array(z.string()).default([]),
  relatedSourceIds: z.array(z.string()).default([]),
  privacyLevel: privacyLevelSchema.default("L1_LOCAL_AI")
});

export const passportGenerateSchema = z.object({
  title: z.string().default("Knowledge Passport"),
  workspaceId: z.string().optional(),
  includeNodeIds: z.array(z.string()).default([]),
  includePostcardIds: z.array(z.string()).default([]),
  privacyFloor: privacyLevelSchema.default("L1_LOCAL_AI")
});

export const capabilitySignalCreateSchema = z.object({
  workspaceId: z.string().min(1),
  topic: z.string().min(1),
  observedPractice: z.string().min(1),
  currentGaps: z.string().min(1),
  confidence: z.number().min(0).max(1).default(0.5),
  evidenceNodeIds: z.array(z.string()).default([]),
  evidenceFragmentIds: z.array(z.string()).default([]),
  status: capabilitySignalStatusSchema.default("pending_review")
});

export const mistakePatternCreateSchema = z.object({
  workspaceId: z.string().min(1),
  topic: z.string().min(1),
  description: z.string().min(1),
  fixSuggestions: z.string().min(1),
  recurrenceCount: z.number().int().positive().default(1),
  exampleNodeIds: z.array(z.string()).default([]),
  exampleFragmentIds: z.array(z.string()).default([]),
  privacyLevel: privacyLevelSchema.default("L1_LOCAL_AI"),
  status: mistakePatternStatusSchema.default("pending_review")
});

export const focusCardCreateSchema = z.object({
  workspaceId: z.string().min(1),
  title: z.string().min(1),
  goal: z.string().min(1),
  timeframe: z.string().default(""),
  priority: z.string().default("medium"),
  successCriteria: z.string().default(""),
  relatedTopics: z.array(z.string()).default([]),
  status: focusCardStatusSchema.default("active")
});

export const visaRedactionSchema = z.object({
  hideOriginUrls: z.boolean().default(false),
  hideSourcePaths: z.boolean().default(false),
  hideRawSourceIds: z.boolean().default(false)
});

export const visaBundleCreateSchema = z.object({
  title: z.string().min(1),
  passportId: z.string().optional(),
  includeNodeIds: z.array(z.string()).default([]),
  includePostcardIds: z.array(z.string()).default([]),
  privacyFloor: privacyLevelSchema.default("L1_LOCAL_AI"),
  audienceLabel: z.string().min(1).default("General audience"),
  description: z.string().default(""),
  purpose: z.string().default(""),
  expiresAt: z.string().datetime().optional(),
  maxAccessCount: z.number().int().positive().optional(),
  maxMachineDownloads: z.number().int().positive().optional(),
  allowMachineDownload: z.boolean().default(true),
  redaction: visaRedactionSchema.default({
    hideOriginUrls: false,
    hideSourcePaths: false,
    hideRawSourceIds: false
  })
});

export const visaFeedbackCreateSchema = z.object({
  feedbackType: visaFeedbackTypeSchema.default("feedback"),
  message: z.string().min(1).max(2000),
  visitorLabel: z.string().max(120).optional()
});

export const visaFeedbackReviewSchema = z.object({
  status: visaFeedbackStatusSchema
});

export const grantCreateSchema = z.object({
  objectType: z.string().min(1),
  objectId: z.string().min(1),
  granteeType: z.string().min(1),
  granteeId: z.string().min(1).optional(),
  accessLevel: grantAccessLevelSchema,
  expiresAt: z.string().datetime().optional(),
  redactionRules: z.record(z.string(), z.unknown()).default({}),
  notes: z.string().default("")
});

export const agentPackCreateSchema = z.object({
  title: z.string().min(1),
  passportId: z.string().optional(),
  visaId: z.string().optional(),
  includeNodeIds: z.array(z.string()).default([]),
  includePostcardIds: z.array(z.string()).default([]),
  privacyFloor: privacyLevelSchema.default("L1_LOCAL_AI")
});

export const avatarEscalationRulesSchema = z.object({
  escalateOnForbiddenTopic: z.boolean().default(true),
  escalateOnInsufficientEvidence: z.boolean().default(true),
  escalateOnOutOfScope: z.boolean().default(true)
});

export const avatarProfileCreateSchema = z.object({
  title: z.string().min(1),
  activePackId: z.string().min(1),
  intro: z.string().default(""),
  toneRules: z.array(z.string()).default([]),
  forbiddenTopics: z.array(z.string()).default([]),
  escalationRules: avatarEscalationRulesSchema.default({
    escalateOnForbiddenTopic: true,
    escalateOnInsufficientEvidence: true,
    escalateOnOutOfScope: true
  }),
  status: avatarStatusSchema.default("active")
});

export const avatarProfileUpdateSchema = z.object({
  activePackId: z.string().min(1).optional(),
  intro: z.string().optional(),
  toneRules: z.array(z.string()).optional(),
  forbiddenTopics: z.array(z.string()).optional(),
  escalationRules: avatarEscalationRulesSchema.optional()
});

export const avatarSimulationInputSchema = z.object({
  question: z.string().min(1)
});

export const avatarStatusUpdateSchema = z.object({
  status: avatarStatusSchema
});

export const avatarLiveSessionCreateSchema = z.object({
  title: z.string().default("")
});

export const avatarLiveMessageCreateSchema = z.object({
  contentMd: z.string().min(1)
});

export const avatarLiveSessionStatusUpdateSchema = z.object({
  status: avatarLiveSessionStatusSchema
});

export const agentPackExportCreateSchema = z.object({
  agentPackId: z.string().min(1),
  avatarProfileId: z.string().optional(),
  includeAvatarProfile: z.boolean().default(false)
});

export const objectPolicyUpsertSchema = z.object({
  objectType: objectPolicyObjectTypeSchema,
  objectId: z.string().min(1),
  privacyFloorOverride: privacyLevelSchema.optional(),
  allowSecretLinks: z.boolean().optional(),
  allowMachineAccess: z.boolean().optional(),
  allowExports: z.boolean().optional(),
  allowAvatarBinding: z.boolean().optional(),
  allowAvatarSimulation: z.boolean().optional(),
  notes: z.string().default("")
});

export const backupCreateSchema = z.object({
  note: z.string().default("manual_backup")
});

export const backupRestoreSchema = z.object({
  backupId: z.string().min(1),
  targetDir: z.string().optional()
});

export type PrivacyLevel = z.infer<typeof privacyLevelSchema>;
export type WorkspaceType = z.infer<typeof workspaceTypeSchema>;
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
export type VisaBundleStatus = z.infer<typeof visaBundleStatusSchema>;
export type VisaAccessType = z.infer<typeof visaAccessTypeSchema>;
export type VisaAccessResult = z.infer<typeof visaAccessResultSchema>;
export type VisaFeedbackType = z.infer<typeof visaFeedbackTypeSchema>;
export type VisaFeedbackStatus = z.infer<typeof visaFeedbackStatusSchema>;
export type AvatarStatus = z.infer<typeof avatarStatusSchema>;
export type AvatarSimulationStatus = z.infer<typeof avatarSimulationStatusSchema>;
export type AvatarLiveSessionStatus = z.infer<typeof avatarLiveSessionStatusSchema>;
export type AvatarLiveMessageRole = z.infer<typeof avatarLiveMessageRoleSchema>;
export type ExportPackageStatus = z.infer<typeof exportPackageStatusSchema>;
export type CapabilitySignalStatus = z.infer<typeof capabilitySignalStatusSchema>;
export type MistakePatternStatus = z.infer<typeof mistakePatternStatusSchema>;
export type FocusCardStatus = z.infer<typeof focusCardStatusSchema>;
export type GrantAccessLevel = z.infer<typeof grantAccessLevelSchema>;
export type ObjectPolicyObjectType = z.infer<typeof objectPolicyObjectTypeSchema>;
export type WorkspaceCreateInput = z.infer<typeof workspaceCreateSchema>;
export type ImportPayload = z.infer<typeof importPayloadSchema>;
export type ResearchQuery = z.infer<typeof researchQuerySchema>;
export type OutputCreateInput = z.infer<typeof outputCreateSchema>;
export type PostcardCreateInput = z.infer<typeof postcardCreateSchema>;
export type PassportGenerateInput = z.infer<typeof passportGenerateSchema>;
export type CapabilitySignalCreateInput = z.infer<typeof capabilitySignalCreateSchema>;
export type MistakePatternCreateInput = z.infer<typeof mistakePatternCreateSchema>;
export type FocusCardCreateInput = z.infer<typeof focusCardCreateSchema>;
export type VisaRedactionConfig = z.infer<typeof visaRedactionSchema>;
export type VisaBundleCreateInput = z.infer<typeof visaBundleCreateSchema>;
export type VisaFeedbackCreateInput = z.infer<typeof visaFeedbackCreateSchema>;
export type VisaFeedbackReviewInput = z.infer<typeof visaFeedbackReviewSchema>;
export type GrantCreateInput = z.input<typeof grantCreateSchema>;
export type AgentPackCreateInput = z.infer<typeof agentPackCreateSchema>;
export type AvatarEscalationRules = z.infer<typeof avatarEscalationRulesSchema>;
export type AvatarProfileCreateInput = z.infer<typeof avatarProfileCreateSchema>;
export type AvatarProfileUpdateInput = z.infer<typeof avatarProfileUpdateSchema>;
export type AvatarSimulationInput = z.infer<typeof avatarSimulationInputSchema>;
export type AvatarLiveSessionCreateInput = z.infer<typeof avatarLiveSessionCreateSchema>;
export type AvatarLiveMessageCreateInput = z.infer<typeof avatarLiveMessageCreateSchema>;
export type AgentPackExportCreateInput = z.infer<typeof agentPackExportCreateSchema>;
export type ObjectPolicyUpsertInput = z.infer<typeof objectPolicyUpsertSchema>;
export type BackupCreateInput = z.infer<typeof backupCreateSchema>;
export type BackupRestoreInput = z.infer<typeof backupRestoreSchema>;

export type WorkspaceRecord = {
  id: string;
  title: string;
  workspaceType: WorkspaceType;
  createdAt: string;
  updatedAt: string;
};

export type CapabilitySignal = {
  id: string;
  workspaceId: string;
  topic: string;
  observedPractice: string;
  currentGaps: string;
  confidence: number;
  evidenceNodeIds: string[];
  evidenceFragmentIds: string[];
  status: CapabilitySignalStatus;
  createdAt: string;
  updatedAt: string;
};

export type MistakePattern = {
  id: string;
  workspaceId: string;
  topic: string;
  description: string;
  fixSuggestions: string;
  recurrenceCount: number;
  exampleNodeIds: string[];
  exampleFragmentIds: string[];
  privacyLevel: PrivacyLevel;
  status: MistakePatternStatus;
  createdAt: string;
  updatedAt: string;
};

export type FocusCard = {
  id: string;
  workspaceId: string;
  title: string;
  goal: string;
  timeframe: string;
  priority: string;
  successCriteria: string;
  relatedTopics: string[];
  status: FocusCardStatus;
  createdAt: string;
  updatedAt: string;
};

export type VisaBundleSummary = {
  id: string;
  title: string;
  audienceLabel: string;
  passportId: string | null;
  description: string;
  purpose: string;
  includeNodeIds: string[];
  includePostcardIds: string[];
  privacyFloor: PrivacyLevel;
  redaction: VisaRedactionConfig;
  allowMachineDownload: boolean;
  expiresAt: string | null;
  status: VisaBundleStatus;
  lastAccessedAt: string | null;
  lastMachineAccessedAt: string | null;
  accessCount: number;
  maxAccessCount: number | null;
  machineDownloadCount: number;
  maxMachineDownloads: number | null;
  pendingFeedbackCount: number;
  createdAt: string;
  updatedAt: string;
  secretPath: string;
  machinePath: string | null;
};

export type VisaBundleSnapshot = VisaBundleSummary & {
  humanMarkdown: string;
  machineManifest: Record<string, unknown>;
};

export type VisaAccessLogEntry = {
  id: string;
  visaId: string;
  accessType: VisaAccessType;
  result: VisaAccessResult;
  denialReason: string | null;
  visitorLabel: string | null;
  sessionHash: string | null;
  userAgent: string | null;
  createdAt: string;
};

export type VisaFeedbackQueueItem = {
  id: string;
  visaId: string;
  feedbackType: VisaFeedbackType;
  visitorLabel: string | null;
  message: string;
  status: VisaFeedbackStatus;
  createdAt: string;
  updatedAt: string;
};

export type AgentPackSummary = {
  id: string;
  title: string;
  sourcePassportId: string | null;
  sourceVisaId: string | null;
  includeNodeIds: string[];
  includePostcardIds: string[];
  privacyFloor: PrivacyLevel;
  createdAt: string;
};

export type AgentPackSnapshot = AgentPackSummary & {
  humanMarkdown: string;
  machineManifest: Record<string, unknown>;
};

export type AvatarProfileSummary = {
  id: string;
  title: string;
  activePackId: string;
  intro: string;
  toneRules: string[];
  forbiddenTopics: string[];
  escalationRules: AvatarEscalationRules;
  status: AvatarStatus;
  createdAt: string;
  updatedAt: string;
};

export type AvatarSimulationCitation = {
  refId: string;
  kind: "wiki_node";
  excerpt: string;
  score: number;
};

export type AvatarSimulationSession = {
  id: string;
  avatarProfileId: string;
  question: string;
  resultStatus: AvatarSimulationStatus;
  answerMd: string;
  citations: AvatarSimulationCitation[];
  reason: string;
  createdAt: string;
};

export type AvatarLiveMessage = {
  id: string;
  sessionId: string;
  role: AvatarLiveMessageRole;
  contentMd: string;
  resultStatus: AvatarSimulationStatus | null;
  citations: AvatarSimulationCitation[];
  reason: string;
  createdAt: string;
};

export type AvatarLiveSessionSummary = {
  id: string;
  avatarProfileId: string;
  title: string;
  status: AvatarLiveSessionStatus;
  createdAt: string;
  updatedAt: string;
};

export type AvatarLiveSessionSnapshot = AvatarLiveSessionSummary & {
  messages: AvatarLiveMessage[];
};

export type ExportPackageSummary = {
  id: string;
  objectType: "agent_pack_snapshot";
  objectId: string;
  title: string;
  formatVersion: string;
  filePath: string;
  bundleSha256: string;
  status: ExportPackageStatus;
  counts: {
    nodeCount: number;
    postcardCount: number;
    citationCount: number;
  };
  createdAt: string;
  updatedAt: string;
};

export type ExportPackageSnapshot = ExportPackageSummary & {
  manifest: Record<string, unknown>;
};

export type ObjectPolicyRecord = {
  id: string;
  objectType: ObjectPolicyObjectType;
  objectId: string;
  privacyFloorOverride: PrivacyLevel | null;
  allowSecretLinks: boolean | null;
  allowMachineAccess: boolean | null;
  allowExports: boolean | null;
  allowAvatarBinding: boolean | null;
  allowAvatarSimulation: boolean | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type ResolvedObjectPolicy = {
  objectType: ObjectPolicyObjectType;
  objectId: string;
  privacyFloor: PrivacyLevel | null;
  allowSecretLinks: boolean;
  allowMachineAccess: boolean;
  allowExports: boolean;
  allowAvatarBinding: boolean;
  allowAvatarSimulation: boolean;
  chain: Array<{ objectType: ObjectPolicyObjectType; objectId: string }>;
  directPolicy: ObjectPolicyRecord | null;
};
