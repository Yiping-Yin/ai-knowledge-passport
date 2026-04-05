export const dynamic = "force-dynamic";

import { FocusCardActivateButton } from "@/components/focus-card-activate-button";
import { FocusCardForm } from "@/components/focus-card-form";
import { PageShell } from "@/components/page-shell";
import { SectionCard, StatTile, StatusBadge } from "@/components/ui";
import { getAppContext } from "@/server/context";
import { listFocusCards } from "@/server/services/focus-cards";
import { listCapabilitySignals, listMistakePatterns } from "@/server/services/signals";
import { listWorkspaces } from "@/server/services/workspaces";

export default async function SignalsPage() {
  const context = getAppContext();
  const [workspaces, focusCards, acceptedSignals, pendingSignals, acceptedMistakes, pendingMistakes] = await Promise.all([
    listWorkspaces(context),
    listFocusCards(context),
    listCapabilitySignals(context, { status: "accepted", limit: 20 }),
    listCapabilitySignals(context, { status: "pending_review", limit: 20 }),
    listMistakePatterns(context, { status: "accepted", limit: 20 }),
    listMistakePatterns(context, { status: "pending_review", limit: 20 })
  ]);

  const activeFocus = focusCards.find((card) => card.status === "active") ?? null;

  return (
    <PageShell currentPath="/signals" title="Signals" subtitle="Surface the context an AI should read first: your current goal, capability signals, and recurring blind spots">
      <section className="grid gap-4 md:grid-cols-4">
        <StatTile label="Accepted Signals" value={acceptedSignals.length} />
        <StatTile label="Pending Signals" value={pendingSignals.length} />
        <StatTile label="Tracked Mistakes" value={acceptedMistakes.length} />
        <StatTile label="Active Focus" value={activeFocus?.title ?? "none"} hint={activeFocus?.priority ?? "Create one focus card"} />
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <SectionCard title="Create Focus Card" description="Capture what matters now so mounted AI sessions read your current objective before your full history.">
          <FocusCardForm workspaces={workspaces} defaultWorkspaceId={workspaces[0]?.id} />
        </SectionCard>

        <SectionCard title="Focus Cards" description="Only one focus card is active per workspace.">
          <div className="space-y-4">
            {focusCards.map((card) => (
              <article key={card.id} className="rounded-3xl border border-[var(--line)] bg-white/80 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{card.title}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[var(--muted)]">{card.id}</p>
                  </div>
                  <StatusBadge>{card.status}</StatusBadge>
                </div>
                <p className="mt-3 text-sm leading-6">{card.goal}</p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs text-[var(--muted)]">
                  <span className="rounded-full bg-black/5 px-3 py-1">workspace {card.workspaceId}</span>
                  <span className="rounded-full bg-black/5 px-3 py-1">priority {card.priority}</span>
                  <span className="rounded-full bg-black/5 px-3 py-1">{card.timeframe || "no timeframe"}</span>
                </div>
                <div className="mt-4">
                  <FocusCardActivateButton focusCardId={card.id} disabled={card.status === "active"} />
                </div>
              </article>
            ))}
            {focusCards.length === 0 ? <p className="text-sm text-[var(--muted)]">No focus cards exist yet.</p> : null}
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard title="Capability Signals" description="Evidence-backed signals about what the user appears able to do and where support should adapt.">
          <div className="space-y-4">
            {[...acceptedSignals, ...pendingSignals].map((signal) => (
              <article key={signal.id} className="rounded-3xl border border-[var(--line)] bg-white/80 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{signal.topic}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[var(--muted)]">{signal.id}</p>
                  </div>
                  <StatusBadge>{signal.status}</StatusBadge>
                </div>
                <p className="mt-3 text-sm leading-6">Observed practice: {signal.observedPractice}</p>
                <p className="mt-2 text-sm text-[var(--muted)]">Current gaps: {signal.currentGaps}</p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs text-[var(--muted)]">
                  <span className="rounded-full bg-black/5 px-3 py-1">confidence {signal.confidence.toFixed(2)}</span>
                  <span className="rounded-full bg-black/5 px-3 py-1">nodes {signal.evidenceNodeIds.length}</span>
                  <span className="rounded-full bg-black/5 px-3 py-1">fragments {signal.evidenceFragmentIds.length}</span>
                </div>
              </article>
            ))}
            {acceptedSignals.length + pendingSignals.length === 0 ? <p className="text-sm text-[var(--muted)]">No capability signals exist yet.</p> : null}
          </div>
        </SectionCard>

        <SectionCard title="Mistake Patterns" description="Recurring misunderstandings and blind spots that should shape future AI help.">
          <div className="space-y-4">
            {[...acceptedMistakes, ...pendingMistakes].map((mistake) => (
              <article key={mistake.id} className="rounded-3xl border border-[var(--line)] bg-white/80 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{mistake.topic}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[var(--muted)]">{mistake.id}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge>{mistake.status}</StatusBadge>
                    <StatusBadge>{mistake.privacyLevel}</StatusBadge>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-6">{mistake.description}</p>
                <p className="mt-2 text-sm text-[var(--muted)]">Fix suggestions: {mistake.fixSuggestions}</p>
                <div className="mt-4 flex flex-wrap gap-2 text-xs text-[var(--muted)]">
                  <span className="rounded-full bg-black/5 px-3 py-1">recurrence {mistake.recurrenceCount}</span>
                  <span className="rounded-full bg-black/5 px-3 py-1">nodes {mistake.exampleNodeIds.length}</span>
                  <span className="rounded-full bg-black/5 px-3 py-1">fragments {mistake.exampleFragmentIds.length}</span>
                </div>
              </article>
            ))}
            {acceptedMistakes.length + pendingMistakes.length === 0 ? <p className="text-sm text-[var(--muted)]">No mistake patterns exist yet.</p> : null}
          </div>
        </SectionCard>
      </div>
    </PageShell>
  );
}
