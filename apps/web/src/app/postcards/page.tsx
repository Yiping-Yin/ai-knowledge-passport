export const dynamic = "force-dynamic";

import { PageShell } from "@/components/page-shell";
import { PostcardForm } from "@/components/postcard-form";
import { SectionCard, StatusBadge } from "@/components/ui";
import { getAppContext } from "@/server/context";
import { listPostcards } from "@/server/services/postcards";

export default async function PostcardsPage() {
  const postcards = await listPostcards(getAppContext());

  return (
    <PageShell currentPath="/postcards" title="Postcards" subtitle="把重点知识压缩成可组合、可追溯的表达单元">
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <SectionCard title="创建明信片" description="支持手动填写，也支持让 AI 根据关联 node/source 自动生成。">
          <PostcardForm />
        </SectionCard>
        <SectionCard title="明信片列表" description="这些条目后续可以被组合进护照。">
          <div className="space-y-4">
            {postcards.map((card) => (
              <article key={card.id} className="rounded-3xl border border-[var(--line)] bg-white/80 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold">{card.title}</p>
                  <StatusBadge tone="success">{card.cardType}</StatusBadge>
                </div>
                <p className="mt-3 text-sm leading-6">{card.claim}</p>
                <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{card.evidenceSummary}</p>
              </article>
            ))}
            {postcards.length === 0 ? <p className="text-sm text-[var(--muted)]">还没有明信片。</p> : null}
          </div>
        </SectionCard>
      </div>
    </PageShell>
  );
}
