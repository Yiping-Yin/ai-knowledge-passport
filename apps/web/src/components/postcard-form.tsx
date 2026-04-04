"use client";

import { useState, useTransition } from "react";

export function PostcardForm() {
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const autoGenerate = formData.get("autoGenerate") === "true";

        startTransition(async () => {
          const response = await fetch("/api/postcards", {
            method: "POST",
            headers: {
              "content-type": "application/json"
            },
            body: JSON.stringify({
              autoGenerate,
              title: formData.get("title"),
              cardType: formData.get("cardType"),
              claim: formData.get("claim"),
              evidenceSummary: formData.get("evidenceSummary"),
              userView: formData.get("userView"),
              relatedNodeIds: String(formData.get("relatedNodeIds") ?? "")
                .split(",")
                .map((entry) => entry.trim())
                .filter(Boolean),
              relatedSourceIds: String(formData.get("relatedSourceIds") ?? "")
                .split(",")
                .map((entry) => entry.trim())
                .filter(Boolean),
              privacyLevel: formData.get("privacyLevel")
            })
          });
          const payload = await response.json();
          setMessage(response.ok ? `Created: ${payload.postcardId}` : payload.error ?? "Generation failed");
        });
      }}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm">
          <span>Title</span>
          <input name="title" required className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3" />
        </label>
        <label className="space-y-2 text-sm">
          <span>Card Type</span>
          <select name="cardType" defaultValue="knowledge" className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3">
            <option value="knowledge">knowledge</option>
            <option value="project">project</option>
            <option value="method">method</option>
            <option value="question">question</option>
          </select>
        </label>
      </div>
      <label className="space-y-2 text-sm">
        <span>Related Node IDs</span>
        <input name="relatedNodeIds" className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3" placeholder="node_a,node_b" />
      </label>
      <label className="space-y-2 text-sm">
        <span>Related Source IDs</span>
        <input name="relatedSourceIds" className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3" placeholder="src_a,src_b" />
      </label>
      <label className="space-y-2 text-sm">
        <span>Privacy Level</span>
        <select name="privacyLevel" defaultValue="L1_LOCAL_AI" className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3">
          <option value="L1_LOCAL_AI">L1_LOCAL_AI</option>
          <option value="L0_SELF">L0_SELF</option>
          <option value="L2_INVITED">L2_INVITED</option>
          <option value="L3_PUBLIC">L3_PUBLIC</option>
          <option value="L4_AGENT_ONLY">L4_AGENT_ONLY</option>
        </select>
      </label>
      <label className="flex items-center gap-2 text-sm text-[var(--muted)]">
        <input type="checkbox" name="autoGenerate" value="true" />
        Let AI generate the claim, evidence, and user view from related entries
      </label>
      <label className="space-y-2 text-sm">
        <span>Core Claim</span>
        <textarea name="claim" rows={3} className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3" />
      </label>
      <label className="space-y-2 text-sm">
        <span>Evidence Summary</span>
        <textarea name="evidenceSummary" rows={3} className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3" />
      </label>
      <label className="space-y-2 text-sm">
        <span>My View</span>
        <textarea name="userView" rows={3} className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3" />
      </label>
      <div className="flex items-center gap-4">
        <button disabled={isPending} className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-medium text-white disabled:opacity-50">
          {isPending ? "Generating..." : "Save Postcard"}
        </button>
        {message ? <span className="text-sm text-[var(--muted)]">{message}</span> : null}
      </div>
    </form>
  );
}
