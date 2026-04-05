"use client";

import { useState, useTransition } from "react";

export function FocusCardActivateButton(props: { focusCardId: string; disabled?: boolean }) {
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        disabled={props.disabled || isPending}
        onClick={() => {
          startTransition(async () => {
            const response = await fetch(`/api/focus-cards/${props.focusCardId}/activate`, {
              method: "POST"
            });
            const payload = await response.json();
            setMessage(response.ok ? "Activated" : payload.error ?? "Activation failed");
          });
        }}
        className="rounded-full border border-[var(--line)] px-4 py-2 text-sm disabled:opacity-50"
      >
        {isPending ? "Activating..." : "Set Active"}
      </button>
      {message ? <span className="text-xs text-[var(--muted)]">{message}</span> : null}
    </div>
  );
}
