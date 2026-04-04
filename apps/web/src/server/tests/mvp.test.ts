import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import type { ModelProvider } from "@/server/providers/model-provider";
import { createAppContext } from "@/server/context";
import { wikiEdges, wikiNodes } from "@/server/db/schema";
import { createBackupRun } from "@/server/services/backups";
import { applyReviewAction, compileSource } from "@/server/services/compiler";
import { createOutput } from "@/server/services/outputs";
import { createPassportSnapshot } from "@/server/services/passports";
import { createPostcard } from "@/server/services/postcards";
import { answerResearchQuery } from "@/server/services/research";
import { createSourceImport, listSources } from "@/server/services/sources";
import { syncWikiNodeFts } from "@/server/services/fts";
import { createId } from "@/server/services/common";

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

    const backupId = await createBackupRun(context, "test_backup");
    expect(backupId).toMatch(/^backup_/);
    const backupFiles = await fs.readdir(path.join(dataDir, "backups"));
    expect(backupFiles.some((entry) => entry.endsWith(".zip"))).toBe(true);
  });

  it("deduplicates compile candidates against accepted nodes and attaches the source", async () => {
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "akp-test-dup-"));
    const dataDir = path.join(tempRoot, "data");
    await fs.mkdir(path.join(dataDir, "objects"), { recursive: true });
    await fs.mkdir(path.join(dataDir, "exports"), { recursive: true });
    await fs.mkdir(path.join(dataDir, "backups"), { recursive: true });

    const context = createAppContext({
      dataDir,
      databasePath: path.join(dataDir, "test.sqlite"),
      provider: new FakeProvider()
    });

    const existingNodeId = createId("node");
    await context.db.insert(wikiNodes).values({
      id: existingNodeId,
      nodeType: "summary",
      title: "AI Passport Notes / Summary",
      summary: "已有知识节点",
      bodyMd: "# AI Passport Notes\n\n已有知识节点正文",
      status: "accepted",
      sourceIdsJson: JSON.stringify(["src_existing"]),
      tagsJson: JSON.stringify(["passport"]),
      projectKey: "passport-mvp",
      privacyLevel: "L1_LOCAL_AI",
      embeddingJson: JSON.stringify((await context.provider.embedText(["AI Passport Notes / Summary\n已有知识节点"]))[0]),
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    });
    syncWikiNodeFts(context, {
      id: existingNodeId,
      title: "AI Passport Notes / Summary",
      summary: "已有知识节点",
      bodyMd: "# AI Passport Notes\n\n已有知识节点正文"
    });

    const importResult = await createSourceImport(context, {
      payload: {
        type: "markdown",
        title: "AI Passport Notes",
        privacyLevel: "L1_LOCAL_AI",
        projectKey: "passport-mvp",
        textContent: "这是一个重复主题的新来源。",
        tags: ["passport", "knowledge"],
        metadata: {}
      }
    });

    const inserted = await compileSource(context, importResult.sourceId);
    expect(inserted).toHaveLength(0);

    const updatedNode = await context.db.query.wikiNodes.findFirst({
      where: (table, { eq }) => eq(table.id, existingNodeId)
    });
    expect(updatedNode).toBeTruthy();
    expect(updatedNode?.sourceIdsJson).toContain(importResult.sourceId);

    const sourceRows = await listSources(context);
    expect(sourceRows[0]?.status).toBe("confirmed");
  });

  it("merges pending nodes into an existing target and redirects edges", async () => {
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "akp-test-merge-"));
    const dataDir = path.join(tempRoot, "data");
    await fs.mkdir(path.join(dataDir, "objects"), { recursive: true });
    await fs.mkdir(path.join(dataDir, "exports"), { recursive: true });
    await fs.mkdir(path.join(dataDir, "backups"), { recursive: true });

    const context = createAppContext({
      dataDir,
      databasePath: path.join(dataDir, "test.sqlite"),
      provider: new FakeProvider()
    });

    const targetNodeId = createId("node");
    const pendingNodeId = createId("node");
    const relatedNodeId = createId("node");

    await context.db.insert(wikiNodes).values([
      {
        id: targetNodeId,
        nodeType: "theme",
        title: "Knowledge Passport",
        summary: "主节点",
        bodyMd: "主节点正文",
        status: "accepted",
        sourceIdsJson: JSON.stringify(["src_a"]),
        tagsJson: JSON.stringify(["passport"]),
        projectKey: "passport-mvp",
        privacyLevel: "L1_LOCAL_AI",
        embeddingJson: JSON.stringify((await context.provider.embedText(["Knowledge Passport\n主节点正文"]))[0]),
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
      },
      {
        id: pendingNodeId,
        nodeType: "theme",
        title: "Knowledge Passport Candidate",
        summary: "待合并节点",
        bodyMd: "待合并节点正文",
        status: "pending_review",
        sourceIdsJson: JSON.stringify(["src_b"]),
        tagsJson: JSON.stringify(["knowledge"]),
        projectKey: "passport-mvp",
        privacyLevel: "L1_LOCAL_AI",
        embeddingJson: JSON.stringify((await context.provider.embedText(["Knowledge Passport Candidate\n待合并节点正文"]))[0]),
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
      },
      {
        id: relatedNodeId,
        nodeType: "concept",
        title: "Evidence Chain",
        summary: "关联节点",
        bodyMd: "关联节点正文",
        status: "accepted",
        sourceIdsJson: JSON.stringify(["src_c"]),
        tagsJson: JSON.stringify(["evidence"]),
        projectKey: "passport-mvp",
        privacyLevel: "L1_LOCAL_AI",
        embeddingJson: JSON.stringify((await context.provider.embedText(["Evidence Chain\n关联节点正文"]))[0]),
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
      }
    ]);

    syncWikiNodeFts(context, { id: targetNodeId, title: "Knowledge Passport", summary: "主节点", bodyMd: "主节点正文" });
    syncWikiNodeFts(context, { id: pendingNodeId, title: "Knowledge Passport Candidate", summary: "待合并节点", bodyMd: "待合并节点正文" });
    syncWikiNodeFts(context, { id: relatedNodeId, title: "Evidence Chain", summary: "关联节点", bodyMd: "关联节点正文" });

    await context.db.insert(wikiEdges).values([
      {
        id: createId("edge"),
        fromNodeId: pendingNodeId,
        toNodeId: relatedNodeId,
        relationType: "related",
        weight: 0.8,
        createdAt: new Date().toISOString()
      },
      {
        id: createId("edge"),
        fromNodeId: relatedNodeId,
        toNodeId: pendingNodeId,
        relationType: "related",
        weight: 0.8,
        createdAt: new Date().toISOString()
      }
    ]);

    await applyReviewAction(context, {
      nodeId: pendingNodeId,
      action: "merge",
      mergedIntoNodeId: targetNodeId,
      note: "merge into accepted target"
    });

    const mergedTarget = await context.db.query.wikiNodes.findFirst({
      where: (table, { eq }) => eq(table.id, targetNodeId)
    });
    const mergedNode = await context.db.query.wikiNodes.findFirst({
      where: (table, { eq }) => eq(table.id, pendingNodeId)
    });
    const redirectedEdges = await context.db.query.wikiEdges.findMany();

    expect(mergedTarget?.sourceIdsJson).toContain("src_b");
    expect(mergedTarget?.tagsJson).toContain("knowledge");
    expect(mergedTarget?.bodyMd).toContain("Merged Candidate");
    expect(mergedNode?.status).toBe("merged");
    expect(redirectedEdges.some((edge) => edge.fromNodeId === targetNodeId && edge.toNodeId === relatedNodeId)).toBe(true);
    expect(redirectedEdges.some((edge) => edge.fromNodeId === relatedNodeId && edge.toNodeId === targetNodeId)).toBe(true);
  });
});
