export const dynamic = "force-dynamic";

import Link from "next/link";

import { PageShell } from "@/components/page-shell";
import { SectionCard, StatusBadge } from "@/components/ui";
import { getAppContext } from "@/server/context";
import { getFragment, listFragments } from "@/server/services/fragments";

export default async function FragmentsPage(props: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const searchParams = props.searchParams ? await props.searchParams : {};
  const selectedId = typeof searchParams.fragment === "string" ? searchParams.fragment : undefined;

  const context = getAppContext();
  const fragments = await listFragments(context, { limit: 60 });
  const selected = selectedId ? await getFragment(context, selectedId) : fragments[0] ?? null;

  return (
    <PageShell currentPath="/fragments" title="Fragments" subtitle="Inspect stable evidence fragments with source linkage and anchor metadata">
      <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <SectionCard title="Fragment Library" description="Fragments are precise evidence units derived from imported material.">
          <div className="space-y-3">
            {fragments.map((fragment) => (
              <Link key={fragment.id} href={`/fragments?fragment=${fragment.id}`} className="block rounded-3xl border border-[var(--line)] bg-white/80 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold">{fragment.source?.title ?? fragment.sourceId}</p>
                  <StatusBadge>{fragment.anchorLabel}</StatusBadge>
                </div>
                <p className="mt-2 text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                  {fragment.source?.type ?? "unknown"} · tokens {fragment.tokenCount}
                </p>
                <p className="mt-3 line-clamp-4 text-sm leading-6 text-[var(--muted)]">{fragment.text}</p>
              </Link>
            ))}
            {fragments.length === 0 ? <p className="text-sm text-[var(--muted)]">No fragments have been generated yet.</p> : null}
          </div>
        </SectionCard>

        <SectionCard title={selected ? selected.anchorLabel : "Fragment Details"} description="Use this view to inspect exact evidence text, source linkage, and stable fragment ids.">
          {selected ? (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge>{selected.id}</StatusBadge>
                <StatusBadge>{selected.source?.privacyLevel ?? "unknown"}</StatusBadge>
                <StatusBadge>{typeof selected.source?.parser === "string" ? selected.source.parser : "unknown-parser"}</StatusBadge>
              </div>
              <div className="rounded-2xl border border-[var(--line)] bg-white/80 p-4 text-sm">
                <p className="font-medium">{selected.source?.title ?? selected.sourceId}</p>
                <p className="mt-2 text-[var(--muted)]">
                  Source {selected.source?.id ?? selected.sourceId}
                  {selected.source?.projectKey ? ` · Project ${selected.source.projectKey}` : ""}
                </p>
              </div>
              <div className="rounded-2xl border border-[var(--line)] bg-white/80 p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Fragment Text</p>
                <pre className="mt-3 text-sm leading-7 text-[var(--ink)]">{selected.text}</pre>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-[var(--line)] bg-white/80 px-4 py-3 text-sm">
                  <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Fragment Index</p>
                  <p className="mt-2 font-semibold">{selected.fragmentIndex}</p>
                </div>
                <div className="rounded-2xl border border-[var(--line)] bg-white/80 px-4 py-3 text-sm">
                  <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Token Count</p>
                  <p className="mt-2 font-semibold">{selected.tokenCount}</p>
                </div>
                <div className="rounded-2xl border border-[var(--line)] bg-white/80 px-4 py-3 text-sm">
                  <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Anchor</p>
                  <p className="mt-2 font-semibold">{selected.anchorLabel}</p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-[var(--muted)]">No fragment selected.</p>
          )}
        </SectionCard>
      </div>
    </PageShell>
  );
}
