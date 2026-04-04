export const dynamic = "force-dynamic";

import { GrantForm } from "@/components/grant-form";
import { PageShell } from "@/components/page-shell";
import { SectionCard, StatusBadge } from "@/components/ui";
import { getAppContext } from "@/server/context";
import { listGrants } from "@/server/services/grants";

export default async function GrantsPage() {
  const grants = await listGrants(getAppContext(), 80);

  return (
    <PageShell currentPath="/grants" title="Grants" subtitle="Inspect and create explicit authorization records instead of relying only on privacy flags">
      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <SectionCard title="Create Grant" description="Create an explicit authorization record for a passport, postcard, node, or source.">
          <GrantForm />
        </SectionCard>
        <SectionCard title="Grant Registry" description="Review active and revoked authorization records.">
          <div className="space-y-3">
            {grants.map((grant) => (
              <article key={grant.id} className="rounded-2xl border border-[var(--line)] bg-white/80 p-4 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge>{grant.status}</StatusBadge>
                    <StatusBadge>{grant.objectType}</StatusBadge>
                    <StatusBadge>{grant.accessLevel}</StatusBadge>
                  </div>
                  <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">{grant.id}</p>
                </div>
                <p className="mt-3 font-medium">{grant.objectId}</p>
                <p className="mt-2 text-[var(--muted)]">
                  {grant.granteeType}
                  {grant.granteeId ? ` · ${grant.granteeId}` : ""}
                  {grant.expiresAt ? ` · expires ${grant.expiresAt}` : ""}
                </p>
                {grant.notes ? <p className="mt-2 text-[var(--muted)]">{grant.notes}</p> : null}
              </article>
            ))}
            {grants.length === 0 ? <p className="text-sm text-[var(--muted)]">No grants exist yet.</p> : null}
          </div>
        </SectionCard>
      </div>
    </PageShell>
  );
}
