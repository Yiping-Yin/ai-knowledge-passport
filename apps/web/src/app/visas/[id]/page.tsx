export const dynamic = "force-dynamic";

import Link from "next/link";

import { PageShell } from "@/components/page-shell";
import { SectionCard, StatTile, StatusBadge } from "@/components/ui";
import { VisaActions } from "@/components/visa-actions";
import { VisaFeedbackReview } from "@/components/visa-feedback-review";
import { getAppContext } from "@/server/context";
import {
  getVisaBundleById,
  listVisaAccessLogs,
  listVisaFeedbackQueue
} from "@/server/services/visas";

export default async function VisaDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const context = getAppContext();
  const [visa, accessLogs, feedbackItems] = await Promise.all([
    getVisaBundleById(context, params.id),
    listVisaAccessLogs(context, params.id, 60),
    listVisaFeedbackQueue(context, params.id, 60)
  ]);

  if (!visa) {
    return (
      <PageShell currentPath="/visas" title="Visa Detail" subtitle="This visa bundle does not exist">
        <SectionCard title="Missing Visa">
          <p className="text-sm text-[var(--muted)]">The requested visa bundle could not be found.</p>
          <div className="mt-4">
            <Link href="/visas" className="rounded-full border border-[var(--line)] px-4 py-2 text-sm">
              Back to Visa Workshop
            </Link>
          </div>
        </SectionCard>
      </PageShell>
    );
  }

  const passportContext = visa.machineManifest && typeof visa.machineManifest === "object"
    ? (visa.machineManifest as {
        passportContext?: {
          focusCard?: { title?: string } | null;
          capabilitySignals?: unknown[];
          mistakePatterns?: unknown[];
        };
      }).passportContext ?? null
    : null;

  return (
    <PageShell currentPath="/visas" title="Visa Detail" subtitle="Inspect policy, access state, and external flowback for a single scenario bundle">
      <section className="grid gap-4 md:grid-cols-4">
        <StatTile label="Human Views" value={visa.accessCount} hint={visa.maxAccessCount ? `limit ${visa.maxAccessCount}` : "no limit"} />
        <StatTile label="Machine Downloads" value={visa.machineDownloadCount} hint={visa.maxMachineDownloads ? `limit ${visa.maxMachineDownloads}` : "no limit"} />
        <StatTile label="Pending Feedback" value={feedbackItems.filter((item) => item.status === "pending_review").length} />
        <StatTile label="Last Human Access" value={visa.lastAccessedAt ? "seen" : "never"} hint={visa.lastAccessedAt ?? "No human access yet"} />
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <SectionCard title="Visa Metadata" description="Core configuration, issuance boundaries, and quick actions.">
          <div className="space-y-4 text-sm">
            <div className="flex flex-wrap gap-2">
              <StatusBadge>{visa.status}</StatusBadge>
              <StatusBadge>{visa.privacyFloor}</StatusBadge>
              <StatusBadge>{visa.allowMachineDownload ? "machine on" : "machine off"}</StatusBadge>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Title</p>
              <p className="mt-1 font-medium">{visa.title}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Audience</p>
              <p className="mt-1">{visa.audienceLabel}</p>
            </div>
            {visa.description ? (
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Description</p>
                <p className="mt-1 leading-6">{visa.description}</p>
              </div>
            ) : null}
            {visa.purpose ? (
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Purpose</p>
                <p className="mt-1 leading-6">{visa.purpose}</p>
              </div>
            ) : null}
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Expiry</p>
                <p className="mt-1">{visa.expiresAt ?? "No expiry"}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Source Passport</p>
                <p className="mt-1">{visa.passportId ?? "Direct selection"}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Last Human Access</p>
                <p className="mt-1">{visa.lastAccessedAt ?? "Never"}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Last Machine Access</p>
                <p className="mt-1">{visa.lastMachineAccessedAt ?? "Never"}</p>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Human View Policy</p>
                <p className="mt-1">{visa.maxAccessCount ? `${visa.accessCount}/${visa.maxAccessCount}` : `${visa.accessCount} / unlimited`}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Machine Download Policy</p>
                <p className="mt-1">
                  {visa.allowMachineDownload
                    ? visa.maxMachineDownloads
                      ? `${visa.machineDownloadCount}/${visa.maxMachineDownloads}`
                      : `${visa.machineDownloadCount} / unlimited`
                    : "Disabled"}
                </p>
              </div>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Redaction</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <StatusBadge>{visa.redaction.hideOriginUrls ? "hide origin urls" : "origin urls visible"}</StatusBadge>
                <StatusBadge>{visa.redaction.hideSourcePaths ? "hide source paths" : "source paths visible"}</StatusBadge>
                <StatusBadge>{visa.redaction.hideRawSourceIds ? "hide source ids" : "source ids visible"}</StatusBadge>
              </div>
            </div>
            <VisaActions visaId={visa.id} secretPath={visa.secretPath} machinePath={visa.machinePath} status={visa.status} />
          </div>
        </SectionCard>

        <SectionCard title="Bundle Contents" description="The currently included node and topic-card counts for this visa snapshot.">
          <div className="space-y-4 text-sm">
            <div className="rounded-2xl border border-[var(--line)] bg-white/80 p-4">
              <p className="font-medium">Nodes</p>
              <p className="mt-2 text-[var(--muted)]">{visa.includeNodeIds.length}</p>
            </div>
            <div className="rounded-2xl border border-[var(--line)] bg-white/80 p-4">
              <p className="font-medium">Topic Cards</p>
              <p className="mt-2 text-[var(--muted)]">{visa.includePostcardIds.length}</p>
            </div>
            <div className="rounded-2xl border border-[var(--line)] bg-white/80 p-4">
              <p className="font-medium">Inherited Passport Context</p>
              <p className="mt-2 text-[var(--muted)]">
                Focus {passportContext?.focusCard?.title ?? "none"} · Signals {Array.isArray(passportContext?.capabilitySignals) ? passportContext.capabilitySignals.length : 0} · Blind spots{" "}
                {Array.isArray(passportContext?.mistakePatterns) ? passportContext.mistakePatterns.length : 0}
              </p>
            </div>
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard title="Recent Access Events" description="Human views, machine downloads, and denied attempts for this visa.">
          <div className="space-y-3">
            {accessLogs.map((entry) => (
              <article key={entry.id} className="rounded-2xl border border-[var(--line)] bg-white/80 p-4 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge>{entry.accessType}</StatusBadge>
                    <StatusBadge tone={entry.result === "succeeded" ? "success" : "warn"}>{entry.result}</StatusBadge>
                  </div>
                  <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">{entry.createdAt}</p>
                </div>
                <p className="mt-3 text-[var(--muted)]">
                  {entry.denialReason ? `Reason: ${entry.denialReason}` : "Access granted"}
                  {entry.visitorLabel ? ` · Visitor: ${entry.visitorLabel}` : ""}
                </p>
              </article>
            ))}
            {accessLogs.length === 0 ? <p className="text-sm text-[var(--muted)]">No access events have been recorded yet.</p> : null}
          </div>
        </SectionCard>

        <SectionCard title="Feedback Queue" description="External flowback is captured here and can be triaged without opening a live collaboration channel.">
          <div className="space-y-4">
            {feedbackItems.map((item) => (
              <article key={item.id} className="rounded-2xl border border-[var(--line)] bg-white/80 p-4 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge>{item.feedbackType}</StatusBadge>
                    <StatusBadge>{item.status}</StatusBadge>
                  </div>
                  <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">{item.createdAt}</p>
                </div>
                {item.visitorLabel ? <p className="mt-3 text-[var(--muted)]">Visitor: {item.visitorLabel}</p> : null}
                <p className="mt-3 leading-6">{item.message}</p>
                <div className="mt-4">
                  <VisaFeedbackReview visaId={visa.id} feedbackId={item.id} currentStatus={item.status} />
                </div>
              </article>
            ))}
            {feedbackItems.length === 0 ? <p className="text-sm text-[var(--muted)]">No feedback items exist for this visa yet.</p> : null}
          </div>
        </SectionCard>
      </div>
    </PageShell>
  );
}
