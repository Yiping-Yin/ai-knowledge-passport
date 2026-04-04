"use server";

import { revalidatePath } from "next/cache";

import { getAppContext } from "@/server/context";
import { applyReviewAction } from "@/server/services/compiler";

export async function submitReviewAction(formData: FormData) {
  const nodeId = String(formData.get("nodeId") ?? "");
  const action = String(formData.get("action") ?? "");
  const note = String(formData.get("note") ?? "");
  const mergedIntoNodeId = String(formData.get("mergedIntoNodeId") ?? "");

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
}
