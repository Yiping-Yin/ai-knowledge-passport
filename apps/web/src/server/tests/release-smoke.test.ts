import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import type { ModelProvider } from "@/server/providers/model-provider";
import { createAppContext } from "@/server/context";
import { createAgentPackSnapshot } from "@/server/services/agent-packs";
import { createAvatarProfile, simulateAvatar } from "@/server/services/avatars";
import { applyReviewAction, compileSource } from "@/server/services/compiler";
import { createAgentPackExportPackage, getExportPackage } from "@/server/services/exports";
import { createFocusCard } from "@/server/services/focus-cards";
import { createPassportSnapshot } from "@/server/services/passports";
import { createSuggestedPostcard } from "@/server/services/postcards";
import { reviewCapabilitySignal, reviewMistakePattern, listCapabilitySignals, listMistakePatterns } from "@/server/services/signals";
import { createSourceImport } from "@/server/services/sources";
import { createVisaBundle } from "@/server/services/visas";

import { describe, expect, it } from "vitest";

class SmokeProvider implements ModelProvider {
  readonly isConfigured = true;

  async extractStructured() {
    return { summary: "summary", keyClaims: ["claim"], concepts: ["concept"], themes: ["theme"], tags: ["demo"] };
  }

  async summarizeAndLink(input: Parameters<ModelProvider["summarizeAndLink"]>[0]) {
    return {
      nodes: [
        {
          nodeType: "summary" as const,
          title: `${input.title} summary`,
          summary: input.text.slice(0, 100),
          bodyMd: input.text,
          tags: input.tags.length ? input.tags : ["demo"]
        }
      ],
      relationHints: []
    };
  }

  async embedText(input: string[]) {
    return input.map((entry) => Array.from(entry).slice(0, 6).map((char) => char.charCodeAt(0) / 255));
  }

  async transcribeAudio() {
    return "audio";
  }

  async generateAnswer() {
    return { answerMd: "answer", citations: [] };
  }

  async generateCard() {
    return {
      claim: "A passport gives an AI the right starting context.",
      evidenceSummary: "Grounded in accepted nodes.",
      userView: "This is the compact outward layer."
    };
  }

  async generatePassport(input: Parameters<ModelProvider["generatePassport"]>[0]) {
    return {
      humanMarkdown: `# ${input.title}\n\n${input.focusCard ? input.focusCard.title : "no focus"}`,
      machineManifest: {
        focusCard: input.focusCard,
        capabilitySignals: input.capabilitySignals,
        mistakePatterns: input.mistakePatterns
      }
    };
  }

  async generateLearnerState(input: Parameters<ModelProvider["generateLearnerState"]>[0]) {
    return {
      capabilitySignals: [
        {
          topic: "Context packaging",
          observedPractice: "Can organize knowledge into an AI-readable passport.",
          currentGaps: "Needs stronger mount defaults.",
          confidence: 0.71,
          evidenceNodeIds: input.nodes.map((node) => node.id).slice(0, 1),
          evidenceFragmentIds: input.claims.flatMap((claim) => claim.sourceFragmentIds).slice(0, 1)
        }
      ],
      mistakePatterns: [
        {
          topic: "Over-scoping",
          description: "Can still explain too much before clarifying the first value.",
          fixSuggestions: "Lead with the passport and current focus.",
          recurrenceCount: 1,
          exampleNodeIds: input.nodes.map((node) => node.id).slice(0, 1),
          exampleFragmentIds: input.claims.flatMap((claim) => claim.sourceFragmentIds).slice(0, 1),
          privacyLevel: "L1_LOCAL_AI" as const
        }
      ]
    };
  }

  async generateAvatarReply(input: Parameters<ModelProvider["generateAvatarReply"]>[0]) {
    return {
      answerMd: `Avatar reply: ${input.evidence[0]?.text ?? ""}`,
      citations: input.evidence.slice(0, 1).map((entry) => ({
        refId: entry.refId,
        kind: "wiki_node" as const,
        excerpt: entry.text.slice(0, 80),
        score: 0.9
      }))
    };
  }
}

