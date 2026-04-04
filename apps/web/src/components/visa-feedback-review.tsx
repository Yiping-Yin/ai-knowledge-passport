"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function VisaFeedbackReview(props: {
  visaId: string;
  feedbackId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function submit(status: "pending_review" | "accepted" | "ignored") {
    startTransition(async () => {
      const response = await fetch(`/api/visas/${props.visaId}/feedback/${props.feedbackId}/review`, {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({ status })
      });

      const payload = await response.json();
      setMessage(response.ok ? `Marked ${status}` : payload.error ?? "Review update failed");
      if (response.ok) {
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 text-sm">
        {(["pending_review", "accepted", "ignored"] as const).map((status) => (
          <button
            key={status}
            className="rounded-full border border-[var(--line)] px-3 py-2 disabled:opacity-50"
            disabled={isPending || props.currentStatus === status}
            onClick={() => submit(status)}
            type="button"
          >
            {props.currentStatus === status ? `${status} (current)` : status}
          </button>
        ))}
      </div>
      {message ? <p className="text-sm text-[var(--muted)]">{message}</p> : null}
    </div>
  );
}
