"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function AvatarLiveSessionForm(props: { avatarId: string }) {
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
          const response = await fetch(`/api/avatars/${props.avatarId}/sessions`, {
            method: "POST",
            headers: {
              "content-type": "application/json"
            },
            body: JSON.stringify({
              title: formData.get("title") || ""
            })
          });

          const payload = await response.json();
          if (response.ok) {
            router.push(`/avatar-sessions/${payload.sessionId}`);
            return;
          }
          setMessage(payload.error ?? "Live session creation failed");
        });
      }}
    >
      <label className="space-y-2 text-sm">
        <span>New Session Title</span>
        <input name="title" placeholder="Optional session label" className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3" />
      </label>
      <div className="flex items-center gap-4">
        <button disabled={isPending} className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-medium text-white disabled:opacity-50">
          {isPending ? "Creating..." : "Create Live Session"}
        </button>
        {message ? <span className="text-sm text-[var(--muted)]">{message}</span> : null}
      </div>
    </form>
  );
}
