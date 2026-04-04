"use client";

import { useState, useTransition } from "react";

export function ResearchForm() {
  const [result, setResult] = useState<{ answerMd: string; citations: Array<{ refId: string; excerpt: string }> } | null>(null);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-4">
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const formData = new FormData(form);
          const question = String(formData.get("question") ?? "");
          const projectKey = String(formData.get("projectKey") ?? "");

          startTransition(async () => {
            setError("");
            const response = await fetch("/api/research/query", {
              method: "POST",
              headers: {
                "content-type": "application/json"
              },
              body: JSON.stringify({
                question,
                projectKey: projectKey || undefined
              })
            });
            const payload = await response.json();
            if (!response.ok) {
              setError(payload.error ?? "Research query failed");
              return;
            }
            setResult(payload);
          });
        }}
      >
        <label className="space-y-2 text-sm">
          <span>Question</span>
          <textarea name="question" rows={5} required className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3" placeholder="Compare how my imported materials describe the relationship between knowledge passports and digital twins." />
        </label>
        <label className="space-y-2 text-sm">
          <span>Project Scope</span>
          <input name="projectKey" className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3" placeholder="Optional" />
        </label>
        <button disabled={isPending} className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-medium text-white disabled:opacity-50">
          {isPending ? "Retrieving and reasoning..." : "Run Research Query"}
        </button>
      </form>

      {error ? <p className="rounded-2xl bg-[var(--warn-soft)] px-4 py-3 text-sm text-[var(--warn)]">{error}</p> : null}

      {result ? (
        <div className="space-y-4 rounded-3xl border border-[var(--line)] bg-white/80 p-5">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Answer</p>
            <pre className="mt-3 text-sm leading-7 text-[var(--ink)]">{result.answerMd}</pre>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Citations</p>
            <ul className="mt-3 space-y-2">
              {result.citations.map((citation) => (
                <li key={`${citation.refId}-${citation.excerpt}`} className="rounded-2xl border border-[var(--line)] px-4 py-3 text-sm">
                  <strong>{citation.refId}</strong>
                  <p className="mt-1 text-[var(--muted)]">{citation.excerpt}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  );
}
