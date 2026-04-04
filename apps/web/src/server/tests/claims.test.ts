import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import type { ModelProvider } from "@/server/providers/model-provider";
import { createAppContext } from "@/server/context";
import { compileSource } from "@/server/services/compiler";
import { listClaims } from "@/server/services/claims";
import { createSourceImport } from "@/server/services/sources";

import { describe, expect, it } from "vitest";

class FakeProvider implements ModelProvider {
  readonly isConfigured = true;
  async extractStructured() { return { summary: "summary", keyClaims: [], concepts: [], themes: [], tags: [] }; }
  async summarizeAndLink(input: Parameters<ModelProvider["summarizeAndLink"]>[0]) {
    return {
      nodes: [
        {
          nodeType: "summary" as const,
          title: `${input.title} / Summary`,
          summary: input.text.slice(0, 80),
          bodyMd: input.text,
          tags: input.tags
        }
      ],
      relationHints: []
    };
  }
  async embedText(input: string[]) { return input.map(() => [0.1, 0.2, 0.3]); }
  async transcribeAudio() { return ""; }
  async generateAnswer() { return { answerMd: "", citations: [] }; }
  async generateCard() { return { claim: "", evidenceSummary: "", userView: "" }; }
  async generatePassport() { return { humanMarkdown: "", machineManifest: {} }; }
  async generateAvatarReply() { return { answerMd: "", citations: [] }; }
}

describe("claim service", () => {
  it("creates claim records from compilation output", async () => {
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "akp-claims-"));
    const dataDir = path.join(tempRoot, "data");
    await fs.mkdir(path.join(dataDir, "objects"), { recursive: true });
    await fs.mkdir(path.join(dataDir, "exports"), { recursive: true });
    await fs.mkdir(path.join(dataDir, "backups"), { recursive: true });

    const context = createAppContext({
      dataDir,
      databasePath: path.join(dataDir, "test.sqlite"),
      provider: new FakeProvider()
    });

    const imported = await createSourceImport(context, {
      payload: {
        type: "markdown",
        title: "Claim Source",
        privacyLevel: "L1_LOCAL_AI",
        textContent: "Claims should be visible as atomic units.",
        tags: ["claims"],
        metadata: {}
      }
    });

    await compileSource(context, imported.sourceId);
    const claims = await listClaims(context, 20);

    expect(claims.length).toBeGreaterThan(0);
    expect(claims[0]?.statement).toContain("Claims");
    expect(claims[0]?.sourceFragmentIds.length).toBeGreaterThan(0);
  });
});
