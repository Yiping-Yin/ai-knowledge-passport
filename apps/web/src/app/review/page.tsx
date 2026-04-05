export const dynamic = "force-dynamic";

import { PageShell } from "@/components/page-shell";
import { SectionCard, StatusBadge } from "@/components/ui";
import { getAppContext } from "@/server/context";
import { listKnowledgeNodes } from "@/server/services/compiler";
import { listCapabilitySignals, listMistakePatterns } from "@/server/services/signals";

import { submitReviewAction } from "./actions";

export default async function ReviewPage() {
  const context = getAppContext();
  const [nodes, acceptedNodes, pendingSignals, pendingMistakes] = await Promise.all([
    listKnowledgeNodes(context, "pending_review"),
    listKnowledgeNodes(context, "accepted"),
    listCapabilitySignals(context, { status: "pending_review", limit: 40 }),
    listMistakePatterns(context, { status: "pending_review", limit: 40 })
  ]);

  return (
    <PageShell currentPath="/review" title="Review Queue" subtitle="Review compiled results before they enter the formal knowledge layer">
      <SectionCard title="Pending Review Nodes" description="Supports accept, reject, rewrite, and merge review actions.">
        <datalist id="merge-targets">
          {acceptedNodes.map((acceptedNode) => (
            <option key={acceptedNode.id} value={acceptedNode.id}>
              {acceptedNode.title}
            </option>
          ))}
        </datalist>
        <div className="space-y-4">
          {nodes.map((node) => (
            <article key={node.id} className="rounded-3xl border border-[var(--line)] bg-white/80 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold">{node.title}</p>
                  <p className="mt-1 text-sm text-[var(--muted)]">{node.summary}</p>
                </div>
                <StatusBadge tone="warn">{node.nodeType}</StatusBadge>
              </div>
              <pre className="mt-4 text-sm leading-7 text-[var(--muted)]">{node.bodyMd}</pre>
              <form action={submitReviewAction} className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_160px_180px]">
                <input type="hidden" name="nodeId" value={node.id} />
                <textarea name="note" rows={3} className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-sm" placeholder="Review note or merge rationale" />
                <select name="action" defaultValue="accept" className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-sm">
                  <option value="accept">accept</option>
                  <option value="reject">reject</option>
                  <option value="rewrite">rewrite</option>
                  <option value="merge">merge</option>
                </select>
                <div className="space-y-2">
                  <input name="mergedIntoNodeId" list="merge-targets" className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-sm" placeholder="Merge target node id" />
                  <button className="w-full rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-medium text-white">Submit Review</button>
                </div>
              </form>
            </article>
          ))}
          {nodes.length === 0 ? <p className="text-sm text-[var(--muted)]">There are no pending review nodes right now.</p> : null}
        </div>
      </SectionCard>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard title="Pending Capability Signals" description="These are evidence-backed signals that describe likely strengths and current gaps.">
          <div className="space-y-4">
            {pendingSignals.map((signal) => (
              <article key={signal.id} className="rounded-3xl border border-[var(--line)] bg-white/80 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold">{signal.topic}</p>
                    <p className="mt-1 text-sm text-[var(--muted)]">{signal.observedPractice}</p>
                  </div>
                  <StatusBadge tone="warn">signal</StatusBadge>
                </div>
                <p className="mt-3 text-sm leading-6 text-[var(--muted)]">Current gaps: {signal.currentGaps}</p>
                <p className="mt-2 text-xs text-[var(--muted)]">
                  Confidence {signal.confidence.toFixed(2)} · Nodes {signal.evidenceNodeIds.length} · Fragments {signal.evidenceFragmentIds.length}
                </p>
                <form action={submitReviewAction} className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_160px]">
                  <input type="hidden" name="itemType" value="signal" />
                  <input type="hidden" name="signalId" value={signal.id} />
                  <textarea name="note" rows={3} className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-sm" placeholder="Optional note" />
                  <div className="space-y-2">
                    <select name="action" defaultValue="accept" className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-sm">
                      <option value="accept">accept</option>
                      <option value="reject">reject</option>
                    </select>
                    <button className="w-full rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-medium text-white">Submit Review</button>
                  </div>
                </form>
              </article>
            ))}
            {pendingSignals.length === 0 ? <p className="text-sm text-[var(--muted)]">There are no pending capability signals right now.</p> : null}
          </div>
        </SectionCard>

        <SectionCard title="Pending Mistake Patterns" description="Recurring misconceptions and blind spots should be reviewed before they shape passport context.">
          <div className="space-y-4">
            {pendingMistakes.map((mistake) => (
              <article key={mistake.id} className="rounded-3xl border border-[var(--line)] bg-white/80 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold">{mistake.topic}</p>
                    <p className="mt-1 text-sm text-[var(--muted)]">{mistake.description}</p>
                  </div>
                  <StatusBadge tone="warn">mistake</StatusBadge>
                </div>
                <p className="mt-3 text-sm leading-6 text-[var(--muted)]">Fix suggestions: {mistake.fixSuggestions}</p>
                <p className="mt-2 text-xs text-[var(--muted)]">
                  Recurrence {mistake.recurrenceCount} · Nodes {mistake.exampleNodeIds.length} · Fragments {mistake.exampleFragmentIds.length}
                </p>
                <form action={submitReviewAction} className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_160px]">
                  <input type="hidden" name="itemType" value="mistake" />
                  <input type="hidden" name="mistakeId" value={mistake.id} />
                  <textarea name="note" rows={3} className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-sm" placeholder="Optional note" />
                  <div className="space-y-2">
                    <select name="action" defaultValue="accept" className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-sm">
                      <option value="accept">accept</option>
                      <option value="reject">reject</option>
                    </select>
                    <button className="w-full rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-medium text-white">Submit Review</button>
                  </div>
                </form>
              </article>
            ))}
            {pendingMistakes.length === 0 ? <p className="text-sm text-[var(--muted)]">There are no pending mistake patterns right now.</p> : null}
          </div>
        </SectionCard>
      </div>
    </PageShell>
  );
}
