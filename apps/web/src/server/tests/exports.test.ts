import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import AdmZip from "adm-zip";

import type { ModelProvider } from "@/server/providers/model-provider";
import { createAppContext } from "@/server/context";
import { postcards, wikiNodes } from "@/server/db/schema";
import { createId } from "@/server/services/common";
import { createAgentPackSnapshot } from "@/server/services/agent-packs";
import { createAvatarProfile } from "@/server/services/avatars";
import {
  createAgentPackExportPackage,
  getExportPackage,
  listExportPackages,
  recordExportDownload
} from "@/server/services/exports";

import { describe, expect, it } from "vitest";

class StubProvider implements ModelProvider {
  readonly isConfigured = false;
  async extractStructured() { return { summary: "", keyClaims: [], concepts: [], themes: [], tags: [] }; }
  async summarizeAndLink() { return { nodes: [], relationHints: [] }; }
  async embedText() { return []; }
  async transcribeAudio() { return ""; }
  async generateAnswer() { return { answerMd: "", citations: [] }; }
  async generateCard() { return { claim: "", evidenceSummary: "", userView: "" }; }
  async generatePassport() { return { humanMarkdown: "", machineManifest: {} }; }
  async generateLearnerState() { return { capabilitySignals: [], mistakePatterns: [] }; }
  async generateAvatarReply() { return { answerMd: "", citations: [] }; }
}

async function createTestContext(prefix: string) {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  const dataDir = path.join(tempRoot, "data");
  await fs.mkdir(path.join(dataDir, "objects"), { recursive: true });
  await fs.mkdir(path.join(dataDir, "exports"), { recursive: true });
  await fs.mkdir(path.join(dataDir, "backups"), { recursive: true });

  return createAppContext({
    dataDir,
    databasePath: path.join(dataDir, "test.sqlite"),
    provider: new StubProvider()
  });
}

async function seedExportFixtures(context: ReturnType<typeof createAppContext>) {
  const nodeId = createId("node");
  const cardId = createId("card");
  const timestamp = new Date().toISOString();

  await context.db.insert(wikiNodes).values({
    id: nodeId,
    nodeType: "summary",
    title: "Agent Pack Node",
    workspaceId: "ws_personal",
    summary: "Node summary",
    bodyMd: "Node body markdown",
    status: "accepted",
    sourceIdsJson: JSON.stringify(["src_alpha"]),
    tagsJson: JSON.stringify(["agent", "export"]),
    projectKey: "atlas",
    privacyLevel: "L1_LOCAL_AI",
    embeddingJson: null,
    updatedAt: timestamp,
    createdAt: timestamp
  });

  await context.db.insert(postcards).values({
    id: cardId,
    cardType: "knowledge",
    title: "Agent Pack Card",
    workspaceId: "ws_personal",
    claim: "Cards capture shareable knowledge claims.",
    evidenceSummary: "Backed by accepted nodes.",
    userView: "A compact governed expression layer.",
    relatedNodeIdsJson: JSON.stringify([nodeId]),
    relatedSourceIdsJson: JSON.stringify(["src_alpha"]),
    privacyLevel: "L1_LOCAL_AI",
    version: 1,
    updatedAt: timestamp,
    createdAt: timestamp
  });

  const pack = await createAgentPackSnapshot(context, {
    title: "Exportable Pack",
    passportId: undefined,
    visaId: undefined,
    includeNodeIds: [nodeId],
    includePostcardIds: [cardId],
    privacyFloor: "L1_LOCAL_AI"
  });

  const avatar = await createAvatarProfile(context, {
    title: "Export Avatar",
    activePackId: pack.packId,
    intro: "You are a governed export avatar.",
    toneRules: ["calm", "evidence-first"],
    forbiddenTopics: ["pricing"],
    escalationRules: {
      escalateOnForbiddenTopic: true,
      escalateOnInsufficientEvidence: true,
      escalateOnOutOfScope: true
    },
    status: "active"
  });

  return {
    packId: pack.packId,
    avatarId: avatar.avatarId
  };
}

