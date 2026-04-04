export const dynamic = "force-dynamic";

import { PageShell } from "@/components/page-shell";
import { SectionCard, StatTile, StatusBadge } from "@/components/ui";
import { getAppContext } from "@/server/context";
import { getHealthReport } from "@/server/services/health";

export default async function HealthPage() {
  const report = await getHealthReport(getAppContext());

  return (
    <PageShell currentPath="/health" title="Health Center" subtitle="Audit the quality, traceability, and recoverability of the local knowledge base">
      <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <StatTile label="Failed Sources" value={report.summary.failedSources} />
        <StatTile label="Pending Review" value={report.summary.pendingReviewNodes} />
        <StatTile label="Duplicate Groups" value={report.summary.duplicateGroups} />
        <StatTile label="Weak Research" value={report.summary.weakResearchSessions} />
        <StatTile label="Traceability Gaps" value={report.summary.traceabilityGaps} />
        <StatTile label="Backup Status" value={report.summary.backupStatus} hint={report.summary.backupAgeDays === null ? "No backup yet" : `${report.summary.backupAgeDays} day(s) old`} />
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard title="Repair Suggestions" description="Priority actions inferred from the current knowledge base state.">
          <div className="space-y-3">
            {report.suggestions.map((suggestion) => (
              <div key={suggestion} className="rounded-2xl border border-[var(--line)] bg-white/80 px-4 py-3 text-sm">
                {suggestion}
              </div>
            ))}
            {report.suggestions.length === 0 ? <p className="text-sm text-[var(--muted)]">No obvious repairs are recommended right now.</p> : null}
          </div>
        </SectionCard>

        <SectionCard title="Failed Sources" description="Sources that currently block the import or compile pipeline.">
          <div className="space-y-3">
            {report.failedSources.map((source) => (
              <article key={source.id} className="rounded-2xl border border-[var(--line)] bg-white/80 px-4 py-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{source.title}</p>
                  <StatusBadge tone="warn">{source.status}</StatusBadge>
                </div>
                <p className="mt-2 text-[var(--muted)]">{source.errorMessage ?? "Unknown failure"}</p>
              </article>
            ))}
            {report.failedSources.length === 0 ? <p className="text-sm text-[var(--muted)]">No failed sources.</p> : null}
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard title="Duplicate Node Groups" description="Accepted or pending nodes that share the same normalized title.">
          <div className="space-y-4">
            {report.duplicateNodes.map((group) => (
              <article key={group.normalizedTitle} className="rounded-2xl border border-[var(--line)] bg-white/80 p-4">
                <p className="text-sm font-medium">{group.normalizedTitle}</p>
                <div className="mt-3 space-y-2">
                  {group.nodes.map((node) => (
                    <div key={node.id} className="flex items-center justify-between gap-3 rounded-xl bg-black/5 px-3 py-2 text-sm">
                      <span>{node.title}</span>
                      <StatusBadge>{node.status}</StatusBadge>
                    </div>
                  ))}
                </div>
              </article>
            ))}
            {report.duplicateNodes.length === 0 ? <p className="text-sm text-[var(--muted)]">No duplicate node groups detected.</p> : null}
          </div>
        </SectionCard>

        <SectionCard title="Weak Research Sessions" description="Recent research sessions with fewer than two saved citations.">
          <div className="space-y-3">
            {report.weakResearchSessions.map((session) => (
              <article key={session.id} className="rounded-2xl border border-[var(--line)] bg-white/80 px-4 py-3 text-sm">
                <p className="font-medium">{session.question}</p>
                <p className="mt-2 text-[var(--muted)]">{session.answerMd.slice(0, 180)}</p>
              </article>
            ))}
            {report.weakResearchSessions.length === 0 ? <p className="text-sm text-[var(--muted)]">No weak research sessions detected.</p> : null}
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard title="Traceability Gaps" description="Nodes that currently have no linked source ids.">
          <div className="space-y-3">
            {report.traceabilityGaps.map((node) => (
              <article key={node.id} className="rounded-2xl border border-[var(--line)] bg-white/80 px-4 py-3 text-sm">
                <p className="font-medium">{node.title}</p>
                <p className="mt-2 text-[var(--muted)]">{node.summary}</p>
              </article>
            ))}
            {report.traceabilityGaps.length === 0 ? <p className="text-sm text-[var(--muted)]">All visible nodes have source references.</p> : null}
          </div>
        </SectionCard>

        <SectionCard title="Backup Posture" description="The latest backup state and its age.">
          {report.latestBackup ? (
            <article className="rounded-2xl border border-[var(--line)] bg-white/80 p-4 text-sm">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium">{report.latestBackup.filePath}</p>
                <StatusBadge tone={report.summary.backupStatus === "healthy" ? "success" : "warn"}>
                  {report.summary.backupStatus}
                </StatusBadge>
              </div>
              <p className="mt-2 text-[var(--muted)]">{report.latestBackup.note}</p>
            </article>
          ) : (
            <p className="text-sm text-[var(--muted)]">No backup has been created yet.</p>
          )}
        </SectionCard>
      </div>
    </PageShell>
  );
}
