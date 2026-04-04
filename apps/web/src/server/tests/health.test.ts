import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import type { ModelProvider } from "@/server/providers/model-provider";
import { createAppContext } from "@/server/context";
import { backupRuns, researchSessions, sources, wikiNodes } from "@/server/db/schema";
import { createId } from "@/server/services/common";
import { getHealthReport } from "@/server/services/health";

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

describe("health report", () => {
  it("summarizes failed sources, duplicate nodes, weak research, traceability gaps, and backup posture", async () => {
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "akp-health-"));
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
      id: "src_failed",
      type: "markdown",
      title: "Broken Source",
      importedAt: new Date().toISOString(),
      filePath: null,
      privacyLevel: "L1_LOCAL_AI",
      projectKey: null,
      hash: "hash",
      status: "failed",
      tagsJson: "[]",
      metadataJson: "{}",
      extractedText: null,
      errorMessage: "Parser failed"
    });

    await context.db.insert(wikiNodes).values([
      {
        id: "node_a",
        nodeType: "summary",
        title: "Duplicate Topic",
        summary: "A",
        bodyMd: "A",
        status: "accepted",
        sourceIdsJson: JSON.stringify(["src_a"]),
        tagsJson: JSON.stringify(["a"]),
        projectKey: null,
        privacyLevel: "L1_LOCAL_AI",
        embeddingJson: null,
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
      },
      {
        id: "node_b",
        nodeType: "summary",
        title: "Duplicate Topic",
        summary: "B",
        bodyMd: "B",
        status: "pending_review",
        sourceIdsJson: JSON.stringify([]),
        tagsJson: JSON.stringify(["b"]),
        projectKey: null,
        privacyLevel: "L1_LOCAL_AI",
        embeddingJson: null,
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
      }
    ]);

    await context.db.insert(researchSessions).values({
      id: "research_1",
      question: "Weak question",
      answerMd: "Short answer",
      citationsJson: JSON.stringify([]),
      projectKey: null,
      tagsJson: JSON.stringify([]),
      createdAt: new Date().toISOString()
    });

    await context.db.insert(backupRuns).values({
      id: createId("backup"),
      filePath: "/tmp/old-backup.zip",
      manifestJson: JSON.stringify({ backupId: "backup_old", createdAt: new Date().toISOString(), databasePath: "/tmp/db", note: "old", databaseSha256: "abc", objectFileCount: 1 }),
      note: "old backup",
      status: "succeeded",
      createdAt: new Date(Date.now() - (9 * 24 * 60 * 60 * 1000)).toISOString()
    });

    const report = await getHealthReport(context);

    expect(report.summary.failedSources).toBe(1);
    expect(report.summary.pendingReviewNodes).toBe(1);
    expect(report.summary.duplicateGroups).toBe(1);
    expect(report.summary.weakResearchSessions).toBe(1);
    expect(report.summary.traceabilityGaps).toBe(1);
    expect(report.summary.backupStatus).toBe("stale");
    expect(report.suggestions.length).toBeGreaterThan(0);
  });
});
