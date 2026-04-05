"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function AvatarLiveMessageForm(props: { sessionId: string; disabled?: boolean }) {
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
          const response = await fetch(`/api/avatar-sessions/${props.sessionId}/messages`, {
            method: "POST",
            headers: {
              "content-type": "application/json"
            },
            body: JSON.stringify({
              contentMd: formData.get("contentMd")
            })
          });

          const payload = await response.json();
          setMessage(response.ok ? `Result: ${payload.resultStatus}` : payload.error ?? "Message failed");
          if (response.ok) {
            form.reset();
            router.refresh();
          }
        });
      }}
    >
      <label className="space-y-2 text-sm">
        <span>Message</span>
        <textarea
          name="contentMd"
          rows={4}
          required
          disabled={props.disabled || isPending}
          className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3 disabled:opacity-50"
        />
      </label>
      <div className="flex items-center gap-4">
        <button disabled={props.disabled || isPending} className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-medium text-white disabled:opacity-50">
          {isPending ? "Sending..." : "Send"}
        </button>
        {message ? <span className="text-sm text-[var(--muted)]">{message}</span> : null}
      </div>
    </form>
  );
}
