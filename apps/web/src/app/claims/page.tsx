export const dynamic = "force-dynamic";

import Link from "next/link";

import { PageShell } from "@/components/page-shell";
import { SectionCard, StatusBadge } from "@/components/ui";
import { getAppContext } from "@/server/context";
import { getClaim, listClaims } from "@/server/services/claims";

export default async function ClaimsPage(props: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const searchParams = props.searchParams ? await props.searchParams : {};
  const selectedId = typeof searchParams.claim === "string" ? searchParams.claim : undefined;
  const context = getAppContext();
  const claims = await listClaims(context, 60);
  const selected = selectedId
    ? await getClaim(context, selectedId)
    : claims[0]
      ? await getClaim(context, claims[0].id)
      : null;

  return (
    <PageShell currentPath="/claims" title="Claims" subtitle="Inspect atomic claims as the smallest reviewable and comparable knowledge units">
      <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <SectionCard title="Claim Library" description="Claims are maintained separately from full wiki pages.">
          <div className="space-y-3">
            {claims.map((claim) => (
              <Link key={claim.id} href={`/claims?claim=${claim.id}`} className="block rounded-3xl border border-[var(--line)] bg-white/80 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold">{claim.title}</p>
                  <StatusBadge>{claim.claimType}</StatusBadge>
                </div>
                <p className="mt-2 text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                  {claim.status} · confidence {claim.confidence.toFixed(2)}
                </p>
                <p className="mt-3 line-clamp-3 text-sm leading-6 text-[var(--muted)]">{claim.statement}</p>
              </Link>
            ))}
            {claims.length === 0 ? <p className="text-sm text-[var(--muted)]">No claims have been created yet.</p> : null}
          </div>
        </SectionCard>

        <SectionCard title={selected ? selected.title : "Claim Details"} description="Claims connect page summaries to exact fragment evidence and source references.">
          {selected ? (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge>{selected.id}</StatusBadge>
                <StatusBadge>{selected.status}</StatusBadge>
                <StatusBadge>{selected.claimType}</StatusBadge>
              </div>
              <div className="rounded-2xl border border-[var(--line)] bg-white/80 p-4 text-sm">
                <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Statement</p>
                <p className="mt-3 leading-7">{selected.statement}</p>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-[var(--line)] bg-white/80 px-4 py-3 text-sm">
                  <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Confidence</p>
                  <p className="mt-2 font-semibold">{selected.confidence.toFixed(2)}</p>
                </div>
                <div className="rounded-2xl border border-[var(--line)] bg-white/80 px-4 py-3 text-sm">
                  <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Fragments</p>
                  <p className="mt-2 font-semibold">{selected.sourceFragmentIds.length}</p>
                </div>
                <div className="rounded-2xl border border-[var(--line)] bg-white/80 px-4 py-3 text-sm">
                  <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Sources</p>
                  <p className="mt-2 font-semibold">{selected.sourceIds.length}</p>
                </div>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Fragments</p>
                <div className="mt-3 space-y-3">
                  {selected.fragments.map((fragment) => (
                    <article key={fragment.id} className="rounded-2xl border border-[var(--line)] bg-white/80 px-4 py-3 text-sm">
                      <p className="font-medium">{fragment.id}</p>
                      <p className="mt-2 text-[var(--muted)]">{fragment.text}</p>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-[var(--muted)]">No claim selected.</p>
          )}
        </SectionCard>
      </div>
    </PageShell>
  );
}
