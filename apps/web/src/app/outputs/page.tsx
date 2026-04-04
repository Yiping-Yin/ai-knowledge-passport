export const dynamic = "force-dynamic";

import { PageShell } from "@/components/page-shell";
import { OutputForm } from "@/components/output-form";
import { SectionCard, StatusBadge } from "@/components/ui";
import { getAppContext } from "@/server/context";
import { listOutputs } from "@/server/services/outputs";

export default async function OutputsPage() {
  const outputs = await listOutputs(getAppContext());

  return (
    <PageShell currentPath="/outputs" title="Outputs" subtitle="Turn research results into formal artifacts and flow them back into the knowledge layer">
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <SectionCard title="Create Output" description="Supports markdown memo, brief, outline, and action list.">
          <OutputForm />
        </SectionCard>
        <SectionCard title="Output History" description="Each output can be linked to sources and nodes.">
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
            {outputs.length === 0 ? <p className="text-sm text-[var(--muted)]">There are no saved outputs yet.</p> : null}
          </div>
        </SectionCard>
      </div>
    </PageShell>
  );
}
