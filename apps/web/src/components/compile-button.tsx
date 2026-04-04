"use client";

import { useTransition, useState } from "react";

export function CompileButton(props: { sourceId: string }) {
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-2">
      <button
        disabled={isPending}
        className="rounded-full border border-[var(--line)] px-3 py-2 text-xs font-medium disabled:opacity-50"
        onClick={() => {
          startTransition(async () => {
            const response = await fetch(`/api/sources/${props.sourceId}/compile`, {
              method: "POST"
            });
            const payload = await response.json();
            setMessage(response.ok ? `job:${payload.jobId}` : payload.error ?? "编译失败");
          });
        }}
      >
        {isPending ? "编译中..." : "编译"}
      </button>
      {message ? <span className="text-xs text-[var(--muted)]">{message}</span> : null}
    </div>
  );
}
