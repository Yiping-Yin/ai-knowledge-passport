export const dynamic = "force-dynamic";

import Link from "next/link";

import { PageShell } from "@/components/page-shell";
import { SectionCard, StatTile, StatusBadge } from "@/components/ui";
import { VisaActions } from "@/components/visa-actions";
import { VisaForm } from "@/components/visa-form";
import { getAppContext } from "@/server/context";
import { postcards, wikiNodes } from "@/server/db/schema";
import { listPassports } from "@/server/services/passports";
import { parseJsonArray } from "@/server/services/common";
import { listVisaBundles } from "@/server/services/visas";

export default async function VisasPage() {
  const context = getAppContext();
  const [visas, passports, postcardRows, acceptedNodes] = await Promise.all([
    listVisaBundles(context, 80),
    listPassports(context),
    context.db.query.postcards.findMany(),
    context.db.query.wikiNodes.findMany({
      where: (table, { eq }) => eq(table.status, "accepted")
    })
  ]);

  const summary = {
    total: visas.length,
    active: visas.filter((visa) => visa.status === "active").length,
    pendingFeedback: visas.reduce((sum, visa) => sum + visa.pendingFeedbackCount, 0),
    machineEnabled: visas.filter((visa) => visa.allowMachineDownload).length
  };

  return (
    <PageShell currentPath="/visas" title="Visas" subtitle="Manage scenario bundles as a live sharing product with policies, access state, and lightweight flowback">
      <section className="grid gap-4 md:grid-cols-4">
        <StatTile label="Total Visas" value={summary.total} />
        <StatTile label="Active Visas" value={summary.active} />
        <StatTile label="Pending Feedback" value={summary.pendingFeedback} />
        <StatTile label="Machine Enabled" value={summary.machineEnabled} />
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <SectionCard
          title="Create Visa Bundle"
          description="Create a managed read-only scenario bundle with expiry, usage limits, redaction rules, and machine-download policy."
        >
          <VisaForm
            passports={passports.map((passport) => ({
              id: passport.id,
              title: passport.title
            }))}
          />
        </SectionCard>

        <SectionCard title="Issued Visas" description="Track current share state, access activity, and pending external flowback.">
          <div className="space-y-4">
            {visas.map((visa) => (
              <article key={visa.id} className="rounded-3xl border border-[var(--line)] bg-white/80 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{visa.title}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[var(--muted)]">{visa.id}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge>{visa.status}</StatusBadge>
                    <StatusBadge>{visa.privacyFloor}</StatusBadge>
                    <StatusBadge>{visa.allowMachineDownload ? "machine on" : "machine off"}</StatusBadge>
                  </div>
                </div>

                {visa.description ? <p className="mt-3 text-sm leading-6">{visa.description}</p> : null}
                {visa.purpose ? <p className="mt-2 text-sm text-[var(--muted)]">Purpose: {visa.purpose}</p> : null}

                <div className="mt-4 flex flex-wrap gap-2 text-xs text-[var(--muted)]">
                  <span className="rounded-full bg-black/5 px-3 py-1">audience {visa.audienceLabel}</span>
                  <span className="rounded-full bg-black/5 px-3 py-1">nodes {visa.includeNodeIds.length}</span>
                  <span className="rounded-full bg-black/5 px-3 py-1">cards {visa.includePostcardIds.length}</span>
                  <span className="rounded-full bg-black/5 px-3 py-1">{visa.expiresAt ? `expires ${visa.expiresAt}` : "no expiry"}</span>
                  <span className="rounded-full bg-black/5 px-3 py-1">
                    {visa.maxAccessCount ? `views ${visa.accessCount}/${visa.maxAccessCount}` : `views ${visa.accessCount}`}
                  </span>
                  <span className="rounded-full bg-black/5 px-3 py-1">
                    {visa.maxMachineDownloads
                      ? `machine ${visa.machineDownloadCount}/${visa.maxMachineDownloads}`
                      : `machine ${visa.machineDownloadCount}`}
                  </span>
                  <span className="rounded-full bg-black/5 px-3 py-1">feedback {visa.pendingFeedbackCount}</span>
                </div>

                <p className="mt-3 text-sm text-[var(--muted)]">
                  Source passport: {visa.passportId ?? "direct selection"} · Last human access: {visa.lastAccessedAt ?? "never"} · Last machine access:{" "}
                  {visa.lastMachineAccessedAt ?? "never"}
                </p>

                <div className="mt-4">
                  <VisaActions visaId={visa.id} secretPath={visa.secretPath} machinePath={visa.machinePath} status={visa.status} />
                </div>
              </article>
            ))}
            {visas.length === 0 ? <p className="text-sm text-[var(--muted)]">There are no visa bundles yet.</p> : null}
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Selection Reference" description="Use these IDs to build a visa directly, or start from an existing passport snapshot.">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold">Passports</h4>
              <Link href="/passport" className="text-sm text-[var(--accent)]">
                Open Passport
              </Link>
            </div>
            {passports.map((passport) => (
              <article key={passport.id} className="rounded-2xl border border-[var(--line)] bg-white/80 p-3 text-sm">
                <p className="font-medium">{passport.title}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[var(--muted)]">{passport.id}</p>
              </article>
            ))}
            {passports.length === 0 ? <p className="text-sm text-[var(--muted)]">No passport snapshots are available yet.</p> : null}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold">Postcards</h4>
              <Link href="/postcards" className="text-sm text-[var(--accent)]">
                Open Postcards
              </Link>
            </div>
            {postcardRows.map((card) => (
              <article key={card.id} className="rounded-2xl border border-[var(--line)] bg-white/80 p-3 text-sm">
                <p className="font-medium">{card.title}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                  {card.id} · {card.cardType}
                </p>
              </article>
            ))}
            {postcardRows.length === 0 ? <p className="text-sm text-[var(--muted)]">No postcards are available yet.</p> : null}
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-semibold">Accepted Nodes</h4>
            {acceptedNodes.map((node) => (
              <article key={node.id} className="rounded-2xl border border-[var(--line)] bg-white/80 p-3 text-sm">
                <p className="font-medium">{node.title}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[var(--muted)]">{node.id}</p>
                <p className="mt-2 text-xs text-[var(--muted)]">
                  {parseJsonArray<string>(node.tagsJson).length ? parseJsonArray<string>(node.tagsJson).join(", ") : "No tags"}
                </p>
              </article>
            ))}
            {acceptedNodes.length === 0 ? <p className="text-sm text-[var(--muted)]">No accepted nodes are available yet.</p> : null}
          </div>
        </div>
      </SectionCard>
    </PageShell>
  );
}
