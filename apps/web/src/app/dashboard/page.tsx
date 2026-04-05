export const dynamic = "force-dynamic";

import { formatDistanceToNow } from "date-fns";
import Link from "next/link";

import { PageShell } from "@/components/page-shell";
import { SectionCard, StatTile, StatusBadge } from "@/components/ui";
import { getAppContext } from "@/server/context";
import { getDashboardStats } from "@/server/services/dashboard";

export default async function DashboardPage() {
  const stats = await getDashboardStats(getAppContext());

  return (
    <PageShell currentPath="/dashboard" title="Dashboard" subtitle="Track the core AI-readable context: imports, accepted knowledge, active focus, and what should be mounted next">
      <section className="grid gap-4 md:grid-cols-4">
        <StatTile label="Imports Today" value={stats.importsToday} hint="Number of sources added today" />
        <StatTile label="Pending Compile" value={stats.pendingCompile} hint="Archived sources waiting for compilation" />
        <StatTile label="Pending Review" value={stats.pendingReview} hint="Compiled nodes waiting for user review" />
        <StatTile label="Active Focus" value={stats.activeFocusCard?.title ?? "none"} hint={stats.activeFocusCard?.priority ?? "No active focus card"} />
      </section>

      <SectionCard title="Primary Operator Path" description="For the MVP release candidate, keep the top-level workflow narrow: prepare context, publish a passport, mount it, and review what comes back.">
        <div className="flex flex-wrap gap-3">
          <Link href="/passport" className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-medium text-white">
            Open Passport
          </Link>
          <Link href="/visas" className="rounded-full border border-[var(--line)] px-5 py-3 text-sm">
            Open Mount Center
          </Link>
          <Link href="/review" className="rounded-full border border-[var(--line)] px-5 py-3 text-sm">
            Open Review Queue
          </Link>
        </div>
      </SectionCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Current User Context" description="This is the high-level layer an AI should understand before it reads deeper knowledge.">
          <div className="space-y-4">
            <div className="rounded-3xl border border-[var(--line)] bg-white/70 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Active Focus</p>
              {stats.activeFocusCard ? (
                <>
                  <p className="mt-3 text-lg font-semibold">{stats.activeFocusCard.title}</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{stats.activeFocusCard.goal}</p>
                </>
              ) : (
                <p className="mt-3 text-sm text-[var(--muted)]">No active focus card yet. Use Signals to set what matters now.</p>
              )}
            </div>

            <div className="rounded-3xl border border-[var(--line)] bg-white/70 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Top Capability Signals</p>
              <div className="mt-3 space-y-3">
                {stats.topSignals.map((signal) => (
                  <article key={signal.id}>
                    <p className="text-sm font-medium">{signal.topic}</p>
                    <p className="mt-1 text-sm text-[var(--muted)]">{signal.observedPractice}</p>
                  </article>
                ))}
                {stats.topSignals.length === 0 ? <p className="text-sm text-[var(--muted)]">No accepted capability signals yet.</p> : null}
              </div>
            </div>

            <div className="rounded-3xl border border-[var(--line)] bg-white/70 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Mistake Patterns Pending Review</p>
              <div className="mt-3 space-y-3">
                {stats.pendingMistakes.map((mistake) => (
                  <article key={mistake.id}>
                    <p className="text-sm font-medium">{mistake.topic}</p>
                    <p className="mt-1 text-sm text-[var(--muted)]">{mistake.description}</p>
                  </article>
                ))}
                {stats.pendingMistakes.length === 0 ? <p className="text-sm text-[var(--muted)]">No mistake patterns are waiting for review.</p> : null}
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Recent Research Output" description="Review recent research sessions and formal outputs here.">
          <div className="space-y-4">
            {stats.recentResearch.length === 0 ? <p className="text-sm text-[var(--muted)]">There are no research sessions yet.</p> : null}
            {stats.recentResearch.map((item) => (
              <article key={item.id} className="rounded-3xl border border-[var(--line)] bg-white/70 p-4">
                <p className="text-sm font-medium">{item.question}</p>
                <p className="mt-2 line-clamp-4 text-sm leading-6 text-[var(--muted)]">{item.answerMd}</p>
              </article>
            ))}
            {stats.recentOutputs.map((item) => (
              <article key={item.id} className="rounded-3xl border border-[var(--line)] bg-white/70 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium">{item.title}</p>
                  <StatusBadge>{item.outputType}</StatusBadge>
                </div>
                <p className="mt-2 line-clamp-3 text-sm leading-6 text-[var(--muted)]">{item.contentMd}</p>
              </article>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Passports and Backups" description="Outward-facing artifacts and local recovery points.">
          <div className="space-y-4">
            <div className="rounded-3xl border border-[var(--line)] bg-white/70 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Latest Passport</p>
              {stats.latestPassport ? (
                <>
                  <p className="mt-3 text-lg font-semibold">{stats.latestPassport.title}</p>
                  <p className="mt-2 text-sm text-[var(--muted)]">{formatDistanceToNow(new Date(stats.latestPassport.createdAt), { addSuffix: true })}</p>
                </>
              ) : (
                <p className="mt-3 text-sm text-[var(--muted)]">No passport snapshot has been generated yet.</p>
              )}
            </div>
            <div className="rounded-3xl border border-[var(--line)] bg-white/70 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Latest Backup</p>
              {stats.latestBackup ? (
                <>
                  <p className="mt-3 text-sm font-medium">{stats.latestBackup.filePath}</p>
                  <p className="mt-2 text-sm text-[var(--muted)]">{formatDistanceToNow(new Date(stats.latestBackup.createdAt), { addSuffix: true })}</p>
                </>
              ) : (
                <p className="mt-3 text-sm text-[var(--muted)]">No backup exists yet.</p>
              )}
            </div>
          </div>
        </SectionCard>
      </div>
    </PageShell>
  );
}
