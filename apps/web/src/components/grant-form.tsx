"use client";

import { useState, useTransition } from "react";

export function GrantForm() {
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        startTransition(async () => {
          const response = await fetch("/api/grants", {
            method: "POST",
            headers: {
              "content-type": "application/json"
            },
            body: JSON.stringify({
              objectType: formData.get("objectType"),
              objectId: formData.get("objectId"),
              granteeType: formData.get("granteeType"),
              granteeId: formData.get("granteeId") || undefined,
              accessLevel: formData.get("accessLevel"),
              expiresAt: formData.get("expiresAt") || undefined,
              notes: formData.get("notes") || undefined
            })
          });
          const payload = await response.json();
          setMessage(response.ok ? `Grant created: ${payload.grantId}` : payload.error ?? "Grant creation failed");
        });
      }}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm">
          <span>Object Type</span>
          <select name="objectType" defaultValue="passport_snapshot" className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3">
            <option value="passport_snapshot">passport_snapshot</option>
            <option value="visa_bundle">visa_bundle</option>
            <option value="postcard">postcard</option>
            <option value="wiki_node">wiki_node</option>
            <option value="source">source</option>
          </select>
        </label>
        <label className="space-y-2 text-sm">
          <span>Object ID</span>
          <input name="objectId" required className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3" />
        </label>
        <label className="space-y-2 text-sm">
          <span>Grantee Type</span>
          <select name="granteeType" defaultValue="collaborator" className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3">
            <option value="collaborator">collaborator</option>
            <option value="ai_agent">ai_agent</option>
            <option value="secret_link">secret_link</option>
            <option value="public_link">public_link</option>
          </select>
        </label>
        <label className="space-y-2 text-sm">
          <span>Grantee ID</span>
          <input name="granteeId" className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3" />
        </label>
        <label className="space-y-2 text-sm">
          <span>Access Level</span>
          <input name="accessLevel" required className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3" placeholder="read_only" />
        </label>
        <label className="space-y-2 text-sm">
          <span>Expires At</span>
          <input name="expiresAt" type="datetime-local" className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3" />
        </label>
      </div>
      <label className="space-y-2 text-sm">
        <span>Notes</span>
        <textarea name="notes" rows={3} className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3" />
      </label>
      <div className="flex items-center gap-4">
        <button disabled={isPending} className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-medium text-white disabled:opacity-50">
          {isPending ? "Creating..." : "Create Grant"}
        </button>
        {message ? <span className="text-sm text-[var(--muted)]">{message}</span> : null}
      </div>
    </form>
  );
}
