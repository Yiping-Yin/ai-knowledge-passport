"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function AvatarProfileForm(props: {
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
        const form = event.currentTarget;
        const formData = new FormData(form);

        startTransition(async () => {
          const response = await fetch("/api/avatars", {
            method: "POST",
            headers: {
              "content-type": "application/json"
            },
            body: JSON.stringify({
              title: formData.get("title"),
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
              },
              status: "active"
            })
          });

          const payload = await response.json();
          if (response.ok) {
            setMessage(`Avatar created: ${payload.avatarId}`);
            form.reset();
            router.refresh();
            return;
          }
          setMessage(payload.error ?? "Avatar creation failed");
        });
      }}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm">
          <span>Avatar Title</span>
          <input name="title" defaultValue="Governed Avatar" required className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3" />
        </label>
        <label className="space-y-2 text-sm">
          <span>Active Agent Pack</span>
          <select name="activePackId" required defaultValue={props.packs[0]?.id ?? ""} className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3">
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
        <textarea name="intro" rows={3} className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3" />
      </label>
      <label className="space-y-2 text-sm">
        <span>Tone Rules</span>
        <input name="toneRules" className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3" placeholder="calm, concise, evidence-first" />
      </label>
      <label className="space-y-2 text-sm">
        <span>Forbidden Topics</span>
        <input name="forbiddenTopics" className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3" placeholder="pricing, private clients, internal strategy" />
      </label>

      <div className="grid gap-3 rounded-3xl border border-[var(--line)] bg-white/80 p-4 md:grid-cols-2">
        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" name="escalateOnForbiddenTopic" defaultChecked className="h-4 w-4 rounded border-[var(--line)]" />
          <span>Escalate on forbidden topic</span>
        </label>
        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" name="escalateOnInsufficientEvidence" defaultChecked className="h-4 w-4 rounded border-[var(--line)]" />
          <span>Escalate on insufficient evidence</span>
        </label>
        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" name="escalateOnOutOfScope" defaultChecked className="h-4 w-4 rounded border-[var(--line)]" />
          <span>Escalate on out-of-scope questions</span>
        </label>
      </div>

      <div className="flex items-center gap-4">
        <button disabled={isPending || props.packs.length === 0} className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-medium text-white disabled:opacity-50">
          {isPending ? "Creating..." : "Create Avatar"}
        </button>
        {message ? <span className="text-sm text-[var(--muted)]">{message}</span> : null}
      </div>
    </form>
  );
}
