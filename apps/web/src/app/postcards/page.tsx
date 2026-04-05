export const dynamic = "force-dynamic";

import Link from "next/link";

import { PageShell } from "@/components/page-shell";
import { PostcardForm } from "@/components/postcard-form";
import { SectionCard, StatusBadge } from "@/components/ui";
import { getAppContext } from "@/server/context";
import { listPostcards } from "@/server/services/postcards";

export default async function PostcardsPage() {
  const postcards = await listPostcards(getAppContext());

  return (
    <PageShell currentPath="/postcards" title="Topic Cards" subtitle="Compress important knowledge into traceable topic cards without changing the underlying postcard implementation">
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <SectionCard title="Create Topic Card" description="Supports manual authoring or AI-assisted generation from related nodes and sources.">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3 rounded-3xl border border-[var(--line)] bg-white/80 p-4 text-sm">
              <span className="text-[var(--muted)]">Topic cards can be projected outward through visa bundles and secret links.</span>
              <Link href="/visas" className="rounded-full border border-[var(--line)] px-4 py-2">
                Open Mount Center
              </Link>
            </div>
            <PostcardForm />
          </div>
        </SectionCard>
        <SectionCard title="Topic Card Library" description="These entries can later be composed into a passport.">
          <div className="space-y-4">
            {postcards.map((card) => (
              <article key={card.id} className="rounded-3xl border border-[var(--line)] bg-white/80 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{card.title}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                      {card.id} · v{card.version}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge>{card.privacyLevel}</StatusBadge>
                    <StatusBadge tone="success">{card.cardType}</StatusBadge>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-6">{card.claim}</p>
                <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{card.evidenceSummary}</p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs text-[var(--muted)]">
                  <span className="rounded-full bg-black/5 px-3 py-1">nodes {card.relatedNodeIds.length}</span>
                  <span className="rounded-full bg-black/5 px-3 py-1">sources {card.relatedSourceIds.length}</span>
                </div>
              </article>
            ))}
            {postcards.length === 0 ? <p className="text-sm text-[var(--muted)]">There are no topic cards yet.</p> : null}
          </div>
        </SectionCard>
      </div>
    </PageShell>
  );
}
