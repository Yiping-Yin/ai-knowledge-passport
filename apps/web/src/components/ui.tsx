import clsx from "clsx";
import type { ReactNode } from "react";

export function SectionCard(props: { title: string; description?: string; children: ReactNode; className?: string }) {
  return (
    <section className={clsx("rounded-[28px] border border-[var(--line)] bg-[var(--surface)] p-5 backdrop-blur", props.className)}>
      <div className="mb-4">
        <h3 className="text-lg font-semibold">{props.title}</h3>
        {props.description ? <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{props.description}</p> : null}
      </div>
      {props.children}
    </section>
  );
}

export function StatTile(props: { label: string; value: number | string; hint?: string }) {
  return (
    <div className="rounded-3xl border border-[var(--line)] bg-[var(--surface-strong)] p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">{props.label}</p>
      <p className="mt-3 text-3xl font-semibold">{props.value}</p>
      {props.hint ? <p className="mt-2 text-sm text-[var(--muted)]">{props.hint}</p> : null}
    </div>
  );
}

export function StatusBadge(props: { tone?: "default" | "success" | "warn"; children: ReactNode }) {
  const tone = props.tone ?? "default";
  return (
    <span
      className={clsx(
        "inline-flex rounded-full px-3 py-1 text-xs font-medium",
        tone === "success" && "bg-[var(--accent-soft)] text-[var(--accent)]",
        tone === "warn" && "bg-[var(--warn-soft)] text-[var(--warn)]",
        tone === "default" && "bg-black/5 text-[var(--muted)]"
      )}
    >
      {props.children}
    </span>
  );
}
