import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import type { ModelProvider } from "@/server/providers/model-provider";
import { createAppContext } from "@/server/context";
import { wikiEdges, wikiNodes } from "@/server/db/schema";
import { createBackupRun } from "@/server/services/backups";
import { createId } from "@/server/services/common";
import { applyReviewAction, compileSource } from "@/server/services/compiler";
import { syncWikiNodeFts } from "@/server/services/fts";
import { createOutput } from "@/server/services/outputs";
import { createPassportSnapshot } from "@/server/services/passports";
import { createPostcard } from "@/server/services/postcards";
import { answerResearchQuery } from "@/server/services/research";
import { createSourceImport, listSources, retrySourceProcessing } from "@/server/services/sources";

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
      answerMd: `Based on local evidence, the question "${input.question}" can be answered as follows: ${input.evidence[0]?.text ?? ""}`,
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
      claim: "An AI knowledge passport is a structured projection of personal knowledge.",
      evidenceSummary: "Derived from accepted nodes, evidence chains, and explicit capability boundaries.",
      userView: "The core value is not storage alone, but compilation and authorization."
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

  async generateAvatarReply(input: Parameters<ModelProvider["generateAvatarReply"]>[0]) {
    return {
      answerMd: `Avatar reply grounded in pack evidence: ${input.evidence[0]?.text ?? ""}`,
      citations: input.evidence.slice(0, 2).map((entry, index) => ({
        refId: entry.refId,
        kind: "wiki_node" as const,
        excerpt: entry.text.slice(0, 80),
        score: 0.9 - index * 0.1
      }))
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
        textContent: "The core value of an AI personal knowledge passport is compiling raw material into a structured wiki and then exporting it under explicit authorization.",
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
      question: "What is the core value of this system?",
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
      title: "Value Postcard",
      cardType: "knowledge",
      claim: "A knowledge passport turns personal knowledge into an authorized asset.",
      evidenceSummary: "Backed by accepted wiki nodes and research outputs.",
      userView: "Compilation must exist before expression and delegation.",
      relatedNodeIds: [firstNode.id],
      relatedSourceIds: [importResult.sourceId],
      privacyLevel: "L1_LOCAL_AI"
    });
    expect(postcard.postcardId).toMatch(/^card_/);

    const passportId = await createPassportSnapshot(context, {
      title: "Test Passport",
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
      summary: "Existing knowledge node",
      bodyMd: "# AI Passport Notes\n\nExisting knowledge body",
      status: "accepted",
      sourceIdsJson: JSON.stringify(["src_existing"]),
      tagsJson: JSON.stringify(["passport"]),
      projectKey: "passport-mvp",
      privacyLevel: "L1_LOCAL_AI",
      embeddingJson: JSON.stringify((await context.provider.embedText(["AI Passport Notes / Summary\nExisting knowledge node"]))[0]),
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    });
    syncWikiNodeFts(context, {
      id: existingNodeId,
      title: "AI Passport Notes / Summary",
      summary: "Existing knowledge node",
      bodyMd: "# AI Passport Notes\n\nExisting knowledge body"
    });

    const importResult = await createSourceImport(context, {
      payload: {
        type: "markdown",
        title: "AI Passport Notes",
        privacyLevel: "L1_LOCAL_AI",
        projectKey: "passport-mvp",
        textContent: "This is a new source for a duplicate topic.",
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

  it("marks failed ingestion attempts and allows retry", async () => {
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "akp-test-fail-"));
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
        type: "url",
        title: "Broken URL",
        originUrl: "https://127.0.0.1.invalid.example.localhost",
        privacyLevel: "L1_LOCAL_AI",
        tags: [],
        metadata: {}
      }
    });

    const afterFailure = await listSources(context);
    expect(afterFailure[0]?.status).toBe("failed");
    expect(afterFailure[0]?.errorMessage).toBeTruthy();
    expect(afterFailure[0]?.latestJob?.status).toBe("failed");

    const retryResult = await retrySourceProcessing(context, importResult.sourceId);
    expect(retryResult.jobId).toMatch(/^job_/);
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
        summary: "Primary node",
        bodyMd: "Primary body",
        status: "accepted",
        sourceIdsJson: JSON.stringify(["src_a"]),
        tagsJson: JSON.stringify(["passport"]),
        projectKey: "passport-mvp",
        privacyLevel: "L1_LOCAL_AI",
        embeddingJson: JSON.stringify((await context.provider.embedText(["Knowledge Passport\nPrimary body"]))[0]),
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
      },
      {
        id: pendingNodeId,
        nodeType: "theme",
        title: "Knowledge Passport Candidate",
        summary: "Pending node",
        bodyMd: "Pending node body",
        status: "pending_review",
        sourceIdsJson: JSON.stringify(["src_b"]),
        tagsJson: JSON.stringify(["knowledge"]),
        projectKey: "passport-mvp",
        privacyLevel: "L1_LOCAL_AI",
        embeddingJson: JSON.stringify((await context.provider.embedText(["Knowledge Passport Candidate\nPending node body"]))[0]),
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
      },
      {
        id: relatedNodeId,
        nodeType: "concept",
        title: "Evidence Chain",
        summary: "Related node",
        bodyMd: "Related node body",
        status: "accepted",
        sourceIdsJson: JSON.stringify(["src_c"]),
        tagsJson: JSON.stringify(["evidence"]),
        projectKey: "passport-mvp",
        privacyLevel: "L1_LOCAL_AI",
        embeddingJson: JSON.stringify((await context.provider.embedText(["Evidence Chain\nRelated node body"]))[0]),
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
      }
    ]);

    syncWikiNodeFts(context, { id: targetNodeId, title: "Knowledge Passport", summary: "Primary node", bodyMd: "Primary body" });
    syncWikiNodeFts(context, { id: pendingNodeId, title: "Knowledge Passport Candidate", summary: "Pending node", bodyMd: "Pending node body" });
    syncWikiNodeFts(context, { id: relatedNodeId, title: "Evidence Chain", summary: "Related node", bodyMd: "Related node body" });

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

  it("returns an insufficient-evidence warning for comparison questions with only one source", async () => {
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "akp-test-research-weak-"));
    const dataDir = path.join(tempRoot, "data");
    await fs.mkdir(path.join(dataDir, "objects"), { recursive: true });
    await fs.mkdir(path.join(dataDir, "exports"), { recursive: true });
    await fs.mkdir(path.join(dataDir, "backups"), { recursive: true });

    const context = createAppContext({
      dataDir,
      databasePath: path.join(dataDir, "test.sqlite"),
      provider: new FakeProvider()
    });

    await createSourceImport(context, {
      payload: {
        type: "markdown",
        title: "Single Source",
        privacyLevel: "L1_LOCAL_AI",
        projectKey: "passport-mvp",
        textContent: "Knowledge passports emphasize evidence chains and authorization boundaries.",
        tags: ["passport"],
        metadata: {}
      }
    });

    const result = await answerResearchQuery(context, {
      question: "Compare the differences between knowledge passports and digital twins.",
      limit: 5,
      projectKey: "passport-mvp",
      tags: []
    });

    expect(result.warnings.some((warning) => warning.code === "insufficient_evidence")).toBe(true);
    expect(result.answerMd).toContain("Current local evidence is insufficient");
  });

  it("flags conflicting evidence when multiple sources contain contrasting cues", async () => {
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "akp-test-research-conflict-"));
    const dataDir = path.join(tempRoot, "data");
    await fs.mkdir(path.join(dataDir, "objects"), { recursive: true });
    await fs.mkdir(path.join(dataDir, "exports"), { recursive: true });
    await fs.mkdir(path.join(dataDir, "backups"), { recursive: true });

    const context = createAppContext({
      dataDir,
      databasePath: path.join(dataDir, "test.sqlite"),
      provider: new FakeProvider()
    });

    await createSourceImport(context, {
      payload: {
        type: "markdown",
        title: "View A",
        privacyLevel: "L1_LOCAL_AI",
        projectKey: "passport-mvp",
        textContent: "Knowledge passports work well for capability presentation, but they should not be treated as the same thing as digital twins.",
        tags: ["passport", "avatar"],
        metadata: {}
      }
    });

    await createSourceImport(context, {
      payload: {
        type: "markdown",
        title: "View B",
        privacyLevel: "L1_LOCAL_AI",
        projectKey: "passport-mvp",
        textContent: "Digital twins emphasize delegated behavior, whereas knowledge passports are more about evidence-based expression.",
        tags: ["passport", "avatar"],
        metadata: {}
      }
    });

    const result = await answerResearchQuery(context, {
      question: "Compare the relationship between knowledge passports and digital twins.",
      limit: 6,
      projectKey: "passport-mvp",
      tags: []
    });

    expect(result.warnings.some((warning) => warning.code === "conflicting_evidence")).toBe(true);
    expect(result.citations.length).toBeGreaterThan(0);
    expect(result.retrievalSummary.uniqueEvidenceRefs).toBeGreaterThan(1);
  });
});
