import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import type { ModelProvider } from "@/server/providers/model-provider";
import { createAppContext } from "@/server/context";
import { postcards, visaBundles, wikiNodes } from "@/server/db/schema";
import { createId } from "@/server/services/common";
import { createAgentPackSnapshot, getAgentPackSnapshot } from "@/server/services/agent-packs";
import {
  createAvatarProfile,
  getAvatarProfile,
  listAvatarSimulationSessions,
  setAvatarStatus,
  simulateAvatar,
  updateAvatarProfile
} from "@/server/services/avatars";

import { describe, expect, it } from "vitest";

class FakeProvider implements ModelProvider {
  readonly isConfigured = true;
  async extractStructured() { return { summary: "", keyClaims: [], concepts: [], themes: [], tags: [] }; }
  async summarizeAndLink() { return { nodes: [], relationHints: [] }; }
  async embedText() { return []; }
  async transcribeAudio() { return ""; }
  async generateAnswer() { return { answerMd: "", citations: [] }; }
  async generateCard() { return { claim: "", evidenceSummary: "", userView: "" }; }
  async generatePassport() { return { humanMarkdown: "", machineManifest: {} }; }
  async generateLearnerState() { return { capabilitySignals: [], mistakePatterns: [] }; }
  async generateAvatarReply(input: Parameters<ModelProvider["generateAvatarReply"]>[0]) {
    return {
      answerMd: `Governed answer: ${input.evidence[0]?.text ?? ""}`,
      citations: input.evidence.slice(0, 2).map((entry, index) => ({
        refId: entry.refId,
        kind: "wiki_node" as const,
        excerpt: entry.text.slice(0, 80),
        score: 0.9 - index * 0.1
      }))
    };
  }
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
    provider: new FakeProvider()
  });
}

async function seedPackFixtures(context: ReturnType<typeof createAppContext>) {
  const nodeId = createId("node");
  const nodeTwoId = createId("node");
  const cardId = createId("card");
  const visaId = createId("visa");
  const timestamp = new Date().toISOString();

  await context.db.insert(wikiNodes).values([
    {
      id: nodeId,
      nodeType: "summary",
      title: "Knowledge Passport",
      workspaceId: "ws_personal",
      summary: "A knowledge passport compiles private material into reusable, governed context.",
      bodyMd: "The knowledge passport is for governed context and evidence-backed expression.",
      status: "accepted",
      sourceIdsJson: JSON.stringify([]),
      tagsJson: JSON.stringify(["passport", "knowledge"]),
      projectKey: "atlas",
      privacyLevel: "L1_LOCAL_AI",
      embeddingJson: null,
      updatedAt: timestamp,
      createdAt: timestamp
    },
    {
      id: nodeTwoId,
      nodeType: "summary",
      title: "Pricing Strategy",
      workspaceId: "ws_personal",
      summary: "Private pricing decisions should not be delegated.",
      bodyMd: "Pricing should remain a forbidden topic for delegated agents.",
      status: "accepted",
      sourceIdsJson: JSON.stringify([]),
      tagsJson: JSON.stringify(["pricing"]),
      projectKey: "atlas",
      privacyLevel: "L1_LOCAL_AI",
      embeddingJson: null,
      updatedAt: timestamp,
      createdAt: timestamp
    }
  ]);

  await context.db.insert(postcards).values({
    id: cardId,
    cardType: "knowledge",
    title: "Passport Card",
    workspaceId: "ws_personal",
    claim: "Knowledge passports package evidence-based context.",
    evidenceSummary: "Grounded in accepted node summaries.",
    userView: "Use it for controlled sharing.",
    relatedNodeIdsJson: JSON.stringify([nodeId]),
    relatedSourceIdsJson: JSON.stringify([]),
    privacyLevel: "L1_LOCAL_AI",
    version: 1,
    updatedAt: timestamp,
    createdAt: timestamp
  });

  await context.db.insert(visaBundles).values({
    id: visaId,
    title: "Visa Source",
    audienceLabel: "Partner",
    passportId: null,
    description: "",
    purpose: "",
    humanMarkdown: "# Visa",
    machineManifestJson: JSON.stringify({ title: "Visa" }),
    includeNodeIdsJson: JSON.stringify([nodeId]),
    includePostcardIdsJson: JSON.stringify([cardId]),
    privacyFloor: "L1_LOCAL_AI",
    redactionJson: JSON.stringify({}),
    allowMachineDownload: 1,
    expiresAt: null,
    status: "active",
    tokenHash: "hash",
    lastAccessedAt: null,
    lastMachineAccessedAt: null,
    accessCount: 0,
    maxAccessCount: null,
    machineDownloadCount: 0,
    maxMachineDownloads: null,
    createdAt: timestamp,
    updatedAt: timestamp
  });

  return { nodeId, nodeTwoId, cardId, visaId };
}

