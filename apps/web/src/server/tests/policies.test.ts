import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import type { ModelProvider } from "@/server/providers/model-provider";
import { createAppContext } from "@/server/context";
import {
  agentPackSnapshots,
  avatarProfiles,
  passportSnapshots,
  postcards,
  visaBundles,
  wikiNodes
} from "@/server/db/schema";
import { createId } from "@/server/services/common";
import { createAgentPackSnapshot } from "@/server/services/agent-packs";
import { createAvatarProfile, simulateAvatar } from "@/server/services/avatars";
import { createAgentPackExportPackage } from "@/server/services/exports";
import { resolveObjectPolicy, upsertObjectPolicy } from "@/server/services/policies";
import { createVisaBundle } from "@/server/services/visas";

import { describe, expect, it } from "vitest";

class StubProvider implements ModelProvider {
  readonly isConfigured = true;
  async extractStructured() { return { summary: "", keyClaims: [], concepts: [], themes: [], tags: [] }; }
  async summarizeAndLink() { return { nodes: [], relationHints: [] }; }
  async embedText() { return []; }
  async transcribeAudio() { return ""; }
  async generateAnswer() { return { answerMd: "", citations: [] }; }
  async generateCard() { return { claim: "", evidenceSummary: "", userView: "" }; }
  async generatePassport() { return { humanMarkdown: "", machineManifest: {} }; }
  async generateAvatarReply() { return { answerMd: "avatar answer", citations: [] }; }
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

async function seedGovernedObjects(context: ReturnType<typeof createAppContext>) {
  const timestamp = new Date().toISOString();
  const nodeId = createId("node");
  const cardId = createId("card");
  const passportId = createId("passport");

  await context.db.insert(wikiNodes).values({
    id: nodeId,
    nodeType: "summary",
    title: "Governed Node",
    summary: "Node summary",
    bodyMd: "Node body for governed policy tests",
    status: "accepted",
    sourceIdsJson: JSON.stringify([]),
    tagsJson: JSON.stringify(["policy"]),
    projectKey: "atlas",
    privacyLevel: "L2_INVITED",
    embeddingJson: null,
    updatedAt: timestamp,
    createdAt: timestamp
  });

  await context.db.insert(postcards).values({
    id: cardId,
    cardType: "knowledge",
    title: "Governed Card",
    claim: "Governed claim",
    evidenceSummary: "Governed evidence",
    userView: "Governed view",
    relatedNodeIdsJson: JSON.stringify([nodeId]),
    relatedSourceIdsJson: JSON.stringify([]),
    privacyLevel: "L2_INVITED",
    version: 1,
    updatedAt: timestamp,
    createdAt: timestamp
  });

  await context.db.insert(passportSnapshots).values({
    id: passportId,
    title: "Governed Passport",
    humanMarkdown: "# Governed Passport",
    machineManifestJson: JSON.stringify({ title: "Governed Passport" }),
    includeNodeIdsJson: JSON.stringify([nodeId]),
    includePostcardIdsJson: JSON.stringify([cardId]),
    privacyFloor: "L2_INVITED",
    createdAt: timestamp
  });

  const visa = await createVisaBundle(context, {
    title: "Governed Visa",
    passportId,
    includeNodeIds: [],
    includePostcardIds: [],
    privacyFloor: "L3_PUBLIC",
    audienceLabel: "Reviewers",
    description: "",
    purpose: "",
    allowMachineDownload: true,
    redaction: {
      hideOriginUrls: false,
      hideSourcePaths: false,
      hideRawSourceIds: false
    }
  });

  const pack = await createAgentPackSnapshot(context, {
    title: "Governed Pack",
    visaId: visa.visaId,
    passportId: undefined,
    includeNodeIds: [],
    includePostcardIds: [],
    privacyFloor: "L3_PUBLIC"
  });

  const avatar = await createAvatarProfile(context, {
    title: "Governed Avatar",
    activePackId: pack.packId,
    intro: "Governed intro",
    toneRules: ["calm"],
    forbiddenTopics: [],
    escalationRules: {
      escalateOnForbiddenTopic: true,
      escalateOnInsufficientEvidence: true,
      escalateOnOutOfScope: true
    },
    status: "active"
  });

  return {
    nodeId,
    cardId,
    passportId,
    visaId: visa.visaId,
    packId: pack.packId,
    avatarId: avatar.avatarId
  };
}

describe("object policies", () => {
  it("resolves inherited policies across passport -> visa -> pack -> avatar", async () => {
    const context = await createTestContext("akp-policy-chain-");
    const fixture = await seedGovernedObjects(context);

    await upsertObjectPolicy(context, {
      objectType: "passport_snapshot",
      objectId: fixture.passportId,
      privacyFloorOverride: "L1_LOCAL_AI",
      allowSecretLinks: false,
      allowMachineAccess: false,
      allowExports: false,
      notes: "base passport rule"
    });

    const avatarPolicy = await resolveObjectPolicy(context, "avatar_profile", fixture.avatarId);
    expect(avatarPolicy.privacyFloor).toBe("L1_LOCAL_AI");
    expect(avatarPolicy.allowSecretLinks).toBe(false);
    expect(avatarPolicy.allowMachineAccess).toBe(false);
    expect(avatarPolicy.allowExports).toBe(false);
    expect(avatarPolicy.allowAvatarBinding).toBe(true);
    expect(avatarPolicy.chain.map((entry) => entry.objectType)).toEqual([
      "avatar_profile",
      "agent_pack_snapshot",
      "visa_bundle",
      "passport_snapshot"
    ]);
  });

  it("blocks visa creation when the source passport policy denies secret links", async () => {
    const context = await createTestContext("akp-policy-visa-");
    const timestamp = new Date().toISOString();
    const nodeId = createId("node");
    const cardId = createId("card");
    const passportId = createId("passport");

    await context.db.insert(wikiNodes).values({
      id: nodeId,
      nodeType: "summary",
      title: "Visa Policy Node",
      summary: "Node summary",
      bodyMd: "Node body",
      status: "accepted",
      sourceIdsJson: JSON.stringify([]),
      tagsJson: JSON.stringify(["policy"]),
      projectKey: "atlas",
      privacyLevel: "L2_INVITED",
      embeddingJson: null,
      updatedAt: timestamp,
      createdAt: timestamp
    });
    await context.db.insert(postcards).values({
      id: cardId,
      cardType: "knowledge",
      title: "Visa Policy Card",
      claim: "Claim",
      evidenceSummary: "Evidence",
      userView: "View",
      relatedNodeIdsJson: JSON.stringify([nodeId]),
      relatedSourceIdsJson: JSON.stringify([]),
      privacyLevel: "L2_INVITED",
      version: 1,
      updatedAt: timestamp,
      createdAt: timestamp
    });
    await context.db.insert(passportSnapshots).values({
      id: passportId,
      title: "Passport",
      humanMarkdown: "# Passport",
      machineManifestJson: JSON.stringify({ title: "Passport" }),
      includeNodeIdsJson: JSON.stringify([nodeId]),
      includePostcardIdsJson: JSON.stringify([cardId]),
      privacyFloor: "L2_INVITED",
      createdAt: timestamp
    });

    await upsertObjectPolicy(context, {
      objectType: "passport_snapshot",
      objectId: passportId,
      allowSecretLinks: false,
      notes: "no secret links"
    });

    await expect(
      createVisaBundle(context, {
        title: "Blocked Visa",
        passportId,
        includeNodeIds: [],
        includePostcardIds: [],
        privacyFloor: "L3_PUBLIC",
        audienceLabel: "Reviewers",
        description: "",
        purpose: "",
        allowMachineDownload: true,
        redaction: {
          hideOriginUrls: false,
          hideSourcePaths: false,
          hideRawSourceIds: false
        }
      })
    ).rejects.toThrow("Policy denied secret_links");
  });

  it("blocks avatar binding and simulation when policies disable them", async () => {
    const context = await createTestContext("akp-policy-avatar-");
    const fixture = await seedGovernedObjects(context);

    await upsertObjectPolicy(context, {
      objectType: "agent_pack_snapshot",
      objectId: fixture.packId,
      allowAvatarBinding: false,
      notes: "no new avatars"
    });

    await expect(
      createAvatarProfile(context, {
        title: "Blocked Avatar",
        activePackId: fixture.packId,
        intro: "",
        toneRules: [],
        forbiddenTopics: [],
        escalationRules: {
          escalateOnForbiddenTopic: true,
          escalateOnInsufficientEvidence: true,
          escalateOnOutOfScope: true
        },
        status: "active"
      })
    ).rejects.toThrow("Policy denied avatar_binding");

    await upsertObjectPolicy(context, {
      objectType: "avatar_profile",
      objectId: fixture.avatarId,
      allowAvatarSimulation: false,
      notes: "simulation off"
    });

    const result = await simulateAvatar(context, fixture.avatarId, {
      question: "What is this pack for?"
    });
    expect(result.resultStatus).toBe("refused");
    expect(result.reason).toBe("policy_avatar_simulation_disabled");
  });

  it("blocks export creation when the agent pack policy denies exports", async () => {
    const context = await createTestContext("akp-policy-export-");
    const fixture = await seedGovernedObjects(context);

    await upsertObjectPolicy(context, {
      objectType: "agent_pack_snapshot",
      objectId: fixture.packId,
      allowExports: false,
      notes: "no exports"
    });

    await expect(
      createAgentPackExportPackage(context, {
        agentPackId: fixture.packId,
        includeAvatarProfile: false
      })
    ).rejects.toThrow("Policy denied exports");
  });
});
