"use client";

import { useState, useTransition } from "react";

export function ExternalVisaFeedbackForm(props: { token: string }) {
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const target = event.currentTarget;

        startTransition(async () => {
          const response = await fetch(`/v/${props.token}/feedback`, {
            method: "POST",
            headers: {
              "content-type": "application/json"
            },
            body: JSON.stringify({
              feedbackType: formData.get("feedbackType"),
              visitorLabel: formData.get("visitorLabel") || undefined,
              message: formData.get("message")
            })
          });

          const payload = await response.json();
          if (response.ok) {
            setMessage("Submitted. The owner can review it internally.");
            target.reset();
            return;
          }
          setMessage(payload.error ?? "Submission failed");
        });
      }}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm">
          <span>Type</span>
          <select name="feedbackType" defaultValue="feedback" className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3">
            <option value="feedback">feedback</option>
            <option value="question">question</option>
            <option value="collaboration_intent">collaboration_intent</option>
          </select>
        </label>
        <label className="space-y-2 text-sm">
          <span>Your Label</span>
          <input name="visitorLabel" className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3" placeholder="Optional name or role" />
        </label>
      </div>

      <label className="space-y-2 text-sm">
        <span>Message</span>
        <textarea name="message" rows={5} required className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3" />
      </label>

      <div className="flex items-center gap-4">
        <button disabled={isPending} className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-medium text-white disabled:opacity-50">
          {isPending ? "Sending..." : "Send"}
        </button>
        {message ? <span className="text-sm text-[var(--muted)]">{message}</span> : null}
      </div>
    </form>
  );
}
