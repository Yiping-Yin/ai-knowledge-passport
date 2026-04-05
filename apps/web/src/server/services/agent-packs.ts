import { eq, inArray } from "drizzle-orm";

import type { AgentPackCreateInput, AgentPackSnapshot, AgentPackSummary, PrivacyLevel } from "@ai-knowledge-passport/shared";

import type { AppContext } from "@/server/context";
import { agentPackSnapshots, passportSnapshots, postcards, visaBundles, wikiNodes } from "@/server/db/schema";

import { writeAuditLog } from "./audit";
import { createId, nowIso, parseJsonArray } from "./common";
import { assertPolicyAllows } from "./policies";
import { canIncludeInPassport } from "./privacy";

type PackNode = {
  id: string;
  title: string;
  summary: string;
  tags: string[];
  projectKey: string | null;
};

type PackPostcard = {
  id: string;
  title: string;
  claim: string;
  cardType: string;
  relatedNodeIds: string[];
};

function buildAgentPackHumanMarkdown(input: {
  title: string;
  sourcePassportId: string | null;
  sourceVisaId: string | null;
  nodes: PackNode[];
  postcards: PackPostcard[];
}) {
  const lines: string[] = [
    `# ${input.title}`,
    "",
    `Source passport: ${input.sourcePassportId ?? "none"}`,
    `Source visa: ${input.sourceVisaId ?? "none"}`
  ];

  if (input.postcards.length) {
    lines.push("", "## Postcards");
    for (const card of input.postcards) {
      lines.push("", `### ${card.title}`, "", card.claim, "", `Type: ${card.cardType}`);
    }
  }

  if (input.nodes.length) {
    lines.push("", "## Nodes");
    for (const node of input.nodes) {
      lines.push(
        "",
        `### ${node.title}`,
        "",
        node.summary,
        "",
        `Tags: ${node.tags.length ? node.tags.join(", ") : "None"}`,
        `Project: ${node.projectKey ?? "None"}`
      );
    }
  }

  return lines.join("\n");
}

function buildAgentPackMachineManifest(input: {
  packId: string;
  title: string;
  sourcePassportId: string | null;
  sourceVisaId: string | null;
  privacyFloor: PrivacyLevel;
  nodes: PackNode[];
  postcards: PackPostcard[];
}) {
  return {
    agentPackId: input.packId,
    title: input.title,
    generatedAt: nowIso(),
    sourcePassportId: input.sourcePassportId,
    sourceVisaId: input.sourceVisaId,
    privacyFloor: input.privacyFloor,
    stats: {
      nodeCount: input.nodes.length,
      postcardCount: input.postcards.length
    },
    nodes: input.nodes.map((node) => ({
      id: node.id,
      title: node.title,
      summary: node.summary,
      tags: node.tags,
      projectKey: node.projectKey
    })),
    postcards: input.postcards.map((card) => ({
      id: card.id,
      title: card.title,
      claim: card.claim,
      cardType: card.cardType,
      relatedNodeIds: card.relatedNodeIds
    }))
  };
}

async function resolveSourceSelections(
  context: AppContext,
  input: AgentPackCreateInput
) {
  if (input.passportId && input.visaId) {
    throw new Error("Agent packs must be created from either one passport, one visa, or explicit selections.");
  }

  if (input.passportId) {
    const passport = await context.db.query.passportSnapshots.findFirst({
      where: eq(passportSnapshots.id, input.passportId)
    });
    if (!passport) {
      throw new Error("Source passport snapshot not found.");
    }
    const useSnapshot = !input.includeNodeIds.length && !input.includePostcardIds.length;
    return {
      sourcePassportId: passport.id,
      sourceVisaId: null,
      includeNodeIds: useSnapshot ? parseJsonArray<string>(passport.includeNodeIdsJson) : input.includeNodeIds,
      includePostcardIds: useSnapshot ? parseJsonArray<string>(passport.includePostcardIdsJson) : input.includePostcardIds
    };
  }

  if (input.visaId) {
    const visa = await context.db.query.visaBundles.findFirst({
      where: eq(visaBundles.id, input.visaId)
    });
    if (!visa) {
      throw new Error("Source visa bundle not found.");
    }
    const useSnapshot = !input.includeNodeIds.length && !input.includePostcardIds.length;
    return {
      sourcePassportId: null,
      sourceVisaId: visa.id,
      includeNodeIds: useSnapshot ? parseJsonArray<string>(visa.includeNodeIdsJson) : input.includeNodeIds,
      includePostcardIds: useSnapshot ? parseJsonArray<string>(visa.includePostcardIdsJson) : input.includePostcardIds
    };
  }

  return {
    sourcePassportId: null,
    sourceVisaId: null,
    includeNodeIds: input.includeNodeIds,
    includePostcardIds: input.includePostcardIds
  };
}

