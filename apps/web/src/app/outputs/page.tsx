export const dynamic = "force-dynamic";

import { PageShell } from "@/components/page-shell";
import { OutputForm } from "@/components/output-form";
import { SectionCard, StatusBadge } from "@/components/ui";
import { getAppContext } from "@/server/context";
import { listOutputs } from "@/server/services/outputs";

export default async function OutputsPage() {
  const outputs = await listOutputs(getAppContext());

  return (
    <PageShell currentPath="/outputs" title="Outputs" subtitle="把研究结果沉淀成正式产物，再回流知识层">
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <SectionCard title="新建输出" description="支持 markdown memo、brief、outline、action list。">
          <OutputForm />
        </SectionCard>
        <SectionCard title="历史输出" description="每个输出都可以关联 source 与 node。">
          <div className="space-y-4">
            {outputs.map((output) => (
              <article key={output.id} className="rounded-3xl border border-[var(--line)] bg-white/80 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold">{output.title}</p>
                  <StatusBadge>{output.outputType}</StatusBadge>
                </div>
                <pre className="mt-3 line-clamp-6 text-sm leading-6 text-[var(--muted)]">{output.contentMd}</pre>
              </article>
            ))}
            {outputs.length === 0 ? <p className="text-sm text-[var(--muted)]">还没有保存的 output。</p> : null}
          </div>
        </SectionCard>
      </div>
    </PageShell>
  );
}
