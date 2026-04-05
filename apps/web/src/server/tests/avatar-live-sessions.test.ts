import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import type { ModelProvider } from "@/server/providers/model-provider";
import { createAppContext } from "@/server/context";
import { postcards, visaBundles, wikiNodes } from "@/server/db/schema";
import { createId } from "@/server/services/common";
import { createAgentPackSnapshot } from "@/server/services/agent-packs";
import {
  createAvatarProfile,
  setAvatarStatus
} from "@/server/services/avatars";
import {
  createAvatarLiveSession,
  getAvatarLiveSession,
  listAvatarLiveSessions,
  postAvatarLiveMessage,
  setAvatarLiveSessionStatus
} from "@/server/services/avatar-live-sessions";

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
  async generateAvatarReply(input: Parameters<ModelProvider["generateAvatarReply"]>[0]) {
    return {
      answerMd: `Live governed answer: ${input.evidence[0]?.text ?? ""}`,
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

async function seedAvatarFixture(context: ReturnType<typeof createAppContext>) {
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
      summary: "A knowledge passport compiles private material into reusable governed context.",
      bodyMd: "Knowledge passports provide governed context and evidence-backed expression.",
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
      summary: "Private pricing should not be delegated.",
      bodyMd: "Pricing is a forbidden topic for governed agents.",
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

  const pack = await createAgentPackSnapshot(context, {
    title: "Live Session Pack",
    visaId,
    passportId: undefined,
    includeNodeIds: [],
    includePostcardIds: [],
    privacyFloor: "L1_LOCAL_AI"
  });

  const avatar = await createAvatarProfile(context, {
    title: "Live Avatar",
    activePackId: pack.packId,
    intro: "You are a governed avatar.",
    toneRules: ["calm", "evidence-first"],
    forbiddenTopics: ["pricing"],
    escalationRules: {
      escalateOnForbiddenTopic: true,
      escalateOnInsufficientEvidence: false,
      escalateOnOutOfScope: false
    },
    status: "active"
  });

  return {
    avatarId: avatar.avatarId,
    nodeId,
    nodeTwoId
  };
}

describe("avatar live sessions", () => {
  it("creates a live session and records it under the avatar", async () => {
    const context = await createTestContext("akp-live-avatar-create-");
    const fixture = await seedAvatarFixture(context);

    const created = await createAvatarLiveSession(context, fixture.avatarId, { title: "Stakeholder chat" });
    expect(created.sessionId).toMatch(/^avatar_live_session_/);

    const sessions = await listAvatarLiveSessions(context, fixture.avatarId, 10);
    expect(sessions).toHaveLength(1);
    expect(sessions[0]?.title).toBe("Stakeholder chat");
    expect(sessions[0]?.status).toBe("active");
  });

  it("posts answered, escalated, and refused turns inside one session thread", async () => {
    const context = await createTestContext("akp-live-avatar-thread-");
    const fixture = await seedAvatarFixture(context);
    const created = await createAvatarLiveSession(context, fixture.avatarId, { title: "Thread" });

    const answered = await postAvatarLiveMessage(context, created.sessionId, {
      contentMd: "How does a knowledge passport help with governed context?"
    });
    expect(answered.resultStatus).toBe("answered");
    expect(answered.citations.length).toBeGreaterThan(0);
    expect(answered.citations.every((citation) => citation.refId === fixture.nodeId)).toBe(true);

    const escalated = await postAvatarLiveMessage(context, created.sessionId, {
      contentMd: "Tell me about pricing strategy."
    });
    expect(escalated.resultStatus).toBe("escalated");
    expect(escalated.reason).toContain("forbidden_topic");

    const refused = await postAvatarLiveMessage(context, created.sessionId, {
      contentMd: "What is the best restaurant in Sydney?"
    });
    expect(refused.resultStatus).toBe("refused");
    expect(refused.reason).toBe("out_of_scope");

    const session = await getAvatarLiveSession(context, created.sessionId);
    expect(session?.messages.length).toBe(6);
    expect(session?.messages[0]?.role).toBe("user");
    expect(session?.messages[1]?.role).toBe("assistant");
    expect(session?.messages[1]?.resultStatus).toBe("answered");
    expect(session?.messages[3]?.resultStatus).toBe("escalated");
    expect(session?.messages[5]?.resultStatus).toBe("refused");
  });

  it("refuses turns when avatar is paused and rejects new turns after the session is closed", async () => {
    const context = await createTestContext("akp-live-avatar-paused-");
    const fixture = await seedAvatarFixture(context);
    const created = await createAvatarLiveSession(context, fixture.avatarId, { title: "" });

    await setAvatarStatus(context, fixture.avatarId, "paused");
    const paused = await postAvatarLiveMessage(context, created.sessionId, {
      contentMd: "Can you answer now?"
    });
    expect(paused.resultStatus).toBe("refused");
    expect(paused.reason).toBe("avatar_paused");

    await setAvatarLiveSessionStatus(context, created.sessionId, "closed");
    await expect(
      postAvatarLiveMessage(context, created.sessionId, {
        contentMd: "One more message"
      })
    ).rejects.toThrow("Closed live sessions cannot accept new messages.");
  });
});