function parsePackSummary(row: typeof agentPackSnapshots.$inferSelect): AgentPackSummary {
  return {
    id: row.id,
    title: row.title,
    sourcePassportId: row.sourcePassportId ?? null,
    sourceVisaId: row.sourceVisaId ?? null,
    includeNodeIds: parseJsonArray<string>(row.includeNodeIdsJson),
    includePostcardIds: parseJsonArray<string>(row.includePostcardIdsJson),
    privacyFloor: row.privacyFloor as PrivacyLevel,
    createdAt: row.createdAt
  };
}

function parsePackSnapshot(row: typeof agentPackSnapshots.$inferSelect): AgentPackSnapshot {
  return {
    ...parsePackSummary(row),
    humanMarkdown: row.humanMarkdown,
    machineManifest: JSON.parse(row.machineManifestJson) as Record<string, unknown>
  };
}

export async function createAgentPackSnapshot(context: AppContext, input: AgentPackCreateInput) {
  let effectivePrivacyFloor = input.privacyFloor;
  if (input.passportId) {
    const sourcePolicy = await assertPolicyAllows(context, "passport_snapshot", input.passportId, "avatar_binding");
    effectivePrivacyFloor = sourcePolicy.privacyFloor ?? input.privacyFloor;
  }
  if (input.visaId) {
    const sourcePolicy = await assertPolicyAllows(context, "visa_bundle", input.visaId, "avatar_binding");
    effectivePrivacyFloor = sourcePolicy.privacyFloor ?? input.privacyFloor;
  }

  const resolved = await resolveSourceSelections(context, input);
  if (!resolved.includeNodeIds.length && !resolved.includePostcardIds.length) {
    throw new Error("Agent packs must include at least one node or postcard, or inherit them from a source passport/visa.");
  }

  const nodeRows = resolved.includeNodeIds.length
    ? await context.db.query.wikiNodes.findMany({
        where: inArray(wikiNodes.id, resolved.includeNodeIds)
      })
    : [];
  const postcardRows = resolved.includePostcardIds.length
    ? await context.db.query.postcards.findMany({
        where: inArray(postcards.id, resolved.includePostcardIds)
      })
    : [];

  if (nodeRows.length !== resolved.includeNodeIds.length) {
    throw new Error("One or more selected nodes could not be found.");
  }
  if (postcardRows.length !== resolved.includePostcardIds.length) {
    throw new Error("One or more selected postcards could not be found.");
  }
  if (nodeRows.some((node) => node.status !== "accepted")) {
    throw new Error("Agent packs can only include accepted nodes.");
  }

  const nodes: PackNode[] = nodeRows
    .filter((node) => canIncludeInPassport(node.privacyLevel as PrivacyLevel, effectivePrivacyFloor))
    .map((node) => ({
      id: node.id,
      title: node.title,
      summary: node.summary,
      tags: parseJsonArray<string>(node.tagsJson),
      projectKey: node.projectKey
    }));

  const cards: PackPostcard[] = postcardRows
    .filter((card) => canIncludeInPassport(card.privacyLevel as PrivacyLevel, effectivePrivacyFloor))
    .map((card) => ({
      id: card.id,
      title: card.title,
      claim: card.claim,
      cardType: card.cardType,
      relatedNodeIds: parseJsonArray<string>(card.relatedNodeIdsJson)
    }));

  if (!nodes.length && !cards.length) {
    throw new Error("No selected content remained visible after applying the agent pack privacy floor.");
  }

  const packId = createId("pack");
  const humanMarkdown = buildAgentPackHumanMarkdown({
    title: input.title,
    sourcePassportId: resolved.sourcePassportId,
    sourceVisaId: resolved.sourceVisaId,
    nodes,
    postcards: cards
  });
  const machineManifest = buildAgentPackMachineManifest({
    packId,
    title: input.title,
    sourcePassportId: resolved.sourcePassportId,
    sourceVisaId: resolved.sourceVisaId,
    privacyFloor: effectivePrivacyFloor,
    nodes,
    postcards: cards
  });

  await context.db.insert(agentPackSnapshots).values({
    id: packId,
    title: input.title,
    sourcePassportId: resolved.sourcePassportId,
    sourceVisaId: resolved.sourceVisaId,
    humanMarkdown,
    machineManifestJson: JSON.stringify(machineManifest),
    includeNodeIdsJson: JSON.stringify(nodes.map((node) => node.id)),
    includePostcardIdsJson: JSON.stringify(cards.map((card) => card.id)),
    privacyFloor: effectivePrivacyFloor,
    createdAt: nowIso()
  });

  const auditId = await writeAuditLog(context, {
    actionType: "create_agent_pack",
    objectType: "agent_pack_snapshot",
    objectId: packId,
    result: "succeeded",
    notes: input.title
  });

  return {
    packId,
    auditId
  };
}

export async function listAgentPacks(context: AppContext, limit = 80) {
  const rows = await context.db.query.agentPackSnapshots.findMany({
    limit
  });
  return rows.map(parsePackSummary);
}

export async function getAgentPackSnapshot(context: AppContext, packId: string) {
  const row = await context.db.query.agentPackSnapshots.findFirst({
    where: eq(agentPackSnapshots.id, packId)
  });
  return row ? parsePackSnapshot(row) : null;
}
