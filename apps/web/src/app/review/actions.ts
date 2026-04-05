"use server";

import { revalidatePath } from "next/cache";

import { getAppContext } from "@/server/context";
import { applyReviewAction } from "@/server/services/compiler";
import { reviewCapabilitySignal, reviewMistakePattern } from "@/server/services/signals";

export async function submitReviewAction(formData: FormData) {
  const itemType = String(formData.get("itemType") ?? "node");
  const nodeId = String(formData.get("nodeId") ?? "");
  const signalId = String(formData.get("signalId") ?? "");
  const mistakeId = String(formData.get("mistakeId") ?? "");
  const action = String(formData.get("action") ?? "");
  const note = String(formData.get("note") ?? "");
  const mergedIntoNodeId = String(formData.get("mergedIntoNodeId") ?? "");

  if (itemType === "signal") {
    if (!signalId || !["accept", "reject"].includes(action)) {
      return;
    }

    await reviewCapabilitySignal(getAppContext(), signalId, action === "accept" ? "accepted" : "rejected");
    revalidatePath("/review");
    revalidatePath("/signals");
    revalidatePath("/dashboard");
    revalidatePath("/passport");
    return;
  }

  if (itemType === "mistake") {
    if (!mistakeId || !["accept", "reject"].includes(action)) {
      return;
    }

    await reviewMistakePattern(getAppContext(), mistakeId, action === "accept" ? "accepted" : "rejected");
    revalidatePath("/review");
    revalidatePath("/signals");
    revalidatePath("/dashboard");
    revalidatePath("/passport");
    return;
  }

  if (!nodeId || !["accept", "reject", "rewrite", "merge"].includes(action)) {
    return;
  }

  await applyReviewAction(getAppContext(), {
    nodeId,
    action: action as "accept" | "reject" | "rewrite" | "merge",
    note,
    mergedIntoNodeId: mergedIntoNodeId || undefined
  });

  revalidatePath("/review");
  revalidatePath("/knowledge");
  revalidatePath("/dashboard");
  revalidatePath("/signals");
  revalidatePath("/passport");
}
