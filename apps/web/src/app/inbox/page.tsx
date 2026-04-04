export const dynamic = "force-dynamic";

import { CompileButton } from "@/components/compile-button";
import { ImportForm } from "@/components/import-form";
import { PageShell } from "@/components/page-shell";
import { SectionCard, StatusBadge } from "@/components/ui";
import { getAppContext } from "@/server/context";
import { listSources } from "@/server/services/sources";

export default async function InboxPage() {
  const sources = await listSources(getAppContext());

  return (
    <PageShell currentPath="/inbox" title="Inbox" subtitle="统一入库，进入待编译收件箱">
      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <SectionCard title="导入材料" description="支持 markdown、txt、pdf、url、image、chat transcript 和 audio。">
          <ImportForm />
        </SectionCard>
        <SectionCard title="收件箱" description="每条材料保留来源、隐私等级和待处理状态。">
          <div className="space-y-4">
            {sources.map((source) => (
              <article key={source.id} className="rounded-3xl border border-[var(--line)] bg-white/80 p-4">
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
                  隐私：{source.privacyLevel}
                  {source.projectKey ? ` · 项目：${source.projectKey}` : ""}
                </p>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <p className="line-clamp-2 text-sm leading-6 text-[var(--muted)]">{source.extractedText || source.originUrl || "待解析原文"}</p>
                  <CompileButton sourceId={source.id} />
                </div>
              </article>
            ))}
            {sources.length === 0 ? <p className="text-sm text-[var(--muted)]">还没有任何 source。</p> : null}
          </div>
        </SectionCard>
      </div>
    </PageShell>
  );
}
