import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import type { ModelProvider } from "@/server/providers/model-provider";
import { createAppContext } from "@/server/context";
import {
  passportSnapshots,
  postcards,
  sources,
  visaAccessLogs,
  visaFeedbackQueue,
  wikiNodes
} from "@/server/db/schema";
import { createId } from "@/server/services/common";
import { listGrants } from "@/server/services/grants";
import {
  accessVisaBundleByToken,
  createVisaBundle,
  getVisaBundleById,
  listVisaAccessLogs,
  listVisaFeedbackQueue,
  reviewVisaFeedback,
  revokeVisaBundle,
  submitVisaFeedbackByToken
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
    extractedText: "Source text for visa bundle",
    errorMessage: null
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

function baseVisaInput(fixture: Awaited<ReturnType<typeof seedVisaFixtures>>) {
  return {
    title: "Partner Visa",
    passportId: fixture.passportId,
    includeNodeIds: [],
    includePostcardIds: [],
    privacyFloor: "L1_LOCAL_AI" as const,
    audienceLabel: "Partner review",
    description: "A narrow package for an external reviewer.",
    purpose: "Review a subset of the knowledge base without broad exposure.",
    expiresAt: undefined,
    maxAccessCount: undefined,
    maxMachineDownloads: undefined,
    allowMachineDownload: true,
    redaction: {
      hideOriginUrls: false,
      hideSourcePaths: false,
      hideRawSourceIds: false
    }
  };
}

describe("visa bundles", () => {
  it("creates a visa from passport snapshot content and links a secret-link grant", async () => {
    const context = await createTestContext("akp-visa-");
    const fixture = await seedVisaFixtures(context);

    const created = await createVisaBundle(context, baseVisaInput(fixture));

    expect(created.visaId).toMatch(/^visa_/);
    expect(created.secretPath).toContain(`/v/${created.visaId}.`);
    expect(created.machinePath).toContain(`/v/${created.visaId}.`);

    const visa = await getVisaBundleById(context, created.visaId);
    expect(visa?.passportId).toBe(fixture.passportId);
    expect(visa?.includeNodeIds).toEqual([fixture.nodeId]);
    expect(visa?.includePostcardIds).toEqual([fixture.cardId]);
    expect(visa?.description).toContain("external reviewer");
    expect(visa?.purpose).toContain("subset");

    const grants = await listGrants(context, 20);
    expect(grants[0]?.objectType).toBe("visa_bundle");
    expect(grants[0]?.objectId).toBe(created.visaId);
    expect(grants[0]?.granteeType).toBe("secret_link");
    expect(grants[0]?.status).toBe("active");
  });

  it("tracks human and machine access, then denies once limits are exhausted", async () => {
    const context = await createTestContext("akp-visa-limits-");
    const fixture = await seedVisaFixtures(context);

    const created = await createVisaBundle(context, {
      ...baseVisaInput(fixture),
      passportId: undefined,
      includeNodeIds: [fixture.nodeId],
      includePostcardIds: [fixture.cardId],
      maxAccessCount: 1,
      maxMachineDownloads: 1
    });

    const token = created.secretPath.replace("/v/", "");

    const firstHuman = await accessVisaBundleByToken(context, token, "human", {
      userAgent: "test-agent",
      sessionHashSource: "session-a"
    });
    expect(firstHuman.status).toBe("active");

    const secondHuman = await accessVisaBundleByToken(context, token, "human", {
      userAgent: "test-agent",
      sessionHashSource: "session-a"
    });
    expect(secondHuman.status).toBe("human_limit_reached");

    const firstMachine = await accessVisaBundleByToken(context, token, "machine", {
      userAgent: "test-agent",
      sessionHashSource: "session-a"
    });
    expect(firstMachine.status).toBe("active");

    const secondMachine = await accessVisaBundleByToken(context, token, "machine", {
      userAgent: "test-agent",
      sessionHashSource: "session-a"
    });
    expect(secondMachine.status).toBe("machine_limit_reached");

    const visa = await getVisaBundleById(context, created.visaId);
    expect(visa?.accessCount).toBe(1);
    expect(visa?.machineDownloadCount).toBe(1);
    expect(visa?.lastAccessedAt).toBeTruthy();
    expect(visa?.lastMachineAccessedAt).toBeTruthy();

    const accessLogs = await listVisaAccessLogs(context, created.visaId, 20);
    expect(accessLogs.some((entry) => entry.accessType === "human_view" && entry.result === "succeeded")).toBe(true);
    expect(accessLogs.some((entry) => entry.denialReason === "human_limit_reached")).toBe(true);
    expect(accessLogs.some((entry) => entry.accessType === "machine_download" && entry.result === "succeeded")).toBe(true);
    expect(accessLogs.some((entry) => entry.denialReason === "machine_limit_reached")).toBe(true);
  });

  it("captures external feedback, queues it for review, and updates review status", async () => {
    const context = await createTestContext("akp-visa-feedback-");
    const fixture = await seedVisaFixtures(context);

    const created = await createVisaBundle(context, {
      ...baseVisaInput(fixture),
      passportId: undefined,
      includeNodeIds: [fixture.nodeId],
      includePostcardIds: [fixture.cardId]
    });

    const token = created.secretPath.replace("/v/", "");
    const submitted = await submitVisaFeedbackByToken(
      context,
      token,
      {
        feedbackType: "question",
        visitorLabel: "Alice",
        message: "Can this visa include one more method postcard?"
      },
      {
        userAgent: "feedback-agent",
        sessionHashSource: "session-feedback",
        visitorLabel: "Alice"
      }
    );

    expect(submitted.status).toBe("active");
    if (submitted.status !== "active") {
      throw new Error("Expected feedback submission to succeed");
    }

    let feedbackItems = await listVisaFeedbackQueue(context, created.visaId, 20);
    expect(feedbackItems).toHaveLength(1);
    expect(feedbackItems[0]?.status).toBe("pending_review");

    await reviewVisaFeedback(context, created.visaId, submitted.feedbackId, "accepted");
    feedbackItems = await listVisaFeedbackQueue(context, created.visaId, 20);
    expect(feedbackItems[0]?.status).toBe("accepted");

    const accessLogs = await context.db.query.visaAccessLogs.findMany({
      where: (table, { eq }) => eq(table.visaId, created.visaId)
    });
    expect(accessLogs.some((entry) => entry.accessType === "feedback_submit" && entry.result === "succeeded")).toBe(true);

    const queueRows = await context.db.query.visaFeedbackQueue.findMany({
      where: (table, { eq }) => eq(table.visaId, created.visaId)
    });
    expect(queueRows[0]?.feedbackType).toBe("question");
  });

  it("redacts source details from the manifest and rejects feedback for revoked visas", async () => {
    const context = await createTestContext("akp-visa-redact-");
    const fixture = await seedVisaFixtures(context);

    const created = await createVisaBundle(context, {
      ...baseVisaInput(fixture),
      passportId: undefined,
      includeNodeIds: [fixture.nodeId],
      includePostcardIds: [fixture.cardId],
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

    await revokeVisaBundle(context, created.visaId);
    const token = created.secretPath.replace("/v/", "");
    const feedbackResult = await submitVisaFeedbackByToken(context, token, {
      feedbackType: "feedback",
      message: "This should not be accepted",
      visitorLabel: "Bob"
    });
    expect(feedbackResult.status).toBe("revoked");
  });
});
