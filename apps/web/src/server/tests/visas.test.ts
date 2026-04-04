import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import type { ModelProvider } from "@/server/providers/model-provider";
import { createAppContext } from "@/server/context";
import {
  auditLogs,
  passportSnapshots,
  postcards,
  sources,
  wikiNodes
} from "@/server/db/schema";
import { createId } from "@/server/services/common";
import { listGrants } from "@/server/services/grants";
import {
  accessVisaBundleByToken,
  createVisaBundle,
  getVisaBundleById,
  revokeVisaBundle
} from "@/server/services/visas";

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

async function seedVisaFixtures(context: ReturnType<typeof createAppContext>) {
  const sourceId = createId("src");
  const nodeId = createId("node");
  const cardId = createId("card");
  const passportId = createId("passport");

  const timestamp = new Date().toISOString();
  await context.db.insert(sources).values({
    id: sourceId,
    type: "markdown",
    title: "Visa Source",
    originUrl: "https://example.com/source",
    createdAt: timestamp,
    importedAt: timestamp,
    filePath: "/tmp/source.md",
    privacyLevel: "L2_INVITED",
    projectKey: "visa-test",
    hash: "hash",
    status: "confirmed",
    tagsJson: JSON.stringify(["visa"]),
    metadataJson: JSON.stringify({}),
    extractedText: "Source text for visa bundle"
  });

  await context.db.insert(wikiNodes).values({
    id: nodeId,
    nodeType: "summary",
    title: "Visa Node",
    summary: "Node summary",
    bodyMd: "# Visa Node\n\nNode body",
    status: "accepted",
    sourceIdsJson: JSON.stringify([sourceId]),
    tagsJson: JSON.stringify(["visa", "sharing"]),
    projectKey: "visa-test",
    privacyLevel: "L2_INVITED",
    embeddingJson: null,
    updatedAt: timestamp,
    createdAt: timestamp
  });

  await context.db.insert(postcards).values({
    id: cardId,
    cardType: "knowledge",
    title: "Visa Card",
    claim: "Visa cards package context for a specific audience.",
    evidenceSummary: "Evidence stays traceable while the bundle stays scoped.",
    userView: "This is a good shareable layer.",
    relatedNodeIdsJson: JSON.stringify([nodeId]),
    relatedSourceIdsJson: JSON.stringify([sourceId]),
    privacyLevel: "L2_INVITED",
    version: 1,
    updatedAt: timestamp,
    createdAt: timestamp
  });

  await context.db.insert(passportSnapshots).values({
    id: passportId,
    title: "Visa Passport",
    humanMarkdown: "# Visa Passport",
    machineManifestJson: JSON.stringify({ title: "Visa Passport" }),
    includeNodeIdsJson: JSON.stringify([nodeId]),
    includePostcardIdsJson: JSON.stringify([cardId]),
    privacyFloor: "L1_LOCAL_AI",
    createdAt: timestamp
  });

  return {
    sourceId,
    nodeId,
    cardId,
    passportId
  };
}

