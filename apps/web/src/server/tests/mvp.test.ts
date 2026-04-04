import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import type { ModelProvider } from "@/server/providers/model-provider";
import { createAppContext } from "@/server/context";
import { wikiNodes } from "@/server/db/schema";
import { createBackupRun } from "@/server/services/backups";
import { createId } from "@/server/services/common";
import { applyReviewAction, compileSource } from "@/server/services/compiler";
import { createOutput } from "@/server/services/outputs";
import { createPassportSnapshot } from "@/server/services/passports";
import { createPostcard } from "@/server/services/postcards";
import { answerResearchQuery } from "@/server/services/research";
import { createSourceImport, listSources } from "@/server/services/sources";

import { describe, expect, it } from "vitest";

class FakeProvider implements ModelProvider {
  readonly isConfigured = true;

  async extractStructured() {
    return {
      summary: "summary",
      keyClaims: ["claim"],
      concepts: ["concept"],
      themes: ["theme"],
      tags: ["passport"]
    };
  }

  async summarizeAndLink(input: Parameters<ModelProvider["summarizeAndLink"]>[0]) {
    return {
      nodes: [
        {
          nodeType: "summary" as const,
          title: `${input.title} / Summary`,
          summary: input.text.slice(0, 120),
          bodyMd: `# ${input.title}\n\n${input.text}`,
          tags: input.tags.length ? input.tags : ["passport"]
        }
      ],
      relationHints: []
    };
  }

  async embedText(input: string[]) {
    return input.map((entry) => {
      const chars = Array.from(entry).slice(0, 6).map((char) => char.charCodeAt(0) / 255);
      while (chars.length < 6) {
        chars.push(0);
      }
      return chars;
    });
  }

  async transcribeAudio() {
    return "transcribed audio";
  }

  async generateAnswer(input: Parameters<ModelProvider["generateAnswer"]>[0]) {
    return {
      answerMd: `基于本地证据，问题“${input.question}”可以先得到以下结论：${input.evidence[0]?.text ?? ""}`,
      citations: input.evidence.slice(0, 2).map((entry, index) => ({
        refId: entry.refId,
        kind: entry.kind,
        excerpt: entry.text.slice(0, 80),
        score: 0.9 - index * 0.1
      }))
    };
  }

  async generateCard() {
    return {
      claim: "AI 知识护照是对个人知识的结构化投影。",
      evidenceSummary: "基于已确认节点总结出的能力边界与证据链。",
      userView: "核心价值不在存储，而在编译与授权。"
    };
  }

  async generatePassport(input: Parameters<ModelProvider["generatePassport"]>[0]) {
    return {
      humanMarkdown: `# ${input.title}\n\n## Themes\n\n${input.nodes.map((node) => `- ${node.title}`).join("\n")}`,
      machineManifest: {
        title: input.title,
        nodeCount: input.nodes.length,
        postcardCount: input.postcards.length,
        privacyFloor: input.privacyFloor
      }
    };
  }
}

