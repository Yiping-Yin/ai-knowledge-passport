export const dynamic = "force-dynamic";

import { PageShell } from "@/components/page-shell";
import { ResearchForm } from "@/components/research-form";
import { SectionCard } from "@/components/ui";
import { getAppContext } from "@/server/context";

export default function ResearchPage() {
  return (
    <PageShell currentPath="/research" title="Research" subtitle="只围绕本地知识层与原始材料进行检索和推理">
      <SectionCard title="研究代理台" description="回答必须附引用，没有证据时会拒答。">
        <ResearchForm />
      </SectionCard>
    </PageShell>
  );
}
