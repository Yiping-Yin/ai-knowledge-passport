export const dynamic = "force-dynamic";

import { PageShell } from "@/components/page-shell";
import { SectionCard, StatusBadge, StatTile } from "@/components/ui";
import { getAppContext } from "@/server/context";
import { listCompilationRuns } from "@/server/services/compilation-runs";

export default async function CompilationRunsPage() {
  const runs = await listCompilationRuns(getAppContext(), 40);
  const succeeded = runs.filter((run) => run.status === "succeeded").length;
  const failed = runs.filter((run) => run.status === "failed").length;

  return (
    <PageShell currentPath="/compilation-runs" title="Compilation Runs" subtitle="Inspect compile history, attached nodes, and structural diffs over time">
      <section className="grid gap-4 md:grid-cols-3">
        <StatTile label="Total Runs" value={runs.length} />
        <StatTile label="Succeeded" value={succeeded} />
        <StatTile label="Failed" value={failed} />
      </section>

      <SectionCard title="Recent Runs" description="Every major compile pass is recorded here with its resulting node mutations.">
        <div className="space-y-4">
          {runs.map((run) => (
            <article key={run.id} className="rounded-2xl border border-[var(--line)] bg-white/80 p-4 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge tone={run.status === "failed" ? "warn" : "success"}>{run.status}</StatusBadge>
                  <StatusBadge>{run.providerName}</StatusBadge>
                  {run.sourceId ? <StatusBadge>{run.sourceId}</StatusBadge> : null}
                </div>
                <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">{run.startedAt}</p>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <div className="rounded-xl bg-black/5 px-3 py-2">
                  <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Inserted Nodes</p>
                  <p className="mt-2 font-semibold">{run.outputNodeIds.length}</p>
                </div>
                <div className="rounded-xl bg-black/5 px-3 py-2">
                  <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Attached Nodes</p>
                  <p className="mt-2 font-semibold">{run.attachedNodeIds.length}</p>
                </div>
                <div className="rounded-xl bg-black/5 px-3 py-2">
                  <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Candidates</p>
                  <p className="mt-2 font-semibold">{Number(run.diffSummary.candidateCount ?? 0)}</p>
                </div>
              </div>
              {run.errorMessage ? <p className="mt-3 text-[var(--warn)]">{run.errorMessage}</p> : null}
            </article>
          ))}
          {runs.length === 0 ? <p className="text-sm text-[var(--muted)]">No compilation runs have been recorded yet.</p> : null}
        </div>
      </SectionCard>
    </PageShell>
  );
}
