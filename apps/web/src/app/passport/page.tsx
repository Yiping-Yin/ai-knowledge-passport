export const dynamic = "force-dynamic";

import Link from "next/link";
import ReactMarkdown from "react-markdown";

import { BackupRestoreForm } from "@/components/backup-restore-form";
import { PageShell } from "@/components/page-shell";
import { PassportControls } from "@/components/passport-controls";
import { SectionCard, StatusBadge } from "@/components/ui";
import { getAppContext } from "@/server/context";
import { listBackups } from "@/server/services/backups";
import { listPassports } from "@/server/services/passports";
import { listWorkspaces } from "@/server/services/workspaces";

export default async function PassportPage() {
  const context = getAppContext();
  const [passports, backups, workspaces] = await Promise.all([
    listPassports(context),
    listBackups(context),
    listWorkspaces(context)
  ]);

  return (
    <PageShell currentPath="/passport" title="Passport" subtitle="Publish the canonical AI entry object: topic cards, active focus, capability signals, and blind spots in one governed manifest">
      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <SectionCard title="Passport and Backup Controls" description="Passport generation packages the context an AI should read first. Backup remains a secondary recovery layer.">
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-3 rounded-3xl border border-[var(--line)] bg-white/80 p-4 text-sm">
              <span className="text-[var(--muted)]">After a passport is generated, move into Mount Center to narrow it into a visa bundle for a specific AI or scenario.</span>
              <Link href="/visas" className="rounded-full border border-[var(--line)] px-4 py-2">
                Create Visa
              </Link>
            </div>
            <PassportControls workspaces={workspaces} />
            <div className="rounded-3xl border border-[var(--line)] bg-white/70 p-4">
              <p className="text-sm leading-6 text-[var(--muted)]">
                Backup restore currently extracts a selected archive into a clean target directory instead of overwriting the live runtime.
              </p>
              <div className="mt-4">
                <BackupRestoreForm />
              </div>
            </div>
          </div>
        </SectionCard>
        <div className="space-y-6">
          <SectionCard title="Passport Snapshots" description="Each passport now captures what an AI should know first: focus, topic cards, signals, and governed boundaries.">
            <div className="space-y-4">
              {passports.map((passport) => (
                <article key={passport.id} className="rounded-3xl border border-[var(--line)] bg-white/80 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">{passport.title}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[var(--muted)]">{passport.id}</p>
                    </div>
                    <StatusBadge tone="success">{passport.privacyFloor}</StatusBadge>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs text-[var(--muted)]">
                    <span className="rounded-full bg-black/5 px-3 py-1">nodes {passport.includeNodeIds.length}</span>
                    <span className="rounded-full bg-black/5 px-3 py-1">topic cards {passport.includePostcardIds.length}</span>
                    <span className="rounded-full bg-black/5 px-3 py-1">
                      themes {Array.isArray(passport.machineManifest.themeMap) ? passport.machineManifest.themeMap.length : 0}
                    </span>
                    <span className="rounded-full bg-black/5 px-3 py-1">
                      signals {typeof passport.machineManifest === "object" && Array.isArray((passport.machineManifest as { capabilitySignals?: unknown[] }).capabilitySignals) ? ((passport.machineManifest as { capabilitySignals?: unknown[] }).capabilitySignals?.length ?? 0) : 0}
                    </span>
                    <span className="rounded-full bg-black/5 px-3 py-1">
                      focus {((passport.machineManifest as { focusCard?: unknown }).focusCard ? "active" : "none")}
                    </span>
                  </div>
                  <div className="prose prose-sm mt-4 max-w-none">
                    <ReactMarkdown>{passport.humanMarkdown}</ReactMarkdown>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-3 text-sm">
                    <a className="rounded-full border border-[var(--line)] px-4 py-2" href={`/api/passports/${passport.id}/human`}>
                      Download Human Markdown
                    </a>
                    <a className="rounded-full border border-[var(--line)] px-4 py-2" href={`/api/passports/${passport.id}/machine`}>
                      Download Machine Manifest
                    </a>
                  </div>
                </article>
              ))}
              {passports.length === 0 ? <p className="text-sm text-[var(--muted)]">There are no passport snapshots yet.</p> : null}
            </div>
          </SectionCard>

          <SectionCard title="Backup History" description="Backup zip files can restore the SQLite database and object directory.">
            <div className="space-y-3">
              {backups.map((backup) => (
                <article key={backup.id} className="rounded-3xl border border-[var(--line)] bg-white/80 p-4 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">{backup.filePath}</p>
                    <StatusBadge>{backup.id}</StatusBadge>
                  </div>
                  <p className="mt-2 text-[var(--muted)]">{backup.note}</p>
                  <p className="mt-2 text-xs text-[var(--muted)]">
                    Objects {backup.manifest.objectFileCount} · SHA {backup.manifest.databaseSha256.slice(0, 12)}...
                  </p>
                </article>
              ))}
              {backups.length === 0 ? <p className="text-sm text-[var(--muted)]">There is no backup history yet.</p> : null}
            </div>
          </SectionCard>
        </div>
      </div>
    </PageShell>
  );
}