describe("avatar governance", () => {
  it("creates agent packs from visas and explicit selections", async () => {
    const context = await createTestContext("akp-avatar-pack-");
    const fixture = await seedPackFixtures(context);

    const fromVisa = await createAgentPackSnapshot(context, {
      title: "Pack From Visa",
      visaId: fixture.visaId,
      passportId: undefined,
      includeNodeIds: [],
      includePostcardIds: [],
      privacyFloor: "L1_LOCAL_AI"
    });
    const visaPack = await getAgentPackSnapshot(context, fromVisa.packId);
    expect(visaPack?.sourceVisaId).toBe(fixture.visaId);
    expect(visaPack?.includeNodeIds).toEqual([fixture.nodeId]);
    expect(visaPack?.includePostcardIds).toEqual([fixture.cardId]);

    const explicit = await createAgentPackSnapshot(context, {
      title: "Explicit Pack",
      visaId: undefined,
      passportId: undefined,
      includeNodeIds: [fixture.nodeTwoId],
      includePostcardIds: [],
      privacyFloor: "L1_LOCAL_AI"
    });
    const explicitPack = await getAgentPackSnapshot(context, explicit.packId);
    expect(explicitPack?.includeNodeIds).toEqual([fixture.nodeTwoId]);
    expect(explicitPack?.includePostcardIds).toEqual([]);
  });

  it("creates and updates avatar profiles", async () => {
    const context = await createTestContext("akp-avatar-profile-");
    const fixture = await seedPackFixtures(context);
    const pack = await createAgentPackSnapshot(context, {
      title: "Profile Pack",
      visaId: fixture.visaId,
      passportId: undefined,
      includeNodeIds: [],
      includePostcardIds: [],
      privacyFloor: "L1_LOCAL_AI"
    });

    const created = await createAvatarProfile(context, {
      title: "Assistant Avatar",
      activePackId: pack.packId,
      intro: "You speak as a careful assistant.",
      toneRules: ["calm", "evidence-first"],
      forbiddenTopics: ["pricing"],
      escalationRules: {
        escalateOnForbiddenTopic: true,
        escalateOnInsufficientEvidence: true,
        escalateOnOutOfScope: true
      },
      status: "active"
    });

    let avatar = await getAvatarProfile(context, created.avatarId);
    expect(avatar?.status).toBe("active");
    expect(avatar?.forbiddenTopics).toContain("pricing");

    await updateAvatarProfile(context, created.avatarId, {
      intro: "Updated intro",
      toneRules: ["concise"],
      forbiddenTopics: ["pricing", "clients"]
    });

    avatar = await getAvatarProfile(context, created.avatarId);
    expect(avatar?.intro).toBe("Updated intro");
    expect(avatar?.toneRules).toEqual(["concise"]);
    expect(avatar?.forbiddenTopics).toContain("clients");
  });

  it("simulates answered, refused, and escalated sessions with scoped citations", async () => {
    const context = await createTestContext("akp-avatar-sim-");
    const fixture = await seedPackFixtures(context);
    const pack = await createAgentPackSnapshot(context, {
      title: "Simulation Pack",
      visaId: fixture.visaId,
      passportId: undefined,
      includeNodeIds: [],
      includePostcardIds: [],
      privacyFloor: "L1_LOCAL_AI"
    });

    const avatarCreated = await createAvatarProfile(context, {
      title: "Governed Avatar",
      activePackId: pack.packId,
      intro: "You are a governed avatar.",
      toneRules: ["calm", "evidence-first"],
      forbiddenTopics: ["pricing"],
      escalationRules: {
        escalateOnForbiddenTopic: true,
        escalateOnInsufficientEvidence: false,
        escalateOnOutOfScope: true
      },
      status: "active"
    });

    const answered = await simulateAvatar(context, avatarCreated.avatarId, {
      question: "How does a knowledge passport help with governed context?"
    });
    expect(answered.resultStatus).toBe("answered");
    expect(answered.citations.length).toBeGreaterThan(0);
    expect(answered.citations.every((citation) => citation.refId === fixture.nodeId)).toBe(true);

    const refused = await simulateAvatar(context, avatarCreated.avatarId, {
      question: "Tell me about pricing strategy."
    });
    expect(refused.resultStatus).toBe("escalated");
    expect(refused.reason).toContain("forbidden_topic");

    await updateAvatarProfile(context, avatarCreated.avatarId, {
      forbiddenTopics: [],
      escalationRules: {
        escalateOnForbiddenTopic: true,
        escalateOnInsufficientEvidence: false,
        escalateOnOutOfScope: false
      }
    });

    const outOfScope = await simulateAvatar(context, avatarCreated.avatarId, {
      question: "What is the best restaurant in Sydney?"
    });
    expect(outOfScope.resultStatus).toBe("refused");
    expect(outOfScope.reason).toBe("out_of_scope");

    await setAvatarStatus(context, avatarCreated.avatarId, "paused");
    const paused = await simulateAvatar(context, avatarCreated.avatarId, {
      question: "Can you answer now?"
    });
    expect(paused.resultStatus).toBe("refused");
    expect(paused.reason).toBe("avatar_paused");

    const sessions = await listAvatarSimulationSessions(context, avatarCreated.avatarId, 20);
    expect(sessions.length).toBe(4);
    expect(sessions.some((session) => session.resultStatus === "answered")).toBe(true);
    expect(sessions.some((session) => session.resultStatus === "escalated")).toBe(true);
    expect(sessions.some((session) => session.reason === "avatar_paused")).toBe(true);
  });
});
