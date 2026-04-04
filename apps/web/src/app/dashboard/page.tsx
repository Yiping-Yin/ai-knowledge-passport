export const dynamic = "force-dynamic";

import { formatDistanceToNow } from "date-fns";

import { PageShell } from "@/components/page-shell";
import { SectionCard, StatTile, StatusBadge } from "@/components/ui";
import { getAppContext } from "@/server/context";
import { getDashboardStats } from "@/server/services/dashboard";

export default async function DashboardPage() {
  const stats = await getDashboardStats(getAppContext());

  return (
    <PageShell currentPath="/dashboard" title="Dashboard" subtitle="今日知识增长与对外投影总览">
      <section className="grid gap-4 md:grid-cols-3">
        <StatTile label="今日导入" value={stats.importsToday} hint="当日入库材料数量" />
        <StatTile label="待编译" value={stats.pendingCompile} hint="已归档、待编译 source" />
        <StatTile label="待审阅" value={stats.pendingReview} hint="编译后待用户裁决 node" />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="近期研究输出" description="研究问答和正式输出都在这里回看。">
          <div className="space-y-4">
            {stats.recentResearch.length === 0 ? <p className="text-sm text-[var(--muted)]">还没有研究会话。</p> : null}
            {stats.recentResearch.map((item) => (
              <article key={item.id} className="rounded-3xl border border-[var(--line)] bg-white/70 p-4">
                <p className="text-sm font-medium">{item.question}</p>
                <p className="mt-2 line-clamp-4 text-sm leading-6 text-[var(--muted)]">{item.answerMd}</p>
              </article>
            ))}
            {stats.recentOutputs.map((item) => (
              <article key={item.id} className="rounded-3xl border border-[var(--line)] bg-white/70 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium">{item.title}</p>
                  <StatusBadge>{item.outputType}</StatusBadge>
                </div>
                <p className="mt-2 line-clamp-3 text-sm leading-6 text-[var(--muted)]">{item.contentMd}</p>
              </article>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="护照与备份" description="对外投影版本和本地恢复点。">
          <div className="space-y-4">
            <div className="rounded-3xl border border-[var(--line)] bg-white/70 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Latest Passport</p>
              {stats.latestPassport ? (
                <>
                  <p className="mt-3 text-lg font-semibold">{stats.latestPassport.title}</p>
                  <p className="mt-2 text-sm text-[var(--muted)]">{formatDistanceToNow(new Date(stats.latestPassport.createdAt), { addSuffix: true })}</p>
                </>
              ) : (
                <p className="mt-3 text-sm text-[var(--muted)]">还没有生成护照快照。</p>
              )}
            </div>
            <div className="rounded-3xl border border-[var(--line)] bg-white/70 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Latest Backup</p>
              {stats.latestBackup ? (
                <>
                  <p className="mt-3 text-sm font-medium">{stats.latestBackup.filePath}</p>
                  <p className="mt-2 text-sm text-[var(--muted)]">{formatDistanceToNow(new Date(stats.latestBackup.createdAt), { addSuffix: true })}</p>
                </>
              ) : (
                <p className="mt-3 text-sm text-[var(--muted)]">还没有备份。</p>
              )}
            </div>
          </div>
        </SectionCard>
      </div>
    </PageShell>
  );
}
