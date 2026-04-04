export const dynamic = "force-dynamic";

import { PageShell } from "@/components/page-shell";
import { SectionCard, StatTile, StatusBadge } from "@/components/ui";
import { getAppContext } from "@/server/context";
import { getVisualOverview } from "@/server/services/visuals";

export default async function VisualsPage() {
  const overview = await getVisualOverview(getAppContext());

  return (
    <PageShell currentPath="/visuals" title="Visuals" subtitle="See the knowledge base as themes, evidence chains, privacy boundaries, and project reuse patterns">
      <section className="grid gap-4 md:grid-cols-4">
        <StatTile label="Accepted Nodes" value={overview.summary.acceptedNodeCount} />
        <StatTile label="Postcards" value={overview.summary.postcardCount} />
        <StatTile label="Sources" value={overview.summary.sourceCount} />
        <StatTile label="Theme Clusters" value={overview.summary.themeCount} hint={`visas ${overview.summary.visaCount} · active ${overview.summary.activeVisaCount}`} />
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard title="Theme Map" description="Top topic clusters inferred from accepted node tags.">
          <div className="grid gap-3 md:grid-cols-2">
            {overview.themeClusters.map((cluster) => (
              <article key={cluster.tag} className="rounded-2xl border border-[var(--line)] bg-white/80 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{cluster.tag}</p>
                  <StatusBadge tone="success">{cluster.count} nodes</StatusBadge>
                </div>
                <div className="mt-3 space-y-2">
                  {cluster.nodes.map((node) => (
                    <p key={node.id} className="text-sm text-[var(--muted)]">{node.title}</p>
                  ))}
                </div>
              </article>
            ))}
            {overview.themeClusters.length === 0 ? <p className="text-sm text-[var(--muted)]">No theme clusters detected yet.</p> : null}
          </div>
        </SectionCard>

        <SectionCard title="Privacy Boundary View" description="Distribution of sources, nodes, and postcards by privacy level.">
          <div className="space-y-3">
            {overview.privacyBoundary.map((entry) => (
              <article key={entry.level} className="rounded-2xl border border-[var(--line)] bg-white/80 px-4 py-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <StatusBadge>{entry.level}</StatusBadge>
                  <span className="text-[var(--muted)]">sources {entry.sourceCount} · nodes {entry.nodeCount} · cards {entry.postcardCount} · visas {entry.visaCount}</span>
                </div>
              </article>
            ))}
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard title="Evidence Chains" description="How postcards connect back to accepted nodes and original sources.">
          <div className="space-y-4">
            {overview.evidenceChains.map((chain) => (
              <article key={chain.postcardId} className="rounded-2xl border border-[var(--line)] bg-white/80 p-4 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{chain.title}</p>
                  <StatusBadge>{chain.cardType}</StatusBadge>
                </div>
                <p className="mt-2 text-[var(--muted)]">nodes {chain.nodeCount} · sources {chain.sourceCount}</p>
                <div className="mt-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Nodes</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {chain.nodes.map((node) => (
                      <StatusBadge key={node.id}>{node.title}</StatusBadge>
                    ))}
                  </div>
                </div>
                <div className="mt-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Sources</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {chain.sources.map((source) => (
                      <StatusBadge key={source.id}>{source.title}</StatusBadge>
                    ))}
                  </div>
                </div>
              </article>
            ))}
            {overview.evidenceChains.length === 0 ? <p className="text-sm text-[var(--muted)]">No evidence chains are available yet.</p> : null}
          </div>
        </SectionCard>

        <SectionCard title="Project Reuse" description="Where accepted nodes and postcards cluster across project scopes.">
          <div className="space-y-3">
            {overview.projectReuse.map((project) => (
              <article key={project.projectKey} className="rounded-2xl border border-[var(--line)] bg-white/80 px-4 py-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{project.projectKey}</p>
                  <span className="text-[var(--muted)]">nodes {project.nodeCount} · cards {project.postcardCount}</span>
                </div>
              </article>
            ))}
            {overview.projectReuse.length === 0 ? <p className="text-sm text-[var(--muted)]">No project reuse data yet.</p> : null}
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard title="Active Visas by Privacy" description="How current outward circulation is distributed across privacy floors.">
          <div className="space-y-3">
            {overview.activeVisasByPrivacy.map((entry) => (
              <article key={entry.level} className="rounded-2xl border border-[var(--line)] bg-white/80 px-4 py-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <StatusBadge>{entry.level}</StatusBadge>
                  <span className="text-[var(--muted)]">active {entry.activeVisaCount} / total {entry.visaCount}</span>
                </div>
              </article>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Visa Access Trends" description="Recent human views, machine downloads, and lightweight flowback submissions.">
          <div className="space-y-3">
            {overview.visaAccessTrends.map((entry) => (
              <article key={entry.date} className="rounded-2xl border border-[var(--line)] bg-white/80 px-4 py-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{entry.date}</p>
                  <span className="text-[var(--muted)]">
                    human {entry.humanViews} · machine {entry.machineDownloads} · feedback {entry.feedbackSubmissions}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard title="Top Circulated Passports" description="Passport snapshots most frequently projected into visas and accessed outward.">
          <div className="space-y-3">
            {overview.topCirculatedPassports.map((entry) => (
              <article key={entry.passportId} className="rounded-2xl border border-[var(--line)] bg-white/80 px-4 py-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{entry.title}</p>
                  <span className="text-[var(--muted)]">visas {entry.visaCount} · access {entry.accessCount}</span>
                </div>
              </article>
            ))}
            {overview.topCirculatedPassports.length === 0 ? <p className="text-sm text-[var(--muted)]">No passport circulation data yet.</p> : null}
          </div>
        </SectionCard>

        <SectionCard title="Top Circulated Postcards" description="Postcards that are most frequently included in outward scenario bundles.">
          <div className="space-y-3">
            {overview.topCirculatedPostcards.map((entry) => (
              <article key={entry.postcardId} className="rounded-2xl border border-[var(--line)] bg-white/80 px-4 py-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{entry.title}</p>
                  <span className="text-[var(--muted)]">visas {entry.visaCount} · access {entry.accessCount}</span>
                </div>
              </article>
            ))}
            {overview.topCirculatedPostcards.length === 0 ? <p className="text-sm text-[var(--muted)]">No postcard circulation data yet.</p> : null}
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Project Circulation" description="How shared visas and access events cluster back onto project scopes.">
        <div className="space-y-3">
          {overview.projectCirculation.map((entry) => (
            <article key={entry.projectKey} className="rounded-2xl border border-[var(--line)] bg-white/80 px-4 py-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium">{entry.projectKey}</p>
                <span className="text-[var(--muted)]">visas {entry.visaCount} · access {entry.accessCount}</span>
              </div>
            </article>
          ))}
          {overview.projectCirculation.length === 0 ? <p className="text-sm text-[var(--muted)]">No project circulation data yet.</p> : null}
        </div>
      </SectionCard>
    </PageShell>
  );
}
