import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import type { ModelProvider } from "@/server/providers/model-provider";
import { createAppContext } from "@/server/context";
import { applyReviewAction, compileSource } from "@/server/services/compiler";
import { createFocusCard } from "@/server/services/focus-cards";
import { createPassportSnapshot, getPassportSnapshot } from "@/server/services/passports";
import { reviewCapabilitySignal, reviewMistakePattern, listCapabilitySignals, listMistakePatterns } from "@/server/services/signals";
import { createSourceImport } from "@/server/services/sources";
import { listWorkspaces } from "@/server/services/workspaces";

import { describe, expect, it } from "vitest";

class ContextProvider implements ModelProvider {
  readonly isConfigured = true;

  async extractStructured() {
    return {
      summary: "summary",
      keyClaims: ["claim"],
      concepts: ["concept"],
      themes: ["theme"],
      tags: ["mountable"]
    };
  }

  async summarizeAndLink(input: Parameters<ModelProvider["summarizeAndLink"]>[0]) {
    return {
      nodes: [
        {
          nodeType: "summary" as const,
          title: `${input.title} summary`,
          summary: input.text.slice(0, 80),
          bodyMd: input.text,
          tags: ["context", "passport"]
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
    return { claim: "claim", evidenceSummary: "evidence", userView: "view" };
  }

  async generatePassport(input: Parameters<ModelProvider["generatePassport"]>[0]) {
    return {
      humanMarkdown: `# ${input.title}\n\n${input.focusCard ? `Focus: ${input.focusCard.title}` : "No focus"}`,
      machineManifest: {
        title: input.title,
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
          topic: "Knowledge framing",
          observedPractice: "Can summarize a governed knowledge base.",
          currentGaps: "Needs a clearer outward-first framing.",
          confidence: 0.72,
          evidenceNodeIds: input.nodes.slice(0, 1).map((node) => node.id),
          evidenceFragmentIds: input.claims.slice(0, 1).flatMap((claim) => claim.sourceFragmentIds)
        }
      ],
      mistakePatterns: [
        {
          topic: "Over-scoping",
          description: "Tends to describe the system too broadly before the first user value is sharp.",
          fixSuggestions: "Anchor the product around one AI-readable entry object first.",
          recurrenceCount: 2,
          exampleNodeIds: input.nodes.slice(0, 1).map((node) => node.id),
          exampleFragmentIds: input.claims.slice(0, 1).flatMap((claim) => claim.sourceFragmentIds),
          privacyLevel: "L1_LOCAL_AI" as const
        }
      ]
    };
  }

  async generateAvatarReply() {
    return { answerMd: "avatar", citations: [] };
  }
}

describe("product refocus context layer", () => {
  it("bootstraps a default workspace, generates learner-state candidates, and enriches passport context", async () => {
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "akp-context-"));
    const dataDir = path.join(tempRoot, "data");
    await fs.mkdir(path.join(dataDir, "objects"), { recursive: true });
    await fs.mkdir(path.join(dataDir, "exports"), { recursive: true });
    await fs.mkdir(path.join(dataDir, "backups"), { recursive: true });

    const context = createAppContext({
      dataDir,
      databasePath: path.join(dataDir, "test.sqlite"),
      provider: new ContextProvider()
    });

    const workspaces = await listWorkspaces(context);
    expect(workspaces[0]?.id).toBe("ws_personal");

    const importResult = await createSourceImport(context, {
      payload: {
        type: "markdown",
        title: "Product framing notes",
        workspaceId: "ws_personal",
        privacyLevel: "L1_LOCAL_AI",
        textContent: "The first value is helping AI understand the user quickly under authorization.",
        tags: ["focus", "passport"],
        metadata: {}
      }
    });

    const nodes = await compileSource(context, importResult.sourceId);
    expect(nodes.length).toBe(1);
    await applyReviewAction(context, {
      nodeId: nodes[0]?.id ?? "",
      action: "accept"
    });

    const pendingSignals = await listCapabilitySignals(context, { workspaceId: "ws_personal", status: "pending_review" });
    const pendingMistakes = await listMistakePatterns(context, { workspaceId: "ws_personal", status: "pending_review" });
    expect(pendingSignals).toHaveLength(1);
    expect(pendingMistakes).toHaveLength(1);

    await reviewCapabilitySignal(context, pendingSignals[0]!.id, "accepted");
    await reviewMistakePattern(context, pendingMistakes[0]!.id, "accepted");

    await createFocusCard(context, {
      workspaceId: "ws_personal",
      title: "Sharpen the first user value",
      goal: "Make the passport the default AI entry object.",
      timeframe: "This week",
      priority: "high",
      successCriteria: "A mounted AI can understand the user without repeated explanation.",
      relatedTopics: ["passport", "signals"],
      status: "active"
    });

    const passportId = await createPassportSnapshot(context, {
      title: "Focused Passport",
      workspaceId: "ws_personal",
      includeNodeIds: [],
      includePostcardIds: [],
      privacyFloor: "L1_LOCAL_AI"
    });

    const passport = await getPassportSnapshot(context, passportId);
    expect(passport?.workspaceId).toBe("ws_personal");
    expect((passport?.machineManifest as { focusCard?: { title?: string } }).focusCard?.title).toBe("Sharpen the first user value");
    expect(((passport?.machineManifest as { capabilitySignals?: unknown[] }).capabilitySignals ?? []).length).toBe(1);
    expect(((passport?.machineManifest as { mistakePatterns?: unknown[] }).mistakePatterns ?? []).length).toBe(1);
  });
});
