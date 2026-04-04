export const dynamic = "force-dynamic";

import { PageShell } from "@/components/page-shell";
import { SectionCard, StatusBadge } from "@/components/ui";
import { getAppContext } from "@/server/context";
import { listKnowledgeNodes } from "@/server/services/compiler";

import { submitReviewAction } from "./actions";

export default async function ReviewPage() {
  const nodes = await listKnowledgeNodes(getAppContext(), "pending_review");

  return (
    <PageShell currentPath="/review" title="Review Queue" subtitle="人工裁决编译结果，再进入正式知识层">
      <SectionCard title="待审阅节点" description="支持 accept、reject、rewrite、merge 四类裁决。">
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
                <textarea name="note" rows={3} className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-sm" placeholder="审阅备注或 merge 说明" />
                <select name="action" defaultValue="accept" className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-sm">
                  <option value="accept">accept</option>
                  <option value="reject">reject</option>
                  <option value="rewrite">rewrite</option>
                  <option value="merge">merge</option>
                </select>
                <div className="space-y-2">
                  <input name="mergedIntoNodeId" className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-sm" placeholder="merge 目标 node id" />
                  <button className="w-full rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-medium text-white">提交裁决</button>
                </div>
              </form>
            </article>
          ))}
          {nodes.length === 0 ? <p className="text-sm text-[var(--muted)]">当前没有待审阅节点。</p> : null}
        </div>
      </SectionCard>
    </PageShell>
  );
}