describe("release smoke", () => {
  it("runs the full context -> passport -> mount -> agent -> export chain", async () => {
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "akp-release-smoke-"));
    const dataDir = path.join(tempRoot, "data");
    await fs.mkdir(path.join(dataDir, "objects"), { recursive: true });
    await fs.mkdir(path.join(dataDir, "exports"), { recursive: true });
    await fs.mkdir(path.join(dataDir, "backups"), { recursive: true });

    const context = createAppContext({
      dataDir,
      databasePath: path.join(dataDir, "test.sqlite"),
      provider: new SmokeProvider()
    });

    const imported = await createSourceImport(context, {
      payload: {
        type: "markdown",
        title: "Smoke source",
        workspaceId: "ws_personal",
        privacyLevel: "L1_LOCAL_AI",
        textContent: "A passport helps an AI understand the user quickly under authorization.",
        tags: ["passport", "smoke"],
        metadata: {}
      }
    });

    const nodes = await compileSource(context, imported.sourceId);
    await applyReviewAction(context, {
      nodeId: nodes[0]!.id,
      action: "accept"
    });

    const [pendingSignals, pendingMistakes] = await Promise.all([
      listCapabilitySignals(context, { workspaceId: "ws_personal", status: "pending_review" }),
      listMistakePatterns(context, { workspaceId: "ws_personal", status: "pending_review" })
    ]);

    await reviewCapabilitySignal(context, pendingSignals[0]!.id, "accepted");
    await reviewMistakePattern(context, pendingMistakes[0]!.id, "accepted");

    await createFocusCard(context, {
      workspaceId: "ws_personal",
      title: "Smoke focus",
      goal: "Package a clean AI entry object.",
      timeframe: "today",
      priority: "high",
      successCriteria: "A downstream AI starts from the right context.",
      relatedTopics: ["passport"],
      status: "active"
    });

    const postcard = await createSuggestedPostcard(context, {
      cardType: "knowledge",
      title: "Smoke postcard",
      nodeIds: [nodes[0]!.id],
      sourceIds: [imported.sourceId]
    });

    const passportId = await createPassportSnapshot(context, {
      title: "Smoke passport",
      workspaceId: "ws_personal",
      includeNodeIds: [nodes[0]!.id],
      includePostcardIds: [postcard.postcardId],
      privacyFloor: "L1_LOCAL_AI"
    });

    const visa = await createVisaBundle(context, {
      title: "Smoke visa",
      passportId,
      includeNodeIds: [],
      includePostcardIds: [],
      privacyFloor: "L1_LOCAL_AI",
      audienceLabel: "smoke test",
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
      title: "Smoke pack",
      passportId,
      visaId: undefined,
      includeNodeIds: [],
      includePostcardIds: [],
      privacyFloor: "L1_LOCAL_AI"
    });

    const avatar = await createAvatarProfile(context, {
      title: "Smoke avatar",
      activePackId: pack.packId,
      intro: "Use the passport context first.",
      toneRules: ["clear"],
      forbiddenTopics: [],
      escalationRules: {
        escalateOnForbiddenTopic: true,
        escalateOnInsufficientEvidence: true,
        escalateOnOutOfScope: true
      },
      status: "active"
    });

    const simulation = await simulateAvatar(context, avatar.avatarId, {
      question: "How does the passport help an AI understand the user?"
    });

    expect(simulation.resultStatus).toBe("answered");

    const exported = await createAgentPackExportPackage(context, {
      agentPackId: pack.packId,
      avatarProfileId: avatar.avatarId,
      includeAvatarProfile: true
    });

    const exportPackage = await getExportPackage(context, exported.exportId);
    expect(visa.secretPath).toContain("/v/");
    expect(exportPackage?.objectId).toBe(pack.packId);
    expect((exportPackage?.manifest as { passportContext?: unknown }).passportContext).toBeTruthy();
  });
});
