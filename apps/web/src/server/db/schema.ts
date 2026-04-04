import { sql } from "drizzle-orm";
import {
  integer,
  real,
  sqliteTable,
  text
} from "drizzle-orm/sqlite-core";

export const sources = sqliteTable("sources", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  originUrl: text("origin_url"),
  createdAt: text("created_at"),
  importedAt: text("imported_at").notNull(),
  filePath: text("file_path"),
  privacyLevel: text("privacy_level").notNull(),
  projectKey: text("project_key"),
  hash: text("hash").notNull(),
  status: text("status").notNull(),
  tagsJson: text("tags_json").notNull().default("[]"),
  metadataJson: text("metadata_json").notNull().default("{}"),
  extractedText: text("extracted_text"),
  errorMessage: text("error_message")
});

export const sourceAssets = sqliteTable("source_assets", {
  id: text("id").primaryKey(),
  sourceId: text("source_id").notNull().references(() => sources.id, { onDelete: "cascade" }),
  assetKind: text("asset_kind").notNull(),
  filePath: text("file_path").notNull(),
  mimeType: text("mime_type"),
  byteSize: integer("byte_size").notNull().default(0),
  sha256: text("sha256").notNull(),
  metadataJson: text("metadata_json").notNull().default("{}"),
  createdAt: text("created_at").notNull()
});

export const sourceFragments = sqliteTable("source_fragments", {
  id: text("id").primaryKey(),
  sourceId: text("source_id").notNull().references(() => sources.id, { onDelete: "cascade" }),
  fragmentIndex: integer("fragment_index").notNull(),
  text: text("text").notNull(),
  tokenCount: integer("token_count").notNull().default(0),
  embeddingJson: text("embedding_json"),
  createdAt: text("created_at").notNull()
});

export const claims = sqliteTable("claims", {
  id: text("id").primaryKey(),
  claimType: text("claim_type").notNull(),
  title: text("title").notNull(),
  statement: text("statement").notNull(),
  status: text("status").notNull(),
  confidence: real("confidence").notNull().default(0),
  sourceFragmentIdsJson: text("source_fragment_ids_json").notNull().default("[]"),
  sourceIdsJson: text("source_ids_json").notNull().default("[]"),
  nodeId: text("node_id").references(() => wikiNodes.id, { onDelete: "set null" }),
  projectKey: text("project_key"),
  tagsJson: text("tags_json").notNull().default("[]"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull()
});

export const jobs = sqliteTable("jobs", {
  id: text("id").primaryKey(),
  jobType: text("job_type").notNull(),
  status: text("status").notNull(),
  sourceId: text("source_id").references(() => sources.id, { onDelete: "cascade" }),
  payloadJson: text("payload_json").notNull().default("{}"),
  attempts: integer("attempts").notNull().default(0),
  errorMessage: text("error_message"),
  queuedAt: text("queued_at").notNull(),
  startedAt: text("started_at"),
  finishedAt: text("finished_at")
});

export const compilationRuns = sqliteTable("compilation_runs", {
  id: text("id").primaryKey(),
  sourceId: text("source_id").references(() => sources.id, { onDelete: "set null" }),
  providerName: text("provider_name").notNull(),
  status: text("status").notNull(),
  inputSummaryJson: text("input_summary_json").notNull().default("{}"),
  outputNodeIdsJson: text("output_node_ids_json").notNull().default("[]"),
  attachedNodeIdsJson: text("attached_node_ids_json").notNull().default("[]"),
  diffSummaryJson: text("diff_summary_json").notNull().default("{}"),
  errorMessage: text("error_message"),
  startedAt: text("started_at").notNull(),
  finishedAt: text("finished_at")
});

export const wikiNodes = sqliteTable("wiki_nodes", {
  id: text("id").primaryKey(),
  nodeType: text("node_type").notNull(),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  bodyMd: text("body_md").notNull(),
  status: text("status").notNull(),
  sourceIdsJson: text("source_ids_json").notNull().default("[]"),
  tagsJson: text("tags_json").notNull().default("[]"),
  projectKey: text("project_key"),
  privacyLevel: text("privacy_level").notNull(),
  embeddingJson: text("embedding_json"),
  updatedAt: text("updated_at").notNull(),
  createdAt: text("created_at").notNull()
});

export const wikiEdges = sqliteTable("wiki_edges", {
  id: text("id").primaryKey(),
  fromNodeId: text("from_node_id").notNull().references(() => wikiNodes.id, { onDelete: "cascade" }),
  toNodeId: text("to_node_id").notNull().references(() => wikiNodes.id, { onDelete: "cascade" }),
  relationType: text("relation_type").notNull(),
  weight: real("weight").notNull().default(0),
  createdAt: text("created_at").notNull()
});

export const nodeReviews = sqliteTable("node_reviews", {
  id: text("id").primaryKey(),
  nodeId: text("node_id").notNull().references(() => wikiNodes.id, { onDelete: "cascade" }),
  action: text("action").notNull(),
  actorType: text("actor_type").notNull(),
  note: text("note"),
  mergedIntoNodeId: text("merged_into_node_id"),
  createdAt: text("created_at").notNull()
});

export const postcards = sqliteTable("postcards", {
  id: text("id").primaryKey(),
  cardType: text("card_type").notNull(),
  title: text("title").notNull(),
  claim: text("claim").notNull(),
  evidenceSummary: text("evidence_summary").notNull(),
  userView: text("user_view").notNull(),
  relatedNodeIdsJson: text("related_node_ids_json").notNull().default("[]"),
  relatedSourceIdsJson: text("related_source_ids_json").notNull().default("[]"),
  privacyLevel: text("privacy_level").notNull(),
  version: integer("version").notNull().default(1),
  updatedAt: text("updated_at").notNull(),
  createdAt: text("created_at").notNull()
});

export const passportSnapshots = sqliteTable("passport_snapshots", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  humanMarkdown: text("human_markdown").notNull(),
  machineManifestJson: text("machine_manifest_json").notNull(),
  includeNodeIdsJson: text("include_node_ids_json").notNull().default("[]"),
  includePostcardIdsJson: text("include_postcard_ids_json").notNull().default("[]"),
  privacyFloor: text("privacy_floor").notNull(),
  createdAt: text("created_at").notNull()
});

