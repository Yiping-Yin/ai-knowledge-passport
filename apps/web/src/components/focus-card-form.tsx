"use client";

import { useState, useTransition } from "react";

export function FocusCardForm(props: {
  workspaces: Array<{ id: string; title: string; workspaceType: string }>;
  defaultWorkspaceId?: string;
}) {
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
          const response = await fetch("/api/focus-cards", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              workspaceId: formData.get("workspaceId"),
              title: formData.get("title"),
              goal: formData.get("goal"),
              timeframe: formData.get("timeframe"),
              priority: formData.get("priority"),
              successCriteria: formData.get("successCriteria"),
              relatedTopics: String(formData.get("relatedTopics") ?? "")
                .split(",")
                .map((entry) => entry.trim())
                .filter(Boolean),
              status: "active"
            })
          });

          const payload = await response.json();
          setMessage(response.ok ? `Created: ${payload.focusCardId}` : payload.error ?? "Focus card creation failed");
          if (response.ok) {
            form.reset();
          }
        });
      }}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm">
          <span>Workspace</span>
          <select name="workspaceId" defaultValue={props.defaultWorkspaceId ?? props.workspaces[0]?.id ?? ""} className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3">
            {props.workspaces.map((workspace) => (
              <option key={workspace.id} value={workspace.id}>
                {workspace.title} · {workspace.workspaceType}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-2 text-sm">
          <span>Priority</span>
          <select name="priority" defaultValue="medium" className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3">
            <option value="high">high</option>
            <option value="medium">medium</option>
            <option value="low">low</option>
          </select>
        </label>
        <label className="space-y-2 text-sm">
          <span>Title</span>
          <input name="title" required className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3" placeholder="Current Goal" />
        </label>
        <label className="space-y-2 text-sm">
          <span>Timeframe</span>
          <input name="timeframe" className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3" placeholder="This week" />
        </label>
      </div>

      <label className="space-y-2 text-sm">
        <span>Goal</span>
        <textarea name="goal" rows={4} required className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3" />
      </label>

      <label className="space-y-2 text-sm">
        <span>Success Criteria</span>
        <textarea name="successCriteria" rows={3} className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3" />
      </label>

      <label className="space-y-2 text-sm">
        <span>Related Topics (comma separated)</span>
        <input name="relatedTopics" className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3" />
      </label>

      <div className="flex items-center gap-4">
        <button disabled={isPending} className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-medium text-white disabled:opacity-50">
          {isPending ? "Saving..." : "Create Active Focus"}
        </button>
        {message ? <span className="text-sm text-[var(--muted)]">{message}</span> : null}
      </div>
    </form>
  );
}
