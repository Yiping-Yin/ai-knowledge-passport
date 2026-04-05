import fs from "node:fs";
import path from "node:path";

import type { ModelProvider } from "@/server/providers/model-provider";
import { createAppContext } from "@/server/context";
import { createAgentPackSnapshot } from "@/server/services/agent-packs";
import { createAvatarProfile } from "@/server/services/avatars";
import { applyReviewAction, compileSource } from "@/server/services/compiler";
import { createAgentPackExportPackage } from "@/server/services/exports";
import { createFocusCard } from "@/server/services/focus-cards";
import { createPassportSnapshot } from "@/server/services/passports";
import { createSuggestedPostcard } from "@/server/services/postcards";
import { reviewCapabilitySignal, reviewMistakePattern, listCapabilitySignals, listMistakePatterns } from "@/server/services/signals";
import { createSourceImport } from "@/server/services/sources";
import { createVisaBundle } from "@/server/services/visas";
import { resolveDatabasePath } from "@/server/db/client";
import { resolveWorkspaceRoot } from "@/server/utils/workspace";

class DemoProvider implements ModelProvider {
  readonly isConfigured = true;

  async extractStructured() {
    return {
      summary: "Demo summary",
      keyClaims: ["claim"],
      concepts: ["context"],
      themes: ["passport"],
      tags: ["demo", "passport"]
    };
  }

  async summarizeAndLink(input: Parameters<ModelProvider["summarizeAndLink"]>[0]) {
    return {
      nodes: [
        {
          nodeType: "summary" as const,
          title: `${input.title} summary`,
          summary: input.text.slice(0, 120),
          bodyMd: `# ${input.title}\n\n${input.text}`,
          tags: input.tags.length ? input.tags : ["demo", "passport"]
        }
      ],
      relationHints: []
    };
  }

  async embedText(input: string[]) {
    return input.map((entry) => {
      const chars = Array.from(entry).slice(0, 8).map((char) => char.charCodeAt(0) / 255);
      while (chars.length < 8) chars.push(0);
      return chars;
    });
  }

  async transcribeAudio() {
    return "demo transcript";
  }

  async generateAnswer() {
    return { answerMd: "demo answer", citations: [] };
  }

  async generateCard(input: Parameters<ModelProvider["generateCard"]>[0]) {
    return {
      claim: `AI should read ${input.title} as a compact governed context card.`,
      evidenceSummary: "Grounded in accepted local knowledge and current focus.",
      userView: "This card helps an external AI adapt faster."
    };
  }

  async generatePassport(input: Parameters<ModelProvider["generatePassport"]>[0]) {
    return {
      humanMarkdown: [
        `# ${input.title}`,
        "",
        input.focusCard ? `## Active Focus\n\n- ${input.focusCard.title}\n- ${input.focusCard.goal}` : "## Active Focus\n\n- none",
        "",
        "## Capability Signals",
        ...input.capabilitySignals.map((signal) => `- ${signal.topic}: ${signal.observedPractice}`),
        "",
        "## Blind Spots",
        ...input.mistakePatterns.map((mistake) => `- ${mistake.topic}: ${mistake.description}`)
      ].join("\n"),
      machineManifest: {
        title: input.title,
        capabilitySignals: input.capabilitySignals,
        mistakePatterns: input.mistakePatterns,
        focusCard: input.focusCard
      }
    };
  }

  async generateLearnerState(input: Parameters<ModelProvider["generateLearnerState"]>[0]) {
    return {
      capabilitySignals: [
        {
          topic: "AI context framing",
          observedPractice: "Can organize knowledge into a mountable passport entry layer.",
          currentGaps: "Needs stronger defaults for current-goal prioritization.",
          confidence: 0.74,
          evidenceNodeIds: input.nodes.slice(0, 1).map((node) => node.id),
          evidenceFragmentIds: input.claims.slice(0, 1).flatMap((claim) => claim.sourceFragmentIds)
        }
      ],
      mistakePatterns: [
        {
          topic: "Over-explaining",
          description: "Tends to describe the whole system before clarifying the first user value.",
          fixSuggestions: "Lead with the passport as the default AI entry point.",
          recurrenceCount: 2,
          exampleNodeIds: input.nodes.slice(0, 1).map((node) => node.id),
          exampleFragmentIds: input.claims.slice(0, 1).flatMap((claim) => claim.sourceFragmentIds),
          privacyLevel: "L1_LOCAL_AI" as const
        }
      ]
    };
  }

  async generateAvatarReply() {
    return { answerMd: "demo avatar answer", citations: [] };
  }
}

function resolveDataDir(rootDir: string) {
  return process.env.AIKP_DATA_DIR ? path.resolve(process.env.AIKP_DATA_DIR) : path.join(rootDir, "data");
}

