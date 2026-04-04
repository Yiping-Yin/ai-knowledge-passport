"use client";

import { useState, useTransition } from "react";

import type { PrivacyLevel, SourceType } from "@ai-knowledge-passport/shared";

const types: SourceType[] = ["markdown", "txt", "pdf", "url", "image", "chat", "audio"];
const privacyLevels: PrivacyLevel[] = ["L0_SELF", "L1_LOCAL_AI", "L2_INVITED", "L3_PUBLIC", "L4_AGENT_ONLY"];

export function ImportForm() {
  const [type, setType] = useState<SourceType>("markdown");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const formData = new FormData(form);

        startTransition(async () => {
          const response = await fetch("/api/imports", {
            method: "POST",
            body: formData
          });
          const payload = await response.json();
          setMessage(response.ok ? `Queued: ${payload.sourceId}` : payload.error ?? "Import failed");
          if (response.ok) {
            form.reset();
            setType("markdown");
          }
        });
      }}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm">
          <span>Source Type</span>
          <select name="type" value={type} onChange={(event) => setType(event.target.value as SourceType)} className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3">
            {types.map((entry) => (
              <option key={entry} value={entry}>
                {entry}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-2 text-sm">
          <span>Privacy Level</span>
          <select name="privacyLevel" defaultValue="L1_LOCAL_AI" className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3">
            {privacyLevels.map((entry) => (
              <option key={entry} value={entry}>
                {entry}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-2 text-sm">
          <span>Title</span>
          <input name="title" required className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3" />
        </label>
        <label className="space-y-2 text-sm">
          <span>Project Key</span>
          <input name="projectKey" className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3" placeholder="passport-mvp" />
        </label>
      </div>

      {type === "url" ? (
        <label className="space-y-2 text-sm">
          <span>Source URL</span>
          <input name="originUrl" type="url" required className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3" placeholder="https://example.com" />
        </label>
      ) : null}

      {["markdown", "txt", "chat"].includes(type) ? (
        <label className="space-y-2 text-sm">
          <span>Text Content</span>
          <textarea name="textContent" rows={8} required className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3" />
        </label>
      ) : null}

      {["pdf", "image", "audio"].includes(type) ? (
        <label className="space-y-2 text-sm">
          <span>Upload File</span>
          <input name="file" type="file" required className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3" />
        </label>
      ) : null}

      <label className="space-y-2 text-sm">
        <span>Tags (comma separated)</span>
        <input name="tags" className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3" placeholder="knowledge,passport,mvp" />
      </label>

      <div className="flex items-center gap-4">
        <button disabled={isPending} className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-medium text-white disabled:opacity-50">
          {isPending ? "Importing..." : "Import and Queue"}
        </button>
        {message ? <span className="text-sm text-[var(--muted)]">{message}</span> : null}
      </div>
    </form>
  );
}
