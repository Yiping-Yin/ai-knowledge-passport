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
    <PageShell currentPath="/knowledge" title="Knowledge" subtitle="Confirmed local wiki nodes, source back-links, and graph relationships">
      <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
        <SectionCard title="Node List" description="This view only shows accepted formal knowledge nodes.">
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
            {nodes.length === 0 ? <p className="text-sm text-[var(--muted)]">There are no accepted nodes yet.</p> : null}
          </div>
        </SectionCard>

        <SectionCard title={selected?.node?.title ?? "Node Details"} description="Body content, sources, and graph edges are shown in one panel.">
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
                  {selected.edges.length === 0 ? <p className="text-sm text-[var(--muted)]">No edge relationships yet.</p> : null}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-[var(--muted)]">No node selected.</p>
          )}
        </SectionCard>
      </div>

      <SectionCard title="Advanced Tools" description="These routes remain available for deeper operator work, but they are no longer first-layer navigation in the MVP release candidate.">
        <div className="flex flex-wrap gap-3">
          <Link href="/signals" className="rounded-full border border-[var(--line)] px-4 py-2 text-sm">
            Open Signals
          </Link>
          <Link href="/postcards" className="rounded-full border border-[var(--line)] px-4 py-2 text-sm">
            Open Topic Cards
          </Link>
          <Link href="/research" className="rounded-full border border-[var(--line)] px-4 py-2 text-sm">
            Open Research
          </Link>
        </div>
      </SectionCard>
    </PageShell>
  );
}