async function main() {
  const rootDir = resolveWorkspaceRoot();
  const dataDir = resolveDataDir(rootDir);
  fs.mkdirSync(path.join(dataDir, "objects"), { recursive: true });
  fs.mkdirSync(path.join(dataDir, "exports"), { recursive: true });
  fs.mkdirSync(path.join(dataDir, "backups"), { recursive: true });

  const context = createAppContext({
    dataDir,
    databasePath: resolveDatabasePath(),
    provider: new DemoProvider()
  });

  const existing = await context.db.query.passportSnapshots.findFirst({
    where: (table, { eq }) => eq(table.title, "Demo Passport")
  });

  if (existing) {
    console.log(`Demo data already exists: ${existing.id}`);
    return;
  }

  const imports = await Promise.all([
    createSourceImport(context, {
      payload: {
        type: "markdown",
        title: "Demo Source: Foundation",
        workspaceId: "ws_personal",
        privacyLevel: "L1_LOCAL_AI",
        textContent: "A good AI knowledge passport helps the model understand the user's foundation before answering.",
        tags: ["demo", "passport", "foundation"],
        metadata: {}
      }
    }),
    createSourceImport(context, {
      payload: {
        type: "markdown",
        title: "Demo Source: Current Goal",
        workspaceId: "ws_personal",
        privacyLevel: "L1_LOCAL_AI",
        textContent: "The current goal is to make the passport the default AI entry object and keep writeback candidate-only.",
        tags: ["demo", "focus", "goal"],
        metadata: {}
      }
    }),
    createSourceImport(context, {
      payload: {
        type: "markdown",
        title: "Demo Source: Blind Spot",
        workspaceId: "ws_personal",
        privacyLevel: "L1_LOCAL_AI",
        textContent: "The common failure mode is over-scoping the product before the first user pain is sharp.",
        tags: ["demo", "blind-spot", "scope"],
        metadata: {}
      }
    })
  ]);

  const acceptedNodeIds: string[] = [];
  for (const imported of imports) {
    const nodes = await compileSource(context, imported.sourceId);
    for (const node of nodes) {
      await applyReviewAction(context, {
        nodeId: node.id,
        action: "accept"
      });
      acceptedNodeIds.push(node.id);
    }
  }

  const pendingSignals = await listCapabilitySignals(context, { workspaceId: "ws_personal", status: "pending_review" });
  const pendingMistakes = await listMistakePatterns(context, { workspaceId: "ws_personal", status: "pending_review" });

  for (const signal of pendingSignals) {
    await reviewCapabilitySignal(context, signal.id, "accepted");
  }
  for (const mistake of pendingMistakes) {
    await reviewMistakePattern(context, mistake.id, "accepted");
  }

  await createFocusCard(context, {
    workspaceId: "ws_personal",
    title: "Demo Focus",
    goal: "Show that an AI can read a passport and adapt to the user without repeated explanation.",
    timeframe: "This week",
    priority: "high",
    successCriteria: "The mounted AI starts from the right context and stays inside bounds.",
    relatedTopics: ["passport", "mount", "avatar"],
    status: "active"
  });

  const postcard = await createSuggestedPostcard(context, {
    cardType: "knowledge",
    title: "Demo Passport Card",
    nodeIds: acceptedNodeIds,
    sourceIds: imports.map((item) => item.sourceId)
  });

  const passportId = await createPassportSnapshot(context, {
    title: "Demo Passport",
    workspaceId: "ws_personal",
    includeNodeIds: acceptedNodeIds,
    includePostcardIds: [postcard.postcardId],
    privacyFloor: "L1_LOCAL_AI"
  });

  const visa = await createVisaBundle(context, {
    title: "Demo Mount Visa",
    passportId,
    includeNodeIds: [],
    includePostcardIds: [],
    privacyFloor: "L1_LOCAL_AI",
    audienceLabel: "Demo AI mount",
    description: "A read-only demo bundle derived from the passport.",
    purpose: "Show how a downstream AI would mount only the right context.",
    allowMachineDownload: true,
    redaction: {
      hideOriginUrls: false,
      hideSourcePaths: true,
      hideRawSourceIds: false
    }
  });

  const pack = await createAgentPackSnapshot(context, {
    title: "Demo Agent Pack",
    passportId,
    visaId: undefined,
    includeNodeIds: [],
    includePostcardIds: [],
    privacyFloor: "L1_LOCAL_AI"
  });

  const avatar = await createAvatarProfile(context, {
    title: "Demo Avatar",
    activePackId: pack.packId,
    intro: "You are a governed demo avatar that starts from passport context.",
    toneRules: ["clear", "evidence-first"],
    forbiddenTopics: ["pricing", "confidential strategy"],
    escalationRules: {
      escalateOnForbiddenTopic: true,
      escalateOnInsufficientEvidence: true,
      escalateOnOutOfScope: true
    },
    status: "active"
  });

  const exportPackage = await createAgentPackExportPackage(context, {
    agentPackId: pack.packId,
    avatarProfileId: avatar.avatarId,
    includeAvatarProfile: true
  });

  console.log(JSON.stringify({
    workspaceId: "ws_personal",
    sourceIds: imports.map((item) => item.sourceId),
    acceptedNodeIds,
    postcardId: postcard.postcardId,
    passportId,
    visaId: visa.visaId,
    visaPath: visa.secretPath,
    agentPackId: pack.packId,
    avatarId: avatar.avatarId,
    exportId: exportPackage.exportId
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
