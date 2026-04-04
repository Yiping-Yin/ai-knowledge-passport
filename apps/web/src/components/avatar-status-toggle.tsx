"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function AvatarStatusToggle(props: {
  avatarId: string;
  status: "active" | "paused";
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const nextStatus = props.status === "active" ? "paused" : "active";

  return (
    <div className="flex items-center gap-4">
      <button
        disabled={isPending}
        className="rounded-full border border-[var(--line)] px-4 py-2 text-sm disabled:opacity-50"
        onClick={() => {
          startTransition(async () => {
            const response = await fetch(`/api/avatars/${props.avatarId}/status`, {
              method: "POST",
              headers: {
                "content-type": "application/json"
              },
              body: JSON.stringify({ status: nextStatus })
            });
            const payload = await response.json();
            setMessage(response.ok ? `Avatar ${nextStatus}` : payload.error ?? "Status update failed");
            if (response.ok) {
              router.refresh();
            }
          });
        }}
        type="button"
      >
        {isPending ? "Updating..." : nextStatus === "paused" ? "Pause Avatar" : "Activate Avatar"}
      </button>
      {message ? <span className="text-sm text-[var(--muted)]">{message}</span> : null}
    </div>
  );
}
