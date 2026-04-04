"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function VisaActions(props: {
  visaId: string;
  secretPath: string;
  machinePath: string | null;
  status: string;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      <button
        className="rounded-full border border-[var(--line)] px-4 py-2"
        onClick={async () => {
          const url = new URL(props.secretPath, window.location.origin).toString();
          await navigator.clipboard.writeText(url);
          setMessage("Link copied");
        }}
        type="button"
      >
        Copy Link
      </button>
      <a className="rounded-full border border-[var(--line)] px-4 py-2" href={`/visas/${props.visaId}`}>
        Details
      </a>
      <a className="rounded-full border border-[var(--line)] px-4 py-2" href={props.secretPath} target="_blank" rel="noreferrer">
        Open Link
      </a>
      {props.machinePath ? (
        <a className="rounded-full border border-[var(--line)] px-4 py-2" href={props.machinePath} target="_blank" rel="noreferrer">
          Machine Manifest
        </a>
      ) : null}
      {props.status === "active" ? (
        <button
          className="rounded-full border border-[var(--line)] px-4 py-2 disabled:opacity-50"
          disabled={isPending}
          onClick={() => {
            startTransition(async () => {
              const response = await fetch(`/api/visas/${props.visaId}/revoke`, {
                method: "POST"
              });
              const payload = await response.json();
              setMessage(response.ok ? "Visa revoked" : payload.error ?? "Visa revoke failed");
              if (response.ok) {
                router.refresh();
              }
            });
          }}
          type="button"
        >
          {isPending ? "Revoking..." : "Revoke"}
        </button>
      ) : null}
      {message ? <span className="text-[var(--muted)]">{message}</span> : null}
    </div>
  );
}
