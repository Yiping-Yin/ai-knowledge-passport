export const dynamic = "force-dynamic";

import Link from "next/link";

import { AgentPackForm } from "@/components/agent-pack-form";
import { AvatarLiveSessionForm } from "@/components/avatar-live-session-form";
import { AvatarProfileForm } from "@/components/avatar-profile-form";
import { PageShell } from "@/components/page-shell";
import { SectionCard, StatTile, StatusBadge } from "@/components/ui";
import { getAppContext } from "@/server/context";
import { listAgentPacks } from "@/server/services/agent-packs";
import { listAvatarProfiles } from "@/server/services/avatars";
import { listPassports } from "@/server/services/passports";
import { listVisaBundles } from "@/server/services/visas";

export default async function AvatarsPage() {
  const context = getAppContext();
  const [packs, avatars, passports, visas, simulationSessions, liveSessions] = await Promise.all([
    listAgentPacks(context, 80),
    listAvatarProfiles(context, 80),
    listPassports(context),
    listVisaBundles(context, 80),
    context.db.query.avatarSimulationSessions.findMany(),
    context.db.query.avatarLiveSessions.findMany()
  ]);

  const activeProfiles = avatars.filter((avatar) => avatar.status === "active").length;
  const recentEscalations = liveSessions.length
    ? liveSessions.filter((session) => session.status === "active").length
    : simulationSessions.filter((session) => session.resultStatus === "escalated").length;
  const activeLiveSessions = liveSessions.filter((session) => session.status === "active").length;

  return (
    <PageShell currentPath="/avatars" title="Avatars" subtitle="Bind governed agent packs to avatars so an AI can speak from passport-derived context inside explicit boundaries">
      <section className="grid gap-4 md:grid-cols-6">
        <StatTile label="Agent Packs" value={packs.length} />
        <StatTile label="Avatar Profiles" value={avatars.length} />
        <StatTile label="Active Profiles" value={activeProfiles} />
        <StatTile label="Live Sessions" value={liveSessions.length} />
        <StatTile label="Active Sessions" value={activeLiveSessions} />
        <StatTile label="Escalations" value={recentEscalations} hint="Active live sessions or recent governed escalations" />
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <SectionCard title="Create Agent Pack" description="Snapshot a governed subset of passports, visas, nodes, and postcards as the knowledge boundary for a future avatar. Start from a passport or visa when possible.">
          <AgentPackForm
            passports={passports.map((passport) => ({ id: passport.id, title: passport.title }))}
            visas={visas.map((visa) => ({ id: visa.id, title: visa.title }))}
          />
        </SectionCard>

        <SectionCard title="Create Avatar Profile" description="Bind an agent pack to a governed avatar identity with tone rules, forbidden topics, and escalation behavior.">
          <AvatarProfileForm packs={packs.map((pack) => ({ id: pack.id, title: pack.title }))} />
          {packs.length === 0 ? <p className="mt-4 text-sm text-[var(--muted)]">Create an agent pack first. Avatar profiles require an active pack.</p> : null}
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard title="Agent Pack Registry" description="Frozen knowledge boundaries that future avatars can bind to.">
          <div className="space-y-4">
            {packs.map((pack) => (
              <article key={pack.id} className="rounded-3xl border border-[var(--line)] bg-white/80 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{pack.title}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[var(--muted)]">{pack.id}</p>
                  </div>
                  <StatusBadge>{pack.privacyFloor}</StatusBadge>
                </div>
                <p className="mt-3 text-sm text-[var(--muted)]">
                  Source passport: {pack.sourcePassportId ?? "none"} · Source visa: {pack.sourceVisaId ?? "none"}
                </p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs text-[var(--muted)]">
                  <span className="rounded-full bg-black/5 px-3 py-1">nodes {pack.includeNodeIds.length}</span>
                  <span className="rounded-full bg-black/5 px-3 py-1">cards {pack.includePostcardIds.length}</span>
                  <span className="rounded-full bg-black/5 px-3 py-1">{pack.createdAt}</span>
                </div>
                <div className="mt-4">
                  <Link href={`/exports?agentPackId=${pack.id}`} className="rounded-full border border-[var(--line)] px-4 py-2 text-sm">
                    Export Agent Pack
                  </Link>
                </div>
              </article>
            ))}
            {packs.length === 0 ? <p className="text-sm text-[var(--muted)]">No agent packs exist yet.</p> : null}
          </div>
        </SectionCard>

        <SectionCard title="Avatar Profile Registry" description="Each profile binds to one active pack and governs answer, refusal, and escalation behavior.">
          <div className="space-y-4">
            {avatars.map((avatar) => {
              const activeSession = liveSessions.find((session) => session.avatarProfileId === avatar.id && session.status === "active");

              return (
              <article key={avatar.id} className="rounded-3xl border border-[var(--line)] bg-white/80 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{avatar.title}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[var(--muted)]">{avatar.id}</p>
                  </div>
                  <StatusBadge>{avatar.status}</StatusBadge>
                </div>
                <p className="mt-3 text-sm text-[var(--muted)]">Active pack: {avatar.activePackId}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-[var(--muted)]">
                  <span className="rounded-full bg-black/5 px-3 py-1">tone {avatar.toneRules.length}</span>
                  <span className="rounded-full bg-black/5 px-3 py-1">forbidden {avatar.forbiddenTopics.length}</span>
                </div>
                <div className="mt-4">
                  <div className="flex flex-wrap gap-3">
                    <Link href={`/avatars/${avatar.id}`} className="rounded-full border border-[var(--line)] px-4 py-2 text-sm">
                      Open Console
                    </Link>
                    {activeSession ? (
                      <Link
                        href={`/avatar-sessions/${activeSession.id}`}
                        className="rounded-full border border-[var(--line)] px-4 py-2 text-sm"
                      >
                        Open Active Session
                      </Link>
                    ) : null}
                  </div>
                </div>
              </article>
            );})}
            {avatars.length === 0 ? <p className="text-sm text-[var(--muted)]">No avatar profiles exist yet.</p> : null}
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Create Live Session" description="Open a governed internal multi-turn thread for an avatar profile.">
        <div className="grid gap-6 xl:grid-cols-2">
          {avatars.map((avatar) => (
            <article key={avatar.id} className="rounded-3xl border border-[var(--line)] bg-white/80 p-4">
              <p className="text-sm font-semibold">{avatar.title}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[var(--muted)]">{avatar.id}</p>
              <div className="mt-4">
                <AvatarLiveSessionForm avatarId={avatar.id} />
              </div>
            </article>
          ))}
          {avatars.length === 0 ? <p className="text-sm text-[var(--muted)]">No avatars are available yet.</p> : null}
        </div>
      </SectionCard>
    </PageShell>
  );
}
