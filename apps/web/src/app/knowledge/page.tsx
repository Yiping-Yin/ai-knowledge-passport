export const dynamic = "force-dynamic";

import Link from "next/link";
import ReactMarkdown from "react-markdown";

import { PageShell } from "@/components/page-shell";
import { SectionCard, StatusBadge } from "@/components/ui";
import { getAppContext } from "@/server/context";
import { getKnowledgeNode, listKnowledgeNodes } from "@/server/services/compiler";
import { parseJsonArray } from "@/server/services/common";

export default async function KnowledgePage(props: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const context = getAppContext();
  const nodes = await listKnowledgeNodes(context, "accepted");
  const searchParams = props.searchParams ? await props.searchParams : {};
  const selectedId = typeof searchParams.node === "string" ? searchParams.node : nodes[0]?.id;
  const selected = selectedId ? await getKnowledgeNode(context, selectedId) : null;

  return (
    <PageShell currentPath="/knowledge" title="Knowledge" subtitle="已确认的本地 wiki、来源回链与节点关系">
      <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
        <SectionCard title="Node 列表" description="这里只展示已 accepted 的正式知识节点。">
          <div className="space-y-3">
            {nodes.map((node) => (
              <Link key={node.id} href={`/knowledge?node=${node.id}`} className="block rounded-3xl border border-[var(--line)] bg-white/80 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold">{node.title}</p>
                  <StatusBadge tone="success">{node.nodeType}</StatusBadge>
                </div>
                <p className="mt-2 line-clamp-3 text-sm leading-6 text-[var(--muted)]">{node.summary}</p>
              </Link>
            ))}
            {nodes.length === 0 ? <p className="text-sm text-[var(--muted)]">还没有 accepted 节点。</p> : null}
          </div>
        </SectionCard>

        <SectionCard title={selected?.node?.title ?? "节点详情"} description="正文、来源和边关系都在一个面板查看。">
          {selected?.node ? (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge tone="success">{selected.node.status}</StatusBadge>
                {parseJsonArray<string>(selected.node.tagsJson).map((tag) => (
                  <StatusBadge key={tag}>{tag}</StatusBadge>
                ))}
              </div>
              <article className="prose prose-sm max-w-none">
                <ReactMarkdown>{selected.node.bodyMd}</ReactMarkdown>
              </article>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Source IDs</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {parseJsonArray<string>(selected.node.sourceIdsJson).map((sourceId) => (
                    <StatusBadge key={sourceId}>{sourceId}</StatusBadge>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Edges</p>
                <div className="mt-3 space-y-3">
                  {selected.edges.map((edge) => (
                    <div key={edge.id} className="rounded-2xl border border-[var(--line)] bg-white/80 px-4 py-3 text-sm">
                      {edge.fromNodeId} → {edge.toNodeId} · {edge.relationType} · weight {edge.weight}
                    </div>
                  ))}
                  {selected.edges.length === 0 ? <p className="text-sm text-[var(--muted)]">暂无边关系。</p> : null}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-[var(--muted)]">暂无节点。</p>
          )}
        </SectionCard>
      </div>
    </PageShell>
  );
}