describe("export packages", () => {
  it("creates a zip bundle from an agent pack and persists the export record", async () => {
    const context = await createTestContext("akp-export-");
    const fixture = await seedExportFixtures(context);

    const created = await createAgentPackExportPackage(context, {
      agentPackId: fixture.packId,
      avatarProfileId: fixture.avatarId,
      includeAvatarProfile: true
    });

    const exportPackage = await getExportPackage(context, created.exportId);
    expect(exportPackage?.objectType).toBe("agent_pack_snapshot");
    expect(exportPackage?.objectId).toBe(fixture.packId);
    expect(exportPackage?.formatVersion).toBe("agent-pack-export/v1");

    const allPackages = await listExportPackages(context, 20);
    expect(allPackages[0]?.id).toBe(created.exportId);
    expect(allPackages[0]?.counts.nodeCount).toBe(1);
    expect(allPackages[0]?.counts.postcardCount).toBe(1);
    expect(allPackages[0]?.bundleSha256.length).toBeGreaterThan(20);
  });

  it("writes the expected zip contents without raw source or fragment corpora", async () => {
    const context = await createTestContext("akp-export-zip-");
    const fixture = await seedExportFixtures(context);

    const created = await createAgentPackExportPackage(context, {
      agentPackId: fixture.packId,
      avatarProfileId: fixture.avatarId,
      includeAvatarProfile: true
    });

    const exportPackage = await getExportPackage(context, created.exportId);
    if (!exportPackage) {
      throw new Error("Expected export package");
    }

    const zip = new AdmZip(exportPackage.filePath);
    const entryNames = zip.getEntries().map((entry) => entry.entryName).sort();

    expect(entryNames).toEqual([
      "README.md",
      "agent-pack.json",
      "avatar-profile.json",
      "citations.json",
      "manifest.json",
      "nodes.json",
      "postcards.json"
    ]);

    const manifest = JSON.parse(zip.readAsText("manifest.json")) as {
      boundaries: { evidenceLevel: string };
      counts: { nodeCount: number; postcardCount: number; citationCount: number };
    };
    expect(manifest.boundaries.evidenceLevel).toBe("node_card");
    expect(manifest.counts.nodeCount).toBe(1);
    expect(manifest.counts.postcardCount).toBe(1);

    const nodesJson = zip.readAsText("nodes.json");
    expect(nodesJson).toContain("Node body markdown");
    expect(nodesJson).not.toContain("raw source fulltext");
    expect(entryNames.some((name) => name.includes("source_fragments"))).toBe(false);
  });

  it("rejects avatar attachment when the selected profile does not point at the selected pack", async () => {
    const context = await createTestContext("akp-export-avatar-");
    const fixture = await seedExportFixtures(context);
    const otherPack = await createAgentPackSnapshot(context, {
      title: "Other Pack",
      passportId: undefined,
      visaId: undefined,
      includeNodeIds: [],
      includePostcardIds: [],
      privacyFloor: "L1_LOCAL_AI"
    }).catch(() => null);

    const fallbackPack = otherPack?.packId ?? fixture.packId;
    if (fallbackPack === fixture.packId) {
      const extraNodeId = createId("node");
      const timestamp = new Date().toISOString();
      await context.db.insert(wikiNodes).values({
        id: extraNodeId,
        nodeType: "summary",
        title: "Second Node",
        workspaceId: "ws_personal",
        summary: "Second summary",
        bodyMd: "Second body",
        status: "accepted",
        sourceIdsJson: JSON.stringify([]),
        tagsJson: JSON.stringify(["second"]),
        projectKey: "atlas",
        privacyLevel: "L1_LOCAL_AI",
        embeddingJson: null,
        updatedAt: timestamp,
        createdAt: timestamp
      });
      const pack = await createAgentPackSnapshot(context, {
        title: "Other Pack",
        passportId: undefined,
        visaId: undefined,
        includeNodeIds: [extraNodeId],
        includePostcardIds: [],
        privacyFloor: "L1_LOCAL_AI"
      });

      await expect(
        createAgentPackExportPackage(context, {
          agentPackId: pack.packId,
          avatarProfileId: fixture.avatarId,
          includeAvatarProfile: true
        })
      ).rejects.toThrow("Avatar profile must point at the selected agent pack.");
      return;
    }

    await expect(
      createAgentPackExportPackage(context, {
        agentPackId: fallbackPack,
        avatarProfileId: fixture.avatarId,
        includeAvatarProfile: true
      })
    ).rejects.toThrow("Avatar profile must point at the selected agent pack.");
  });

  it("records audit logs when a bundle is downloaded", async () => {
    const context = await createTestContext("akp-export-download-");
    const fixture = await seedExportFixtures(context);

    const created = await createAgentPackExportPackage(context, {
      agentPackId: fixture.packId,
      includeAvatarProfile: false
    });

    const exportPackage = await recordExportDownload(context, created.exportId);
    expect(exportPackage.id).toBe(created.exportId);

    const auditLogs = await context.db.query.auditLogs.findMany({
      where: (table, { eq }) => eq(table.objectType, "export_package")
    });
    expect(auditLogs.some((entry) => entry.actionType === "create_export_package")).toBe(true);
    expect(auditLogs.some((entry) => entry.actionType === "download_export_package")).toBe(true);
  });
});
