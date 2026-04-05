export const dynamic = "force-dynamic";

import { CompileButton } from "@/components/compile-button";
import { ImportForm } from "@/components/import-form";
import { PageShell } from "@/components/page-shell";
import { RetryButton } from "@/components/retry-button";
import { SectionCard, StatusBadge } from "@/components/ui";
import { getAppContext } from "@/server/context";
import { parseJsonObject } from "@/server/services/common";
import { listSources } from "@/server/services/sources";
import { listWorkspaces } from "@/server/services/workspaces";

export default async function InboxPage() {
  const context = getAppContext();
  const [sources, workspaces] = await Promise.all([
    listSources(context),
    listWorkspaces(context)
  ]);

  return (
    <PageShell currentPath="/inbox" title="Inbox" subtitle="Bring everything into one place and send it into the compile queue">
      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <SectionCard title="Import Sources" description="Supports markdown, txt, pdf, url, image, chat transcript, and audio.">
          <ImportForm workspaces={workspaces} />
        </SectionCard>
        <SectionCard title="Inbox Queue" description="Each source keeps its origin, privacy level, latest job state, and processing status.">
          <div className="space-y-4">
            {sources.map((source) => (
              <article key={source.id} className="rounded-3xl border border-[var(--line)] bg-white/80 p-4">
                {(() => {
                  const metadata = parseJsonObject<Record<string, unknown>>(source.metadataJson, {});
                  const normalization = metadata.normalization && typeof metadata.normalization === "object"
                    ? (metadata.normalization as Record<string, unknown>)
                    : null;

                  return (
                    <>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold">{source.title}</p>
                          <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                            {source.type} · {source.id}
                          </p>
                        </div>
                        <StatusBadge tone={source.status === "failed" ? "warn" : source.status === "confirmed" ? "success" : "default"}>
                          {source.status}
                        </StatusBadge>
                      </div>
                      <p className="mt-3 text-sm text-[var(--muted)]">
                        Workspace: {source.workspaceId} · Privacy: {source.privacyLevel}
                        {source.projectKey ? ` · Project: ${source.projectKey}` : ""}
                      </p>
                      {normalization ? (
                        <p className="mt-2 text-xs text-[var(--muted)]">
                          Parser: {String(normalization.parser ?? "unknown")}
                          {typeof normalization.charCount === "number" ? ` · ${normalization.charCount} chars` : ""}
                          {typeof normalization.wordCount === "number" ? ` · ${normalization.wordCount} words` : ""}
                          {typeof normalization.pageCount === "number" ? ` · ${normalization.pageCount} pages` : ""}
                        </p>
                      ) : null}
                      {source.latestJob ? (
                        <p className="mt-2 text-xs text-[var(--muted)]">
                          Latest job: {source.latestJob.jobType} · {source.latestJob.status}
                          {source.latestJob.errorMessage ? ` · ${source.latestJob.errorMessage}` : ""}
                        </p>
                      ) : null}
                      {source.errorMessage ? (
                        <div className="mt-3 rounded-2xl bg-[var(--warn-soft)] px-4 py-3 text-sm text-[var(--warn)]">
                          {source.errorMessage}
                        </div>
                      ) : null}
                      <div className="mt-4 flex items-center justify-between gap-3">
                        <p className="line-clamp-2 text-sm leading-6 text-[var(--muted)]">
                          {source.extractedText || source.originUrl || "Raw content pending extraction"}
                        </p>
                        <div className="flex items-center gap-2">
                          <CompileButton sourceId={source.id} />
                          {source.status === "failed" ? <RetryButton sourceId={source.id} /> : null}
                        </div>
                      </div>
                    </>
                  );
                })()}
              </article>
            ))}
            {sources.length === 0 ? <p className="text-sm text-[var(--muted)]">There are no sources yet.</p> : null}
          </div>
        </SectionCard>
      </div>
    </PageShell>
  );
}
