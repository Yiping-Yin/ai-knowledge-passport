import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import type { ModelProvider } from "@/server/providers/model-provider";
import { createAppContext } from "@/server/context";
import { createGrant, listGrants, revokeGrant } from "@/server/services/grants";

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
  async generateLearnerState() { return { capabilitySignals: [], mistakePatterns: [] }; }
  async generateAvatarReply() { return { answerMd: "", citations: [] }; }
}

describe("grant service", () => {
  it("creates and revokes explicit grant records", async () => {
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "akp-grants-"));
    const dataDir = path.join(tempRoot, "data");
    await fs.mkdir(path.join(dataDir, "objects"), { recursive: true });
    await fs.mkdir(path.join(dataDir, "exports"), { recursive: true });
    await fs.mkdir(path.join(dataDir, "backups"), { recursive: true });

    const context = createAppContext({
      dataDir,
      databasePath: path.join(dataDir, "test.sqlite"),
      provider: new StubProvider()
    });

    const grantId = await createGrant(context, {
      objectType: "passport_snapshot",
      objectId: "passport_1",
      granteeType: "collaborator",
      granteeId: "alice@example.com",
      accessLevel: "passport_read",
      notes: "limited partner access"
    });

    let grants = await listGrants(context, 20);
    expect(grants[0]?.id).toBe(grantId);
    expect(grants[0]?.status).toBe("active");
    expect(grants[0]?.accessLevel).toBe("passport_read");

    await revokeGrant(context, grantId);
    grants = await listGrants(context, 20);
    expect(grants[0]?.status).toBe("revoked");
  });

  it("rejects non-canonical access scopes", async () => {
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "akp-grants-invalid-"));
    const dataDir = path.join(tempRoot, "data");
    await fs.mkdir(path.join(dataDir, "objects"), { recursive: true });
    await fs.mkdir(path.join(dataDir, "exports"), { recursive: true });
    await fs.mkdir(path.join(dataDir, "backups"), { recursive: true });

    const context = createAppContext({
      dataDir,
      databasePath: path.join(dataDir, "test.sqlite"),
      provider: new StubProvider()
    });

    await expect(
      createGrant(context, {
        objectType: "visa_bundle",
        objectId: "visa_1",
        granteeType: "secret_link",
        accessLevel: "read_only" as never
      })
    ).rejects.toThrow();
  });
});
