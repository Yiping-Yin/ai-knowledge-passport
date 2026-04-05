export const dynamic = "force-dynamic";

import Link from "next/link";

import { AvatarLiveSessionForm } from "@/components/avatar-live-session-form";
import { AvatarProfileEditor } from "@/components/avatar-profile-editor";
import { AvatarSimulationForm } from "@/components/avatar-simulation-form";
import { AvatarStatusToggle } from "@/components/avatar-status-toggle";
import { PageShell } from "@/components/page-shell";
import { SectionCard, StatTile, StatusBadge } from "@/components/ui";
import { getAppContext } from "@/server/context";
import { getAgentPackSnapshot, listAgentPacks } from "@/server/services/agent-packs";
import { listAvatarLiveSessions } from "@/server/services/avatar-live-sessions";
import { getAvatarProfile, listAvatarSimulationSessions } from "@/server/services/avatars";

export default async function AvatarDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const context = getAppContext();
  const [avatar, packs, sessions, liveSessions] = await Promise.all([
    getAvatarProfile(context, params.id),
    listAgentPacks(context, 80),
    listAvatarSimulationSessions(context, params.id, 40),
    listAvatarLiveSessions(context, params.id, 40)
  ]);

  if (!avatar) {
    return (
      <PageShell currentPath="/avatars" title="Avatar Console" subtitle="This avatar profile does not exist">
        <SectionCard title="Missing Avatar">
          <p className="text-sm text-[var(--muted)]">The requested avatar profile could not be found.</p>
          <div className="mt-4">
            <Link href="/avatars" className="rounded-full border border-[var(--line)] px-4 py-2 text-sm">
              Back to Avatars
            </Link>
          </div>
        </SectionCard>
      </PageShell>
    );
  }

  const activePack = await getAgentPackSnapshot(context, avatar.activePackId);
  const answeredCount = sessions.filter((session) => session.resultStatus === "answered").length;
  const refusedCount = sessions.filter((session) => session.resultStatus === "refused").length;
  const escalatedCount = sessions.filter((session) => session.resultStatus === "escalated").length;

  return (
    <PageShell currentPath="/avatars" title="Avatar Console" subtitle="Inspect governed profile rules, active pack boundaries, and simulation outcomes">
      <section className="grid gap-4 md:grid-cols-4">
        <StatTile label="Sessions" value={sessions.length} />
        <StatTile label="Answered" value={answeredCount} />
        <StatTile label="Refused" value={refusedCount} />
        <StatTile label="Escalated" value={escalatedCount} />
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <SectionCard title="Profile Summary" description="The avatar profile governs the pack boundary, tone, forbidden topics, and escalation behavior.">
          <div className="space-y-4 text-sm">
            <div className="flex flex-wrap gap-2">
              <StatusBadge>{avatar.status}</StatusBadge>
              <StatusBadge>{avatar.activePackId}</StatusBadge>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Title</p>
              <p className="mt-1 font-medium">{avatar.title}</p>
            </div>
            {avatar.intro ? (
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Intro</p>
                <p className="mt-1 leading-6">{avatar.intro}</p>
              </div>
            ) : null}
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Tone Rules</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {avatar.toneRules.map((rule) => (
                  <StatusBadge key={rule}>{rule}</StatusBadge>
                ))}
                {avatar.toneRules.length === 0 ? <span className="text-[var(--muted)]">No tone rules</span> : null}
              </div>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Forbidden Topics</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {avatar.forbiddenTopics.map((topic) => (
                  <StatusBadge key={topic}>{topic}</StatusBadge>
                ))}
                {avatar.forbiddenTopics.length === 0 ? <span className="text-[var(--muted)]">None</span> : null}
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Forbidden Topic Rule</p>
                <p className="mt-1">{avatar.escalationRules.escalateOnForbiddenTopic ? "Escalate" : "Refuse"}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Insufficient Evidence Rule</p>
                <p className="mt-1">{avatar.escalationRules.escalateOnInsufficientEvidence ? "Escalate" : "Refuse"}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">Out-of-Scope Rule</p>
                <p className="mt-1">{avatar.escalationRules.escalateOnOutOfScope ? "Escalate" : "Refuse"}</p>
              </div>
            </div>
            <AvatarStatusToggle avatarId={avatar.id} status={avatar.status} />
            <div>
              <Link href={`/exports?agentPackId=${avatar.activePackId}&avatarProfileId=${avatar.id}`} className="rounded-full border border-[var(--line)] px-4 py-2 text-sm">
                Export Cross-AI Bundle
              </Link>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Active Agent Pack" description="This pack defines the evidence boundary available to the avatar simulator.">
          {activePack ? (
            <div className="space-y-4 text-sm">
              <div className="flex flex-wrap gap-2">
                <StatusBadge>{activePack.privacyFloor}</StatusBadge>
                <StatusBadge>{activePack.id}</StatusBadge>
              </div>
              <p className="font-medium">{activePack.title}</p>
              <p className="text-[var(--muted)]">Source passport: {activePack.sourcePassportId ?? "none"} · Source visa: {activePack.sourceVisaId ?? "none"}</p>
              <div className="flex flex-wrap gap-2 text-xs text-[var(--muted)]">
                <span className="rounded-full bg-black/5 px-3 py-1">nodes {activePack.includeNodeIds.length}</span>
                <span className="rounded-full bg-black/5 px-3 py-1">cards {activePack.includePostcardIds.length}</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-[var(--muted)]">The active pack could not be loaded.</p>
          )}
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <SectionCard title="Edit Profile" description="Update the active pack, intro, tone rules, forbidden topics, and escalation behavior.">
          <AvatarProfileEditor avatar={avatar} packs={packs.map((pack) => ({ id: pack.id, title: pack.title }))} />
        </SectionCard>

        <SectionCard title="Run Simulation" description="Simulate a single-turn governed exchange against the current avatar rules and pack scope.">
          <AvatarSimulationForm avatarId={avatar.id} />
        </SectionCard>
      </div>

      <SectionCard title="Live Sessions" description="Open and inspect internal multi-turn governed threads. Live sessions stay inside the current avatar boundary.">
        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-4">
            <AvatarLiveSessionForm avatarId={avatar.id} />
          </div>
          <div className="space-y-4">
            {liveSessions.map((session) => (
              <article key={session.id} className="rounded-3xl border border-[var(--line)] bg-white/80 p-4 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{session.title}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[var(--muted)]">{session.id}</p>
                  </div>
                  <StatusBadge>{session.status}</StatusBadge>
                </div>
                <p className="mt-3 text-[var(--muted)]">Created {session.createdAt}</p>
                <div className="mt-4">
                  <Link href={`/avatar-sessions/${session.id}`} className="rounded-full border border-[var(--line)] px-4 py-2 text-sm">
                    Open Session
                  </Link>
                </div>
              </article>
            ))}
            {liveSessions.length === 0 ? <p className="text-sm text-[var(--muted)]">No live sessions exist for this avatar yet.</p> : null}
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Recent Simulation Sessions" description="Every simulation is logged independently with answer, refusal, or escalation status and scoped citations.">
        <div className="space-y-4">
          {sessions.map((session) => (
            <article key={session.id} className="rounded-3xl border border-[var(--line)] bg-white/80 p-4 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  <StatusBadge>{session.resultStatus}</StatusBadge>
                  <StatusBadge>{session.id}</StatusBadge>
                </div>
                <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">{session.createdAt}</p>
              </div>
              <p className="mt-3 font-medium">{session.question}</p>
              {session.reason ? <p className="mt-2 text-[var(--muted)]">Reason: {session.reason}</p> : null}
              <p className="mt-3 whitespace-pre-wrap leading-6">{session.answerMd}</p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs text-[var(--muted)]">
                {session.citations.map((citation) => (
                  <span key={`${session.id}-${citation.refId}`} className="rounded-full bg-black/5 px-3 py-1">
                    {citation.refId} · {citation.score.toFixed(2)}
                  </span>
                ))}
                {session.citations.length === 0 ? <span className="text-[var(--muted)]">No citations</span> : null}
              </div>
            </article>
          ))}
          {sessions.length === 0 ? <p className="text-sm text-[var(--muted)]">No simulation sessions yet.</p> : null}
        </div>
      </SectionCard>
    </PageShell>
  );
}