describe("visa bundles", () => {
  it("creates a visa from passport snapshot content and links a secret-link grant", async () => {
    const context = await createTestContext("akp-visa-");
    const fixture = await seedVisaFixtures(context);

    const created = await createVisaBundle(context, {
      title: "Partner Visa",
      passportId: fixture.passportId,
      includeNodeIds: [],
      includePostcardIds: [],
      privacyFloor: "L1_LOCAL_AI",
      audienceLabel: "Partner review",
      allowMachineDownload: true,
      redaction: {
        hideOriginUrls: false,
        hideSourcePaths: false,
        hideRawSourceIds: false
      }
    });

    expect(created.visaId).toMatch(/^visa_/);
    expect(created.secretPath).toContain(`/v/${created.visaId}.`);
    expect(created.machinePath).toContain(`/v/${created.visaId}.`);

    const visa = await getVisaBundleById(context, created.visaId);
    expect(visa?.passportId).toBe(fixture.passportId);
    expect(visa?.includeNodeIds).toEqual([fixture.nodeId]);
    expect(visa?.includePostcardIds).toEqual([fixture.cardId]);

    const grants = await listGrants(context, 20);
    expect(grants[0]?.objectType).toBe("visa_bundle");
    expect(grants[0]?.objectId).toBe(created.visaId);
    expect(grants[0]?.granteeType).toBe("secret_link");
    expect(grants[0]?.status).toBe("active");
  });

  it("resolves active access, rejects invalid and revoked tokens, and records audit events", async () => {
    const context = await createTestContext("akp-visa-access-");
    const fixture = await seedVisaFixtures(context);

    const created = await createVisaBundle(context, {
      title: "Access Visa",
      passportId: undefined,
      includeNodeIds: [fixture.nodeId],
      includePostcardIds: [fixture.cardId],
      privacyFloor: "L1_LOCAL_AI",
      audienceLabel: "External reviewer",
      allowMachineDownload: true,
      redaction: {
        hideOriginUrls: false,
        hideSourcePaths: false,
        hideRawSourceIds: false
      }
    });

    const token = created.secretPath.replace("/v/", "");
    const access = await accessVisaBundleByToken(context, token, "human");
    expect(access.status).toBe("active");
    if (access.status === "active") {
      expect(access.visa.lastAccessedAt).toBeTruthy();
    }

    const invalid = await accessVisaBundleByToken(context, "visa_fake.badtoken", "human");
    expect(invalid.status).toBe("invalid");

    await revokeVisaBundle(context, created.visaId);
    const revoked = await accessVisaBundleByToken(context, token, "human");
    expect(revoked.status).toBe("revoked");

    const logs = await context.db.query.auditLogs.findMany({
      where: (table, { eq }) => eq(table.objectType, "visa_bundle")
    });
    expect(logs.some((entry) => entry.actionType === "create_visa" && entry.result === "succeeded")).toBe(true);
    expect(logs.some((entry) => entry.actionType === "access_visa" && entry.result === "succeeded")).toBe(true);
    expect(logs.some((entry) => entry.actionType === "access_visa" && entry.result === "failed")).toBe(true);
    expect(logs.some((entry) => entry.actionType === "revoke_visa" && entry.result === "succeeded")).toBe(true);
  });

  it("redacts source details from the manifest and blocks machine download when disabled", async () => {
    const context = await createTestContext("akp-visa-redact-");
    const fixture = await seedVisaFixtures(context);

    const created = await createVisaBundle(context, {
      title: "Locked Visa",
      passportId: undefined,
      includeNodeIds: [fixture.nodeId],
      includePostcardIds: [fixture.cardId],
      privacyFloor: "L1_LOCAL_AI",
      audienceLabel: "Machine blocked",
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      allowMachineDownload: false,
      redaction: {
        hideOriginUrls: true,
        hideSourcePaths: true,
        hideRawSourceIds: true
      }
    });

    const visa = await getVisaBundleById(context, created.visaId);
    expect(visa?.machinePath).toBeNull();
    const manifest = visa?.machineManifest as {
      nodes: Array<{ sourceReferences: { count: number; sourceIds?: string[]; originUrls?: string[]; filePaths?: string[] } }>;
      postcards: Array<{ sourceReferences: { count: number; sourceIds?: string[]; originUrls?: string[]; filePaths?: string[] } }>;
    };
    expect(manifest.nodes[0]?.sourceReferences.count).toBe(1);
    expect(manifest.nodes[0]?.sourceReferences.sourceIds).toBeUndefined();
    expect(manifest.nodes[0]?.sourceReferences.originUrls).toBeUndefined();
    expect(manifest.nodes[0]?.sourceReferences.filePaths).toBeUndefined();
    expect(manifest.postcards[0]?.sourceReferences.sourceIds).toBeUndefined();

    const token = created.secretPath.replace("/v/", "");
    const machineAccess = await accessVisaBundleByToken(context, token, "machine");
    expect(machineAccess.status).toBe("machine_disabled");

    const logs = await context.db.query.auditLogs.findMany({
      where: (table, { eq }) => eq(table.objectType, "visa_bundle")
    });
    expect(logs.some((entry) => entry.actionType === "download_visa_machine_manifest" && entry.result === "failed")).toBe(true);
  });
});
