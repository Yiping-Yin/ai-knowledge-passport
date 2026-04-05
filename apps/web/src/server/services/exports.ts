import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import AdmZip from "adm-zip";
import { desc, eq } from "drizzle-orm";

import type {
  AgentPackExportCreateInput,
  ExportPackageSnapshot,
  ExportPackageSummary
} from "@ai-knowledge-passport/shared";

import type { AppContext } from "@/server/context";
import {
  avatarProfiles,
  exportPackages,
  postcards,
  wikiNodes
} from "@/server/db/schema";

import { writeAuditLog } from "./audit";
import { getAgentPackSnapshot } from "./agent-packs";
import { createId, nowIso, parseJsonArray } from "./common";
import { getAvatarProfile } from "./avatars";
import { assertPolicyAllows } from "./policies";

const FORMAT_VERSION = "agent-pack-export/v1";

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "export";
}

async function fileSha256(filePath: string) {
  const buffer = await fs.readFile(filePath);
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

async function resolveExportData(
  context: AppContext,
  input: AgentPackExportCreateInput
) {
  const pack = await getAgentPackSnapshot(context, input.agentPackId);
  if (!pack) {
    throw new Error("Agent pack snapshot not found.");
  }

  let avatar = null;
  if (input.includeAvatarProfile) {
    if (!input.avatarProfileId) {
      throw new Error("An avatar profile id is required when includeAvatarProfile=true.");
    }
    avatar = await getAvatarProfile(context, input.avatarProfileId);
    if (!avatar) {
      throw new Error("Avatar profile not found.");
    }
    if (avatar.activePackId !== pack.id) {
      throw new Error("Avatar profile must point at the selected agent pack.");
    }
  }

  const nodes = pack.includeNodeIds.length
    ? await context.db.query.wikiNodes.findMany({
        where: (table, { inArray }) => inArray(table.id, pack.includeNodeIds)
      })
    : [];
  const cards = pack.includePostcardIds.length
    ? await context.db.query.postcards.findMany({
        where: (table, { inArray }) => inArray(table.id, pack.includePostcardIds)
      })
    : [];

  const citations = {
    nodeSourceReferences: nodes.map((node) => ({
      nodeId: node.id,
      sourceIds: parseJsonArray<string>(node.sourceIdsJson)
    })),
    postcardReferences: cards.map((card) => ({
      postcardId: card.id,
      relatedNodeIds: parseJsonArray<string>(card.relatedNodeIdsJson),
      relatedSourceIds: parseJsonArray<string>(card.relatedSourceIdsJson)
    }))
  };

  return {
    pack,
    avatar,
    nodes: nodes.map((node) => ({
      id: node.id,
      title: node.title,
      summary: node.summary,
      bodyMd: node.bodyMd,
      projectKey: node.projectKey,
      tags: parseJsonArray<string>(node.tagsJson)
    })),
    postcards: cards.map((card) => ({
      id: card.id,
      title: card.title,
      claim: card.claim,
      evidenceSummary: card.evidenceSummary,
      userView: card.userView,
      cardType: card.cardType,
      relatedNodeIds: parseJsonArray<string>(card.relatedNodeIdsJson),
      relatedSourceIds: parseJsonArray<string>(card.relatedSourceIdsJson)
    })),
    citations
  };
}

function buildManifest(input: {
  exportId: string;
  objectId: string;
  title: string;
  privacyFloor: string;
  passportContext: Record<string, unknown> | null;
  includeAvatarProfile: boolean;
  avatarProfileId: string | null;
  nodeCount: number;
  postcardCount: number;
  citationCount: number;
  fileChecksums: Record<string, string>;
}) {
  return {
    bundleId: input.exportId,
    formatVersion: FORMAT_VERSION,
    objectType: "agent_pack_snapshot",
    objectId: input.objectId,
    title: input.title,
    createdAt: nowIso(),
    privacyFloor: input.privacyFloor,
    passportContext: input.passportContext,
    boundaries: {
      internalOnly: true,
      liveAgentCapable: false,
      importSupported: false,
      evidenceLevel: "node_card"
    },
    includes: {
      avatarProfile: input.includeAvatarProfile,
      avatarProfileId: input.avatarProfileId
    },
    counts: {
      nodeCount: input.nodeCount,
      postcardCount: input.postcardCount,
      citationCount: input.citationCount
    },
    checksumMetadata: {
      algorithm: "sha256",
      scope: "bundle-entries",
      files: input.fileChecksums
    }
  };
}

function bufferSha256(buffer: Buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function buildBundleReadme(input: {
  title: string;
  packId: string;
  avatarTitle: string | null;
  nodeCount: number;
  postcardCount: number;
}) {
  return [
    `# ${input.title}`,
    "",
    `Exported object: agent_pack_snapshot`,
    `Agent pack id: ${input.packId}`,
    `Attached avatar profile: ${input.avatarTitle ?? "none"}`,
    "",
    `Included nodes: ${input.nodeCount}`,
    `Included postcards: ${input.postcardCount}`,
    "",
    "This bundle is a portable internal export for cross-AI consumption.",
    "It intentionally excludes raw source fulltext and full fragment corpora."
  ].join("\n");
}

export async function createAgentPackExportPackage(context: AppContext, input: AgentPackExportCreateInput) {
  const resolved = await resolveExportData(context, input);
  await assertPolicyAllows(context, "agent_pack_snapshot", resolved.pack.id, "exports");
  if (resolved.avatar) {
    await assertPolicyAllows(context, "avatar_profile", resolved.avatar.id, "exports");
  }
  const exportId = createId("export");
  const fileName = `${slugify(resolved.pack.title)}-${exportId}.zip`;
  const filePath = path.join(context.paths.exportsDir, fileName);

  await fs.mkdir(context.paths.exportsDir, { recursive: true });

  const agentPackJson = JSON.stringify(resolved.pack, null, 2);
  const nodesJson = JSON.stringify(resolved.nodes, null, 2);
  const postcardsJson = JSON.stringify(resolved.postcards, null, 2);
  const citationsJson = JSON.stringify(resolved.citations, null, 2);
  const avatarJson = resolved.avatar ? JSON.stringify(resolved.avatar, null, 2) : null;
  const readme = buildBundleReadme({
    title: resolved.pack.title,
    packId: resolved.pack.id,
    avatarTitle: resolved.avatar?.title ?? null,
    nodeCount: resolved.nodes.length,
    postcardCount: resolved.postcards.length
  });

  const fileChecksums: Record<string, string> = {
    "README.md": bufferSha256(Buffer.from(readme, "utf8")),
    "agent-pack.json": bufferSha256(Buffer.from(agentPackJson, "utf8")),
    "nodes.json": bufferSha256(Buffer.from(nodesJson, "utf8")),
    "postcards.json": bufferSha256(Buffer.from(postcardsJson, "utf8")),
    "citations.json": bufferSha256(Buffer.from(citationsJson, "utf8"))
  };
  if (avatarJson) {
    fileChecksums["avatar-profile.json"] = bufferSha256(Buffer.from(avatarJson, "utf8"));
  }

  const manifest = buildManifest({
    exportId,
    objectId: resolved.pack.id,
    title: resolved.pack.title,
    privacyFloor: resolved.pack.privacyFloor,
    passportContext:
      resolved.pack.machineManifest && typeof resolved.pack.machineManifest === "object"
        ? ((resolved.pack.machineManifest as { passportContext?: Record<string, unknown> }).passportContext ?? null)
        : null,
    includeAvatarProfile: Boolean(resolved.avatar),
    avatarProfileId: resolved.avatar?.id ?? null,
    nodeCount: resolved.nodes.length,
    postcardCount: resolved.postcards.length,
    citationCount: resolved.citations.nodeSourceReferences.length + resolved.citations.postcardReferences.length,
    fileChecksums
  });

  const zip = new AdmZip();
  zip.addFile("manifest.json", Buffer.from(JSON.stringify(manifest, null, 2), "utf8"));
  zip.addFile("README.md", Buffer.from(readme, "utf8"));
  zip.addFile("agent-pack.json", Buffer.from(agentPackJson, "utf8"));
  zip.addFile("nodes.json", Buffer.from(nodesJson, "utf8"));
  zip.addFile("postcards.json", Buffer.from(postcardsJson, "utf8"));
  zip.addFile("citations.json", Buffer.from(citationsJson, "utf8"));
  if (avatarJson) {
    zip.addFile("avatar-profile.json", Buffer.from(avatarJson, "utf8"));
  }
  zip.writeZip(filePath);

  const bundleSha256 = await fileSha256(filePath);
  const timestamp = nowIso();
  await context.db.insert(exportPackages).values({
    id: exportId,
    objectType: "agent_pack_snapshot",
    objectId: resolved.pack.id,
    title: resolved.pack.title,
    formatVersion: FORMAT_VERSION,
    filePath,
    manifestJson: JSON.stringify(manifest),
    bundleSha256,
    status: "succeeded",
    createdAt: timestamp,
    updatedAt: timestamp
  });

  const auditId = await writeAuditLog(context, {
    actionType: "create_export_package",
    objectType: "export_package",
    objectId: exportId,
    result: "succeeded",
    notes: resolved.pack.id
  });

  return {
    exportId,
    auditId
  };
}

function parseExportSummary(row: typeof exportPackages.$inferSelect): ExportPackageSummary {
  const manifest = JSON.parse(row.manifestJson) as { counts?: { nodeCount?: number; postcardCount?: number; citationCount?: number } };
  return {
    id: row.id,
    objectType: "agent_pack_snapshot",
    objectId: row.objectId,
    title: row.title,
    formatVersion: row.formatVersion,
    filePath: row.filePath,
    bundleSha256: row.bundleSha256,
    status: row.status as ExportPackageSummary["status"],
    counts: {
      nodeCount: manifest.counts?.nodeCount ?? 0,
      postcardCount: manifest.counts?.postcardCount ?? 0,
      citationCount: manifest.counts?.citationCount ?? 0
    },
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

function parseExportSnapshot(row: typeof exportPackages.$inferSelect): ExportPackageSnapshot {
  return {
    ...parseExportSummary(row),
    manifest: JSON.parse(row.manifestJson) as Record<string, unknown>
  };
}

export async function listExportPackages(context: AppContext, limit = 80) {
  const rows = await context.db.query.exportPackages.findMany({
    orderBy: [desc(exportPackages.createdAt)],
    limit
  });
  return rows.map(parseExportSummary);
}

export async function getExportPackage(context: AppContext, exportId: string) {
  const row = await context.db.query.exportPackages.findFirst({
    where: eq(exportPackages.id, exportId)
  });
  return row ? parseExportSnapshot(row) : null;
}

export async function recordExportDownload(context: AppContext, exportId: string) {
  const exportPackage = await getExportPackage(context, exportId);
  if (!exportPackage) {
    throw new Error("Export package not found.");
  }

  await writeAuditLog(context, {
    actionType: "download_export_package",
    objectType: "export_package",
    objectId: exportId,
    result: "succeeded",
    notes: exportPackage.objectId
  });

  return exportPackage;
}
