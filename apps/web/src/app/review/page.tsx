export const dynamic = "force-dynamic";

import { PageShell } from "@/components/page-shell";
import { SectionCard, StatusBadge } from "@/components/ui";
import { getAppContext } from "@/server/context";
import { listKnowledgeNodes } from "@/server/services/compiler";

import { submitReviewAction } from "./actions";

export default async function ReviewPage() {
  const context = getAppContext();
  const nodes = await listKnowledgeNodes(context, "pending_review");
  const acceptedNodes = await listKnowledgeNodes(context, "accepted");

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
    </PageShell>
  );
}
