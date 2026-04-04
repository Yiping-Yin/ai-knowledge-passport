import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import type { ModelProvider } from "@/server/providers/model-provider";
import { createAppContext } from "@/server/context";
import { wikiNodes, postcards, sources } from "@/server/db/schema";
import { getVisualOverview } from "@/server/services/visuals";

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

describe("visual overview", () => {
  it("builds theme, privacy, evidence, and project summaries", async () => {
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "akp-visuals-"));
    const dataDir = path.join(tempRoot, "data");
    await fs.mkdir(path.join(dataDir, "objects"), { recursive: true });
    await fs.mkdir(path.join(dataDir, "exports"), { recursive: true });
    await fs.mkdir(path.join(dataDir, "backups"), { recursive: true });

    const context = createAppContext({
      dataDir,
      databasePath: path.join(dataDir, "test.sqlite"),
      provider: new StubProvider()
    });

    await context.db.insert(sources).values([
      {
        id: "src_1",
        type: "markdown",
        title: "Source One",
        importedAt: new Date().toISOString(),
        filePath: null,
        privacyLevel: "L1_LOCAL_AI",
        projectKey: "atlas",
        hash: "hash-1",
        status: "confirmed",
        tagsJson: JSON.stringify(["maps"]),
        metadataJson: "{}",
        extractedText: "source one",
        errorMessage: null
      },
      {
        id: "src_2",
        type: "markdown",
        title: "Source Two",
        importedAt: new Date().toISOString(),
        filePath: null,
        privacyLevel: "L3_PUBLIC",
        projectKey: "atlas",
        hash: "hash-2",
        status: "confirmed",
        tagsJson: JSON.stringify(["maps"]),
        metadataJson: "{}",
        extractedText: "source two",
        errorMessage: null
      }
    ]);

    await context.db.insert(wikiNodes).values([
      {
        id: "node_1",
        nodeType: "theme",
        title: "Knowledge Mapping",
        summary: "Theme node",
        bodyMd: "Body",
        status: "accepted",
        sourceIdsJson: JSON.stringify(["src_1", "src_2"]),
        tagsJson: JSON.stringify(["maps", "passport"]),
        projectKey: "atlas",
        privacyLevel: "L3_PUBLIC",
        embeddingJson: null,
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
      }
    ]);

    await context.db.insert(postcards).values({
      id: "card_1",
      cardType: "knowledge",
      title: "Mapping Card",
      claim: "Claim",
      evidenceSummary: "Evidence",
      userView: "View",
      relatedNodeIdsJson: JSON.stringify(["node_1"]),
      relatedSourceIdsJson: JSON.stringify([]),
      privacyLevel: "L3_PUBLIC",
      version: 1,
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    });

    const overview = await getVisualOverview(context);

    expect(overview.summary.acceptedNodeCount).toBe(1);
    expect(overview.summary.postcardCount).toBe(1);
    expect(overview.themeClusters[0]?.tag).toBe("maps");
    expect(overview.evidenceChains[0]?.sourceCount).toBe(2);
    expect(overview.projectReuse[0]?.projectKey).toBe("atlas");
  });
});
