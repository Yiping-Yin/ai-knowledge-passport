"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import type { AvatarSimulationSession } from "@ai-knowledge-passport/shared";

export function AvatarSimulationForm(props: { avatarId: string }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [latest, setLatest] = useState<AvatarSimulationSession | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-4">
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);

          startTransition(async () => {
            const response = await fetch(`/api/avatars/${props.avatarId}/simulate`, {
              method: "POST",
              headers: {
                "content-type": "application/json"
              },
              body: JSON.stringify({
                question: formData.get("question")
              })
            });
            const payload = await response.json();
            if (response.ok) {
              setMessage(`Simulation: ${payload.resultStatus}`);
              setLatest({
                id: payload.sessionId,
                avatarProfileId: props.avatarId,
                question: String(formData.get("question") ?? ""),
                resultStatus: payload.resultStatus,
                answerMd: payload.answerMd,
                citations: payload.citations,
                reason: payload.reason,
                createdAt: new Date().toISOString()
              });
              router.refresh();
              return;
            }
            setMessage(payload.error ?? "Simulation failed");
          });
        }}
      >
        <label className="space-y-2 text-sm">
          <span>Simulation Question</span>
          <textarea name="question" rows={4} required className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3" />
        </label>
        <div className="flex items-center gap-4">
          <button disabled={isPending} className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-medium text-white disabled:opacity-50">
            {isPending ? "Simulating..." : "Run Simulation"}
          </button>
          {message ? <span className="text-sm text-[var(--muted)]">{message}</span> : null}
        </div>
      </form>

      {latest ? (
        <article className="rounded-2xl border border-[var(--line)] bg-white/80 p-4 text-sm">
          <p className="font-medium">Latest Result</p>
          <p className="mt-2 text-[var(--muted)]">{latest.resultStatus}{latest.reason ? ` · ${latest.reason}` : ""}</p>
          <p className="mt-3 whitespace-pre-wrap leading-6">{latest.answerMd}</p>
        </article>
      ) : null}
    </div>
  );
}
