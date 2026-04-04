export const dynamic = "force-dynamic";

import { PageShell } from "@/components/page-shell";
import { ResearchForm } from "@/components/research-form";
import { SectionCard } from "@/components/ui";
import { getAppContext } from "@/server/context";

export default function ResearchPage() {
  return (
    <PageShell currentPath="/research" title="Research" subtitle="Retrieve and reason only over the local knowledge layer and source material">
      <SectionCard title="Research Workspace" description="Answers must include citations and should refuse unsupported claims.">
        <ResearchForm />
      </SectionCard>
    </PageShell>
  );
}