export const visaBundles = sqliteTable("visa_bundles", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  audienceLabel: text("audience_label").notNull(),
  passportId: text("passport_id").references(() => passportSnapshots.id, { onDelete: "set null" }),
  description: text("description").notNull().default(""),
  purpose: text("purpose").notNull().default(""),
  humanMarkdown: text("human_markdown").notNull(),
  machineManifestJson: text("machine_manifest_json").notNull(),
  includeNodeIdsJson: text("include_node_ids_json").notNull().default("[]"),
  includePostcardIdsJson: text("include_postcard_ids_json").notNull().default("[]"),
  privacyFloor: text("privacy_floor").notNull(),
  redactionJson: text("redaction_json").notNull().default("{}"),
  allowMachineDownload: integer("allow_machine_download").notNull().default(1),
  expiresAt: text("expires_at"),
  status: text("status").notNull(),
  tokenHash: text("token_hash").notNull(),
  lastAccessedAt: text("last_accessed_at"),
  lastMachineAccessedAt: text("last_machine_accessed_at"),
  accessCount: integer("access_count").notNull().default(0),
  maxAccessCount: integer("max_access_count"),
  machineDownloadCount: integer("machine_download_count").notNull().default(0),
  maxMachineDownloads: integer("max_machine_downloads"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull()
});

export const visaAccessLogs = sqliteTable("visa_access_logs", {
  id: text("id").primaryKey(),
  visaId: text("visa_id").notNull().references(() => visaBundles.id, { onDelete: "cascade" }),
  accessType: text("access_type").notNull(),
  result: text("result").notNull(),
  denialReason: text("denial_reason"),
  visitorLabel: text("visitor_label"),
  sessionHash: text("session_hash"),
  userAgent: text("user_agent"),
  createdAt: text("created_at").notNull()
});

export const visaFeedbackQueue = sqliteTable("visa_feedback_queue", {
  id: text("id").primaryKey(),
  visaId: text("visa_id").notNull().references(() => visaBundles.id, { onDelete: "cascade" }),
  feedbackType: text("feedback_type").notNull(),
  visitorLabel: text("visitor_label"),
  message: text("message").notNull(),
  status: text("status").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull()
});

