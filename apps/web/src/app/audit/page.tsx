export const dynamic = "force-dynamic";

import Link from "next/link";

import { PageShell } from "@/components/page-shell";
import { SectionCard, StatTile, StatusBadge } from "@/components/ui";
import { getAppContext } from "@/server/context";
import { getAuditSummary, listAuditLogs } from "@/server/services/audit";

const filterLinks = [
  { label: "All", href: "/audit" },
  { label: "Failed", href: "/audit?result=failed" },
  { label: "Warnings", href: "/audit?result=warning" },
  { label: "Source Events", href: "/audit?objectType=source" },
  { label: "Node Events", href: "/audit?objectType=wiki_node" },
  { label: "Research Events", href: "/audit?objectType=research_session" },
  { label: "Visa Events", href: "/audit?objectType=visa_bundle" },
  { label: "Visa Feedback", href: "/audit?objectType=visa_feedback" }
];

export default async function AuditPage(props: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const searchParams = props.searchParams ? await props.searchParams : {};
  const result = typeof searchParams.result === "string" ? searchParams.result : undefined;
  const objectType = typeof searchParams.objectType === "string" ? searchParams.objectType : undefined;
  const actionType = typeof searchParams.actionType === "string" ? searchParams.actionType : undefined;

  const context = getAppContext();
  const [summary, entries] = await Promise.all([
    getAuditSummary(context),
    listAuditLogs(context, {
      result,
      objectType,
      actionType,
      limit: 40
    })
  ]);

  return (
    <PageShell currentPath="/audit" title="Audit Log" subtitle="Inspect the event history for imports, compilation, sharing, review, research, exports, and restore operations">
      <section className="grid gap-4 md:grid-cols-4">
        <StatTile label="Total Events" value={summary.total} />
        <StatTile label="Failed Events" value={summary.failed} />
        <StatTile label="Warnings" value={summary.warning} />
        <StatTile label="Latest Event" value={summary.latest?.actionType ?? "none"} hint={summary.latest?.timestamp ?? "No audit records yet"} />
      </section>

      <SectionCard title="Quick Filters" description="Use these links to narrow the audit history by result or object type.">
        <div className="flex flex-wrap gap-2">
          {filterLinks.map((filter) => (
            <Link key={filter.href} href={filter.href} className="rounded-full border border-[var(--line)] px-4 py-2 text-sm">
              {filter.label}
            </Link>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Recent Audit Entries" description="The most recent recorded events in the local system.">
        <div className="space-y-3">
          {entries.map((entry) => (
            <article key={entry.id} className="rounded-2xl border border-[var(--line)] bg-white/80 p-4 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge tone={entry.result === "failed" ? "warn" : entry.result === "succeeded" ? "success" : "default"}>
                    {entry.result}
                  </StatusBadge>
                  <StatusBadge>{entry.objectType}</StatusBadge>
                  <StatusBadge>{entry.actionType}</StatusBadge>
                </div>
                <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">{entry.timestamp}</p>
              </div>
              <p className="mt-3 font-medium">{entry.objectId}</p>
              {entry.notes ? <p className="mt-2 text-[var(--muted)]">{entry.notes}</p> : null}
            </article>
          ))}
          {entries.length === 0 ? <p className="text-sm text-[var(--muted)]">No audit entries match the current filter.</p> : null}
        </div>
      </SectionCard>
    </PageShell>
  );
}
