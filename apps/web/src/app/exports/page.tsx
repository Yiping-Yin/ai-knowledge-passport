export const dynamic = "force-dynamic";

import { ExportPackageActions } from "@/components/export-package-actions";
import { ExportPackageForm } from "@/components/export-package-form";
import { PageShell } from "@/components/page-shell";
import { SectionCard, StatTile, StatusBadge } from "@/components/ui";
import { getAppContext } from "@/server/context";
import { listAgentPacks } from "@/server/services/agent-packs";
import { listAvatarProfiles } from "@/server/services/avatars";
import { listExportPackages } from "@/server/services/exports";

export default async function ExportsPage(props: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const searchParams = props.searchParams ? await props.searchParams : {};
  const defaultPackId = typeof searchParams.agentPackId === "string" ? searchParams.agentPackId : undefined;
  const defaultAvatarId = typeof searchParams.avatarProfileId === "string" ? searchParams.avatarProfileId : undefined;

  const context = getAppContext();
  const [packs, avatars, exports] = await Promise.all([
    listAgentPacks(context, 80),
    listAvatarProfiles(context, 80),
    listExportPackages(context, 80)
  ]);

  const latest = exports[0];

  return (
    <PageShell currentPath="/exports" title="Exports" subtitle="Export governed agent packs as portable cross-AI bundles after the passport and mount layers are already in place">
      <section className="grid gap-4 md:grid-cols-4">
        <StatTile label="Export Packages" value={exports.length} />
        <StatTile label="Latest Export" value={latest?.title ?? "none"} hint={latest?.createdAt ?? "No export packages yet"} />
        <StatTile label="Tracked Packs" value={packs.length} />
        <StatTile label="Avatar Contexts" value={avatars.length} />
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <SectionCard title="Create Cross-AI Bundle" description="Export an agent pack as a versioned zip bundle with manifest, pack snapshot, node/card evidence, and optional avatar profile context.">
          <ExportPackageForm
            packs={packs.map((pack) => ({ id: pack.id, title: pack.title }))}
            avatars={avatars.map((avatar) => ({ id: avatar.id, title: avatar.title, activePackId: avatar.activePackId }))}
            defaultPackId={defaultPackId}
            defaultAvatarId={defaultAvatarId}
          />
          {packs.length === 0 ? <p className="mt-4 text-sm text-[var(--muted)]">Create an agent pack first. Export packages are pack-based in this phase.</p> : null}
        </SectionCard>

        <SectionCard title="Export Registry" description="Internal-only bundle records with checksums, counts, and download actions.">
          <div className="space-y-4">
            {exports.map((entry) => (
              <article key={entry.id} className="rounded-3xl border border-[var(--line)] bg-white/80 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{entry.title}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[var(--muted)]">{entry.id}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge>{entry.objectType}</StatusBadge>
                    <StatusBadge>{entry.status}</StatusBadge>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2 text-xs text-[var(--muted)]">
                  <span className="rounded-full bg-black/5 px-3 py-1">{entry.formatVersion}</span>
                  <span className="rounded-full bg-black/5 px-3 py-1">nodes {entry.counts.nodeCount}</span>
                  <span className="rounded-full bg-black/5 px-3 py-1">cards {entry.counts.postcardCount}</span>
                  <span className="rounded-full bg-black/5 px-3 py-1">citations {entry.counts.citationCount}</span>
                  <span className="rounded-full bg-black/5 px-3 py-1">sha {entry.bundleSha256.slice(0, 12)}...</span>
                </div>
                <p className="mt-3 text-sm text-[var(--muted)]">{entry.createdAt}</p>
                <div className="mt-4">
                  <ExportPackageActions exportId={entry.id} />
                </div>
              </article>
            ))}
            {exports.length === 0 ? <p className="text-sm text-[var(--muted)]">No export packages exist yet.</p> : null}
          </div>
        </SectionCard>
      </div>
    </PageShell>
  );
}
