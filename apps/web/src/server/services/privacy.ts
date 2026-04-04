import type { PrivacyLevel } from "@ai-knowledge-passport/shared";

const visibilityRank: Record<PrivacyLevel, number> = {
  L0_SELF: 0,
  L1_LOCAL_AI: 1,
  L2_INVITED: 2,
  L3_PUBLIC: 3,
  L4_AGENT_ONLY: 4
};

export function getPrivacyRank(level: PrivacyLevel) {
  return visibilityRank[level];
}

export function canIncludeInPassport(itemLevel: PrivacyLevel, floor: PrivacyLevel) {
  const itemIsAgentOnly = itemLevel === "L4_AGENT_ONLY";
  const floorIsAgentOnly = floor === "L4_AGENT_ONLY";

  if (itemIsAgentOnly) {
    return floorIsAgentOnly;
  }

  if (floorIsAgentOnly) {
    return itemIsAgentOnly;
  }

  return getPrivacyRank(itemLevel) >= getPrivacyRank(floor);
}
