import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import type { ModelProvider } from "@/server/providers/model-provider";
import { createAppContext } from "@/server/context";
import { getAuditSummary, listAuditLogs, writeAuditLog } from "@/server/services/audit";

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

describe("audit service", () => {
  it("lists and summarizes audit events with filters", async () => {
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "akp-audit-"));
    const dataDir = path.join(tempRoot, "data");
    await fs.mkdir(path.join(dataDir, "objects"), { recursive: true });
    await fs.mkdir(path.join(dataDir, "exports"), { recursive: true });
    await fs.mkdir(path.join(dataDir, "backups"), { recursive: true });

    const context = createAppContext({
      dataDir,
      databasePath: path.join(dataDir, "test.sqlite"),
      provider: new StubProvider()
    });

    await writeAuditLog(context, {
      actionType: "import",
      objectType: "source",
      objectId: "src_1",
      result: "succeeded"
    });
    await writeAuditLog(context, {
      actionType: "compile_source",
      objectType: "source",
      objectId: "src_1",
      result: "failed",
      notes: "compile blew up"
    });
    await writeAuditLog(context, {
      actionType: "restore_backup",
      objectType: "backup_run",
      objectId: "backup_1",
      result: "warning"
    });

    const summary = await getAuditSummary(context);
    const failedOnly = await listAuditLogs(context, { result: "failed" });

    expect(summary.total).toBe(3);
    expect(summary.failed).toBe(1);
    expect(summary.warning).toBe(1);
    expect(failedOnly).toHaveLength(1);
    expect(failedOnly[0]?.notes).toContain("compile");
  });
});
