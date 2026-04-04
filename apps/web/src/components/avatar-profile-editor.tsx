"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import type { AvatarProfileSummary } from "@ai-knowledge-passport/shared";

export function AvatarProfileEditor(props: {
  avatar: AvatarProfileSummary;
  packs: Array<{ id: string; title: string }>;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);

        startTransition(async () => {
          const response = await fetch(`/api/avatars/${props.avatar.id}`, {
            method: "PATCH",
            headers: {
              "content-type": "application/json"
            },
            body: JSON.stringify({
              activePackId: formData.get("activePackId"),
              intro: formData.get("intro") || "",
              toneRules: String(formData.get("toneRules") ?? "")
                .split(",")
                .map((entry) => entry.trim())
                .filter(Boolean),
              forbiddenTopics: String(formData.get("forbiddenTopics") ?? "")
                .split(",")
                .map((entry) => entry.trim())
                .filter(Boolean),
              escalationRules: {
                escalateOnForbiddenTopic: formData.get("escalateOnForbiddenTopic") === "on",
                escalateOnInsufficientEvidence: formData.get("escalateOnInsufficientEvidence") === "on",
                escalateOnOutOfScope: formData.get("escalateOnOutOfScope") === "on"
              }
            })
          });

          const payload = await response.json();
          setMessage(response.ok ? "Avatar profile updated" : payload.error ?? "Update failed");
          if (response.ok) {
            router.refresh();
          }
        });
      }}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm">
          <span>Active Agent Pack</span>
          <select name="activePackId" defaultValue={props.avatar.activePackId} className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3">
            {props.packs.map((pack) => (
              <option key={pack.id} value={pack.id}>
                {pack.title} · {pack.id}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="space-y-2 text-sm">
        <span>Intro</span>
        <textarea name="intro" rows={3} defaultValue={props.avatar.intro} className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3" />
      </label>
      <label className="space-y-2 text-sm">
        <span>Tone Rules</span>
        <input name="toneRules" defaultValue={props.avatar.toneRules.join(", ")} className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3" />
      </label>
      <label className="space-y-2 text-sm">
        <span>Forbidden Topics</span>
        <input name="forbiddenTopics" defaultValue={props.avatar.forbiddenTopics.join(", ")} className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3" />
      </label>

      <div className="grid gap-3 rounded-3xl border border-[var(--line)] bg-white/80 p-4 md:grid-cols-2">
        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" name="escalateOnForbiddenTopic" defaultChecked={props.avatar.escalationRules.escalateOnForbiddenTopic} className="h-4 w-4 rounded border-[var(--line)]" />
          <span>Escalate on forbidden topic</span>
        </label>
        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" name="escalateOnInsufficientEvidence" defaultChecked={props.avatar.escalationRules.escalateOnInsufficientEvidence} className="h-4 w-4 rounded border-[var(--line)]" />
          <span>Escalate on insufficient evidence</span>
        </label>
        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" name="escalateOnOutOfScope" defaultChecked={props.avatar.escalationRules.escalateOnOutOfScope} className="h-4 w-4 rounded border-[var(--line)]" />
          <span>Escalate on out-of-scope questions</span>
        </label>
      </div>

      <div className="flex items-center gap-4">
        <button disabled={isPending} className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-medium text-white disabled:opacity-50">
          {isPending ? "Saving..." : "Save Profile"}
        </button>
        {message ? <span className="text-sm text-[var(--muted)]">{message}</span> : null}
      </div>
    </form>
  );
}