describe("knowledge passport MVP flow", () => {
  it("runs import -> compile -> review -> research -> output -> postcard -> passport -> backup", async () => {
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "akp-test-"));
    const dataDir = path.join(tempRoot, "data");
    await fs.mkdir(path.join(dataDir, "objects"), { recursive: true });
    await fs.mkdir(path.join(dataDir, "exports"), { recursive: true });
    await fs.mkdir(path.join(dataDir, "backups"), { recursive: true });

    const context = createAppContext({
      dataDir,
      databasePath: path.join(dataDir, "test.sqlite"),
      provider: new FakeProvider()
    });

    const importResult = await createSourceImport(context, {
      payload: {
        type: "markdown",
        title: "AI Passport Notes",
        privacyLevel: "L1_LOCAL_AI",
        projectKey: "passport-mvp",
        textContent: "AI 个人知识护照的核心是把原始材料编译为结构化 wiki，再授权输出。",
        tags: ["passport", "knowledge"],
        metadata: {}
      }
    });

    expect(importResult.sourceId).toMatch(/^src_/);
    const sources = await listSources(context);
    expect(sources[0]?.status).toBe("ready_for_compile");

    const nodes = await compileSource(context, importResult.sourceId);
    expect(nodes.length).toBeGreaterThan(0);
    const firstNode = nodes[0];
    expect(firstNode).toBeDefined();
    if (!firstNode) {
      throw new Error("Expected at least one compiled node");
    }

    await applyReviewAction(context, {
      nodeId: firstNode.id,
      action: "accept",
      note: "looks good"
    });

    const research = await answerResearchQuery(context, {
      question: "这个系统的核心价值是什么？",
      limit: 5,
      projectKey: "passport-mvp",
      tags: []
    });
    expect(research.citations.length).toBeGreaterThan(0);

    const output = await createOutput(context, {
      title: "Research Memo",
      outputType: "markdown_memo",
      content: research.answerMd,
      relatedNodeIds: [firstNode.id],
      relatedSourceIds: [importResult.sourceId],
      promptContext: "mvp-test",
      flowbackMode: "new_node"
    });
    expect(output.flowbackNodeId).toMatch(/^node_/);

    const postcard = await createPostcard(context, {
      title: "价值明信片",
      cardType: "knowledge",
      claim: "知识护照把个人知识变成可授权资产。",
      evidenceSummary: "来自已确认 wiki node 与研究输出。",
      userView: "先有编译，才有表达与代理。",
      relatedNodeIds: [firstNode.id],
      relatedSourceIds: [importResult.sourceId],
      privacyLevel: "L1_LOCAL_AI"
    });
    expect(postcard.postcardId).toMatch(/^card_/);

    const passportId = await createPassportSnapshot(context, {
      title: "测试护照",
      includeNodeIds: [firstNode.id],
      includePostcardIds: [postcard.postcardId],
      privacyFloor: "L1_LOCAL_AI"
    });
    expect(passportId).toMatch(/^passport_/);
    const passports = await context.db.query.passportSnapshots.findMany();
    const machineManifest = JSON.parse(passports[0]?.machineManifestJson ?? "{}") as { stats?: { nodeCount?: number; postcardCount?: number } };
    expect(machineManifest.stats?.nodeCount).toBe(1);
    expect(machineManifest.stats?.postcardCount).toBe(1);

    const backupId = await createBackupRun(context, "test_backup");
    expect(backupId).toMatch(/^backup_/);
    const backupFiles = await fs.readdir(path.join(dataDir, "backups"));
    expect(backupFiles.some((entry) => entry.endsWith(".zip"))).toBe(true);
  });

  it("filters passport contents by privacy floor", async () => {
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "akp-test-passport-privacy-"));
    const dataDir = path.join(tempRoot, "data");
    await fs.mkdir(path.join(dataDir, "objects"), { recursive: true });
    await fs.mkdir(path.join(dataDir, "exports"), { recursive: true });
    await fs.mkdir(path.join(dataDir, "backups"), { recursive: true });

    const context = createAppContext({
      dataDir,
      databasePath: path.join(dataDir, "test.sqlite"),
      provider: new FakeProvider()
    });

    const lowNodeId = createId("node");
    const publicNodeId = createId("node");
    await context.db.insert(wikiNodes).values([
      {
        id: lowNodeId,
        nodeType: "summary",
        title: "Private Node",
        summary: "Only local AI can see this",
        bodyMd: "private body",
        status: "accepted",
        sourceIdsJson: JSON.stringify(["src_private"]),
        tagsJson: JSON.stringify(["private"]),
        projectKey: "passport-mvp",
        privacyLevel: "L1_LOCAL_AI",
        embeddingJson: null,
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
      },
      {
        id: publicNodeId,
        nodeType: "summary",
        title: "Public Node",
        summary: "Public facing summary",
        bodyMd: "public body",
        status: "accepted",
        sourceIdsJson: JSON.stringify(["src_public"]),
        tagsJson: JSON.stringify(["public"]),
        projectKey: "passport-mvp",
        privacyLevel: "L3_PUBLIC",
        embeddingJson: null,
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
      }
    ]);

    const privateCard = await createPostcard(context, {
      title: "Private Card",
      cardType: "knowledge",
      claim: "private",
      evidenceSummary: "private evidence",
      userView: "private view",
      relatedNodeIds: [lowNodeId],
      relatedSourceIds: [],
      privacyLevel: "L1_LOCAL_AI"
    });

    const publicCard = await createPostcard(context, {
      title: "Public Card",
      cardType: "knowledge",
      claim: "public",
      evidenceSummary: "public evidence",
      userView: "public view",
      relatedNodeIds: [publicNodeId],
      relatedSourceIds: [],
      privacyLevel: "L3_PUBLIC"
    });

    const passportId = await createPassportSnapshot(context, {
      title: "Public Passport",
      includeNodeIds: [lowNodeId, publicNodeId],
      includePostcardIds: [privateCard.postcardId, publicCard.postcardId],
      privacyFloor: "L3_PUBLIC"
    });

    const passport = await context.db.query.passportSnapshots.findFirst({
      where: (table, { eq }) => eq(table.id, passportId)
    });
    expect(passport?.includeNodeIdsJson).toContain(publicNodeId);
    expect(passport?.includeNodeIdsJson).not.toContain(lowNodeId);
    expect(passport?.includePostcardIdsJson).toContain(publicCard.postcardId);
    expect(passport?.includePostcardIdsJson).not.toContain(privateCard.postcardId);
  });
});
