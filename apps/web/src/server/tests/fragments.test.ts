import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import type { ModelProvider } from "@/server/providers/model-provider";
import { createAppContext } from "@/server/context";
import { sourceFragments, sources } from "@/server/db/schema";
import { getFragment, listFragments } from "@/server/services/fragments";

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

describe("fragment service", () => {
  it("lists fragments with source metadata and stable anchors", async () => {
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "akp-fragments-"));
    const dataDir = path.join(tempRoot, "data");
    await fs.mkdir(path.join(dataDir, "objects"), { recursive: true });
    await fs.mkdir(path.join(dataDir, "exports"), { recursive: true });
    await fs.mkdir(path.join(dataDir, "backups"), { recursive: true });

    const context = createAppContext({
      dataDir,
      databasePath: path.join(dataDir, "test.sqlite"),
      provider: new StubProvider()
    });

    await context.db.insert(sources).values({
      id: "src_1",
      type: "markdown",
      title: "Fragment Source",
      importedAt: new Date().toISOString(),
      filePath: null,
      privacyLevel: "L1_LOCAL_AI",
      projectKey: "atlas",
      hash: "hash",
      status: "confirmed",
      tagsJson: JSON.stringify(["atlas"]),
      metadataJson: JSON.stringify({ normalization: { parser: "inline_text" } }),
      extractedText: "Fragment body",
      errorMessage: null
    });

    await context.db.insert(sourceFragments).values({
      id: "frag_1",
      sourceId: "src_1",
      fragmentIndex: 0,
      text: "This is a stable fragment.",
      tokenCount: 7,
      embeddingJson: null,
      createdAt: new Date().toISOString()
    });

    const fragments = await listFragments(context);
    const fragment = await getFragment(context, "frag_1");

    expect(fragments[0]?.anchorLabel).toBe("fragment-1");
    expect(fragments[0]?.source?.title).toBe("Fragment Source");
    expect(fragment?.source?.parser).toBe("inline_text");
    expect(fragment?.text).toContain("stable fragment");
  });
});
