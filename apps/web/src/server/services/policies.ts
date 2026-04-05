import { eq } from "drizzle-orm";

import type {
  ObjectPolicyObjectType,
  ObjectPolicyRecord,
  ObjectPolicyUpsertInput,
  PrivacyLevel,
  ResolvedObjectPolicy
} from "@ai-knowledge-passport/shared";

import type { AppContext } from "@/server/context";
import {
  agentPackSnapshots,
  avatarProfiles,
  exportPackages,
  objectPolicies,
  passportSnapshots,
  visaBundles
} from "@/server/db/schema";

import { writeAuditLog } from "./audit";
import { createId, nowIso } from "./common";
import { getPrivacyRank } from "./privacy";

type PolicyRow = typeof objectPolicies.$inferSelect;

const defaultAllowances = {
  allowSecretLinks: true,
  allowMachineAccess: true,
  allowExports: true,
  allowAvatarBinding: true,
  allowAvatarSimulation: true
};

function toNullableBoolean(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return null;
  }
  return Boolean(value);
}

function toStoredBoolean(value: boolean | undefined) {
  if (value === undefined) {
    return null;
  }
  return value ? 1 : 0;
}

function parsePolicyRow(row: PolicyRow): ObjectPolicyRecord {
  return {
    id: row.id,
    objectType: row.objectType as ObjectPolicyObjectType,
    objectId: row.objectId,
    privacyFloorOverride: (row.privacyFloorOverride as PrivacyLevel | null) ?? null,
    allowSecretLinks: toNullableBoolean(row.allowSecretLinks),
    allowMachineAccess: toNullableBoolean(row.allowMachineAccess),
    allowExports: toNullableBoolean(row.allowExports),
    allowAvatarBinding: toNullableBoolean(row.allowAvatarBinding),
    allowAvatarSimulation: toNullableBoolean(row.allowAvatarSimulation),
    notes: row.notes,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

async function getDirectPolicy(context: AppContext, objectType: ObjectPolicyObjectType, objectId: string) {
  const row = await context.db.query.objectPolicies.findFirst({
    where: (table, { and, eq }) => and(eq(table.objectType, objectType), eq(table.objectId, objectId))
  });
  return row ? parsePolicyRow(row) : null;
}

async function getParentObject(context: AppContext, objectType: ObjectPolicyObjectType, objectId: string) {
  if (objectType === "passport_snapshot") {
    return null;
  }

  if (objectType === "visa_bundle") {
    const visa = await context.db.query.visaBundles.findFirst({
      where: eq(visaBundles.id, objectId)
    });
    return visa?.passportId ? { objectType: "passport_snapshot" as const, objectId: visa.passportId } : null;
  }

  if (objectType === "agent_pack_snapshot") {
    const pack = await context.db.query.agentPackSnapshots.findFirst({
      where: eq(agentPackSnapshots.id, objectId)
    });
    if (!pack) {
      return null;
    }
    if (pack.sourceVisaId) {
      return { objectType: "visa_bundle" as const, objectId: pack.sourceVisaId };
    }
    if (pack.sourcePassportId) {
      return { objectType: "passport_snapshot" as const, objectId: pack.sourcePassportId };
    }
    return null;
  }

  if (objectType === "avatar_profile") {
    const avatar = await context.db.query.avatarProfiles.findFirst({
      where: eq(avatarProfiles.id, objectId)
    });
    return avatar ? { objectType: "agent_pack_snapshot" as const, objectId: avatar.activePackId } : null;
  }

  if (objectType === "export_package") {
    const exportPackage = await context.db.query.exportPackages.findFirst({
      where: eq(exportPackages.id, objectId)
    });
    if (!exportPackage) {
      return null;
    }
    if (exportPackage.objectType === "agent_pack_snapshot") {
      return { objectType: "agent_pack_snapshot" as const, objectId: exportPackage.objectId };
    }
    return null;
  }

  return null;
}

async function getNativePrivacyFloor(context: AppContext, objectType: ObjectPolicyObjectType, objectId: string): Promise<PrivacyLevel | null> {
  if (objectType === "passport_snapshot") {
    const row = await context.db.query.passportSnapshots.findFirst({
      where: eq(passportSnapshots.id, objectId)
    });
    return (row?.privacyFloor as PrivacyLevel | undefined) ?? null;
  }

  if (objectType === "visa_bundle") {
    const row = await context.db.query.visaBundles.findFirst({
      where: eq(visaBundles.id, objectId)
    });
    return (row?.privacyFloor as PrivacyLevel | undefined) ?? null;
  }

  if (objectType === "agent_pack_snapshot") {
    const row = await context.db.query.agentPackSnapshots.findFirst({
      where: eq(agentPackSnapshots.id, objectId)
    });
    return (row?.privacyFloor as PrivacyLevel | undefined) ?? null;
  }

  if (objectType === "avatar_profile") {
    const parent = await getParentObject(context, objectType, objectId);
    if (!parent) {
      return null;
    }
    return getNativePrivacyFloor(context, parent.objectType, parent.objectId);
  }

  if (objectType === "export_package") {
    const parent = await getParentObject(context, objectType, objectId);
    if (!parent) {
      return null;
    }
    return getNativePrivacyFloor(context, parent.objectType, parent.objectId);
  }

  return null;
}

function pickEffectivePrivacyFloor(nativeFloor: PrivacyLevel | null, inheritedFloor: PrivacyLevel | null, overrideFloor: PrivacyLevel | null) {
  if (!nativeFloor && !inheritedFloor && !overrideFloor) {
    return null;
  }

  const candidates = [nativeFloor, inheritedFloor, overrideFloor].filter((value): value is PrivacyLevel => Boolean(value));
  return candidates.sort((left, right) => getPrivacyRank(left) - getPrivacyRank(right))[0] ?? null;
}

export async function resolveObjectPolicy(
  context: AppContext,
  objectType: ObjectPolicyObjectType,
  objectId: string
): Promise<ResolvedObjectPolicy> {
  const directPolicy = await getDirectPolicy(context, objectType, objectId);
  const parent = await getParentObject(context, objectType, objectId);
  const inherited = parent ? await resolveObjectPolicy(context, parent.objectType, parent.objectId) : null;
  const nativePrivacyFloor = await getNativePrivacyFloor(context, objectType, objectId);

  return {
    objectType,
    objectId,
    privacyFloor: pickEffectivePrivacyFloor(
      nativePrivacyFloor,
      inherited?.privacyFloor ?? null,
      directPolicy?.privacyFloorOverride ?? null
    ),
    allowSecretLinks: directPolicy?.allowSecretLinks ?? inherited?.allowSecretLinks ?? defaultAllowances.allowSecretLinks,
    allowMachineAccess: directPolicy?.allowMachineAccess ?? inherited?.allowMachineAccess ?? defaultAllowances.allowMachineAccess,
    allowExports: directPolicy?.allowExports ?? inherited?.allowExports ?? defaultAllowances.allowExports,
    allowAvatarBinding: directPolicy?.allowAvatarBinding ?? inherited?.allowAvatarBinding ?? defaultAllowances.allowAvatarBinding,
    allowAvatarSimulation: directPolicy?.allowAvatarSimulation ?? inherited?.allowAvatarSimulation ?? defaultAllowances.allowAvatarSimulation,
    chain: [{ objectType, objectId }, ...(inherited?.chain ?? [])],
    directPolicy
  };
}

export async function upsertObjectPolicy(context: AppContext, input: ObjectPolicyUpsertInput) {
  const existing = await context.db.query.objectPolicies.findFirst({
    where: (table, { and, eq }) => and(eq(table.objectType, input.objectType), eq(table.objectId, input.objectId))
  });

  if (existing) {
    await context.db
      .update(objectPolicies)
      .set({
        privacyFloorOverride: input.privacyFloorOverride ?? null,
        allowSecretLinks: toStoredBoolean(input.allowSecretLinks),
        allowMachineAccess: toStoredBoolean(input.allowMachineAccess),
        allowExports: toStoredBoolean(input.allowExports),
        allowAvatarBinding: toStoredBoolean(input.allowAvatarBinding),
        allowAvatarSimulation: toStoredBoolean(input.allowAvatarSimulation),
        notes: input.notes,
        updatedAt: nowIso()
      })
      .where(eq(objectPolicies.id, existing.id));

    await writeAuditLog(context, {
      actionType: "update_object_policy",
      objectType: "object_policy",
      objectId: existing.id,
      result: "succeeded",
      notes: `${input.objectType}:${input.objectId}`
    });

    return existing.id;
  }

  const policyId = createId("policy");
  await context.db.insert(objectPolicies).values({
    id: policyId,
    objectType: input.objectType,
    objectId: input.objectId,
    privacyFloorOverride: input.privacyFloorOverride ?? null,
    allowSecretLinks: toStoredBoolean(input.allowSecretLinks),
    allowMachineAccess: toStoredBoolean(input.allowMachineAccess),
    allowExports: toStoredBoolean(input.allowExports),
    allowAvatarBinding: toStoredBoolean(input.allowAvatarBinding),
    allowAvatarSimulation: toStoredBoolean(input.allowAvatarSimulation),
    notes: input.notes,
    createdAt: nowIso(),
    updatedAt: nowIso()
  });

  await writeAuditLog(context, {
    actionType: "create_object_policy",
    objectType: "object_policy",
    objectId: policyId,
    result: "succeeded",
    notes: `${input.objectType}:${input.objectId}`
  });

  return policyId;
}

export async function listObjectPolicies(context: AppContext, limit = 120) {
  const rows = await context.db.query.objectPolicies.findMany({
    limit
  });

  return rows.map(parsePolicyRow);
}

export async function assertPolicyAllows(
  context: AppContext,
  objectType: ObjectPolicyObjectType,
  objectId: string,
  capability: "secret_links" | "machine_access" | "exports" | "avatar_binding" | "avatar_simulation"
) {
  const resolved = await resolveObjectPolicy(context, objectType, objectId);

  const allowed =
    capability === "secret_links" ? resolved.allowSecretLinks
      : capability === "machine_access" ? resolved.allowMachineAccess
      : capability === "exports" ? resolved.allowExports
      : capability === "avatar_binding" ? resolved.allowAvatarBinding
      : resolved.allowAvatarSimulation;

  if (!allowed) {
    throw new Error(`Policy denied ${capability} for ${objectType}:${objectId}`);
  }

  return resolved;
}
