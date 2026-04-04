export const dynamic = "force-dynamic";

import ReactMarkdown from "react-markdown";

import { PageShell } from "@/components/page-shell";
import { PassportControls } from "@/components/passport-controls";
import { SectionCard, StatusBadge } from "@/components/ui";
import { getAppContext } from "@/server/context";
import { listBackups } from "@/server/services/backups";
import { listPassports } from "@/server/services/passports";

export default async function PassportPage() {
  const context = getAppContext();
  const passports = await listPassports(context);
  const backups = await listBackups(context);

  return (
    <PageShell currentPath="/passport" title="Passport & Backup" subtitle="生成简版知识护照，并把当前状态安全归档">
      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <SectionCard title="护照与备份控制" description="护照生成入队执行，备份会打包数据库、对象文件和 manifest。">
          <PassportControls />
        </SectionCard>
        <div className="space-y-6">
          <SectionCard title="护照快照" description="人类版 Markdown 与机器版 manifest 同步存档。">
            <div className="space-y-4">
              {passports.map((passport) => (
                <article key={passport.id} className="rounded-3xl border border-[var(--line)] bg-white/80 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">{passport.title}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[var(--muted)]">{passport.id}</p>
                    </div>
                    <StatusBadge tone="success">{passport.privacyFloor}</StatusBadge>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs text-[var(--muted)]">
                    <span className="rounded-full bg-black/5 px-3 py-1">nodes {passport.includeNodeIds.length}</span>
                    <span className="rounded-full bg-black/5 px-3 py-1">cards {passport.includePostcardIds.length}</span>
                    <span className="rounded-full bg-black/5 px-3 py-1">
                      themes {Array.isArray(passport.machineManifest.themeMap) ? passport.machineManifest.themeMap.length : 0}
                    </span>
                  </div>
                  <div className="prose prose-sm mt-4 max-w-none">
                    <ReactMarkdown>{passport.humanMarkdown}</ReactMarkdown>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-3 text-sm">
                    <a className="rounded-full border border-[var(--line)] px-4 py-2" href={`/api/passports/${passport.id}/human`}>
                      下载 Human Markdown
                    </a>
                    <a className="rounded-full border border-[var(--line)] px-4 py-2" href={`/api/passports/${passport.id}/machine`}>
                      下载 Machine Manifest
                    </a>
                  </div>
                </article>
              ))}
              {passports.length === 0 ? <p className="text-sm text-[var(--muted)]">还没有护照快照。</p> : null}
            </div>
          </SectionCard>

          <SectionCard title="备份记录" description="Zip 包可用于完整恢复 SQLite 和对象目录。">
            <div className="space-y-3">
              {backups.map((backup) => (
                <article key={backup.id} className="rounded-3xl border border-[var(--line)] bg-white/80 p-4 text-sm">
                  <p className="font-medium">{backup.filePath}</p>
                  <p className="mt-2 text-[var(--muted)]">{backup.note}</p>
                </article>
              ))}
              {backups.length === 0 ? <p className="text-sm text-[var(--muted)]">还没有备份记录。</p> : null}
            </div>
          </SectionCard>
        </div>
      </div>
    </PageShell>
  );
}