export const agentPackSnapshots = sqliteTable("agent_pack_snapshots", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  sourcePassportId: text("source_passport_id").references(() => passportSnapshots.id, { onDelete: "set null" }),
  sourceVisaId: text("source_visa_id").references(() => visaBundles.id, { onDelete: "set null" }),
  humanMarkdown: text("human_markdown").notNull(),
  machineManifestJson: text("machine_manifest_json").notNull(),
  includeNodeIdsJson: text("include_node_ids_json").notNull().default("[]"),
  includePostcardIdsJson: text("include_postcard_ids_json").notNull().default("[]"),
  privacyFloor: text("privacy_floor").notNull(),
  createdAt: text("created_at").notNull()
});

export const avatarProfiles = sqliteTable("avatar_profiles", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  activePackId: text("active_pack_id").notNull().references(() => agentPackSnapshots.id, { onDelete: "restrict" }),
  intro: text("intro").notNull().default(""),
  toneRulesJson: text("tone_rules_json").notNull().default("[]"),
  forbiddenTopicsJson: text("forbidden_topics_json").notNull().default("[]"),
  escalationRulesJson: text("escalation_rules_json").notNull().default("{}"),
  status: text("status").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull()
});

export const avatarSimulationSessions = sqliteTable("avatar_simulation_sessions", {
  id: text("id").primaryKey(),
  avatarProfileId: text("avatar_profile_id").notNull().references(() => avatarProfiles.id, { onDelete: "cascade" }),
  question: text("question").notNull(),
  resultStatus: text("result_status").notNull(),
  answerMd: text("answer_md").notNull(),
  citationsJson: text("citations_json").notNull().default("[]"),
  reason: text("reason").notNull().default(""),
  createdAt: text("created_at").notNull()
});

export const researchSessions = sqliteTable("research_sessions", {
  id: text("id").primaryKey(),
  question: text("question").notNull(),
  answerMd: text("answer_md").notNull(),
  citationsJson: text("citations_json").notNull().default("[]"),
  projectKey: text("project_key"),
  tagsJson: text("tags_json").notNull().default("[]"),
  createdAt: text("created_at").notNull()
});

export const outputs = sqliteTable("outputs", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  outputType: text("output_type").notNull(),
  promptContext: text("prompt_context").notNull().default(""),
  contentMd: text("content_md").notNull(),
  relatedSourceIdsJson: text("related_source_ids_json").notNull().default("[]"),
  relatedNodeIdsJson: text("related_node_ids_json").notNull().default("[]"),
  status: text("status").notNull(),
  createdAt: text("created_at").notNull()
});

export const citations = sqliteTable("citations", {
  id: text("id").primaryKey(),
  parentType: text("parent_type").notNull(),
  parentId: text("parent_id").notNull(),
  citationKind: text("citation_kind").notNull(),
  refId: text("ref_id").notNull(),
  excerpt: text("excerpt").notNull(),
  score: real("score").notNull().default(0),
  createdAt: text("created_at").notNull()
});

export const auditLogs = sqliteTable("audit_logs", {
  id: text("id").primaryKey(),
  actorType: text("actor_type").notNull(),
  actionType: text("action_type").notNull(),
  objectType: text("object_type").notNull(),
  objectId: text("object_id").notNull(),
  timestamp: text("timestamp").notNull(),
  result: text("result").notNull(),
  notes: text("notes").notNull().default("")
});

export const grants = sqliteTable("grants", {
  id: text("id").primaryKey(),
  objectType: text("object_type").notNull(),
  objectId: text("object_id").notNull(),
  granteeType: text("grantee_type").notNull(),
  granteeId: text("grantee_id"),
  accessLevel: text("access_level").notNull(),
  expiresAt: text("expires_at"),
  status: text("status").notNull(),
  redactionRulesJson: text("redaction_rules_json").notNull().default("{}"),
  notes: text("notes").notNull().default(""),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull()
});

export const backupRuns = sqliteTable("backup_runs", {
  id: text("id").primaryKey(),
  filePath: text("file_path").notNull(),
  manifestJson: text("manifest_json").notNull(),
  note: text("note").notNull(),
  status: text("status").notNull(),
  createdAt: text("created_at").notNull()
});

export const pendingJobsQuery = sql`
  select id from jobs
  where status = 'queued'
  order by queued_at asc
`;
