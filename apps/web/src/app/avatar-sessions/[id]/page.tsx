export const dynamic = "force-dynamic";

import Link from "next/link";

import { AvatarLiveMessageForm } from "@/components/avatar-live-message-form";
import { AvatarLiveSessionStatusToggle } from "@/components/avatar-live-session-status-toggle";
import { PageShell } from "@/components/page-shell";
import { SectionCard, StatTile, StatusBadge } from "@/components/ui";
import { getAppContext } from "@/server/context";
import { getAvatarLiveSession } from "@/server/services/avatar-live-sessions";
import { getAvatarProfile } from "@/server/services/avatars";

export default async function AvatarSessionPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const context = getAppContext();
  const session = await getAvatarLiveSession(context, params.id);

  if (!session) {
    return (
      <PageShell currentPath="/avatars" title="Avatar Session" subtitle="This live session does not exist">
        <SectionCard title="Missing Session">
          <p className="text-sm text-[var(--muted)]">The requested avatar live session could not be found.</p>
          <div className="mt-4">
            <Link href="/avatars" className="rounded-full border border-[var(--line)] px-4 py-2 text-sm">
              Back to Avatars
            </Link>
          </div>
        </SectionCard>
      </PageShell>
    );
  }

  const avatar = await getAvatarProfile(context, session.avatarProfileId);
  const assistantMessages = session.messages.filter((message) => message.role === "assistant");
  const escalations = assistantMessages.filter((message) => message.resultStatus === "escalated").length;

  return (
    <PageShell currentPath="/avatars" title="Avatar Session" subtitle="Run a governed internal conversation thread without leaving the avatar boundary">
      <section className="grid gap-4 md:grid-cols-4">
        <StatTile label="Messages" value={session.messages.length} />
        <StatTile label="Assistant Replies" value={assistantMessages.length} />
        <StatTile label="Escalations" value={escalations} />
        <StatTile label="Status" value={session.status} hint={session.updatedAt} />
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <SectionCard title="Session Summary" description="Live governed sessions keep memory inside the current thread only.">
          <div className="space-y-4 text-sm">
            <div className="flex flex-wrap gap-2">
              <StatusBadge>{session.status}</StatusBadge>
              <StatusBadge>{session.id}</StatusBadge>
            </div>
            <p className="font-medium">{session.title}</p>
            <p className="text-[var(--muted)]">Avatar: {avatar?.title ?? session.avatarProfileId}</p>
            <AvatarLiveSessionStatusToggle sessionId={session.id} status={session.status} />
          </div>
        </SectionCard>

        <SectionCard title="Post Message" description="Request-response only. No tools, no public routing, no cross-session memory.">
          <AvatarLiveMessageForm sessionId={session.id} disabled={session.status === "closed"} />
        </SectionCard>
      </div>

      <SectionCard title="Thread" description="User and assistant messages are stored in order with governed answer, refusal, or escalation state.">
        <div className="space-y-4">
          {session.messages.map((message) => (
            <article key={message.id} className="rounded-3xl border border-[var(--line)] bg-white/80 p-4 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  <StatusBadge>{message.role}</StatusBadge>
                  {message.resultStatus ? <StatusBadge>{message.resultStatus}</StatusBadge> : null}
                </div>
                <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">{message.createdAt}</p>
              </div>
              {message.reason ? <p className="mt-3 text-[var(--muted)]">Reason: {message.reason}</p> : null}
              <div className="mt-3 whitespace-pre-wrap leading-6">{message.contentMd}</div>
              {message.citations.length ? (
                <div className="mt-4 flex flex-wrap gap-2 text-xs text-[var(--muted)]">
                  {message.citations.map((citation) => (
                    <span key={`${message.id}-${citation.refId}`} className="rounded-full bg-black/5 px-3 py-1">
                      {citation.refId} · {citation.score.toFixed(2)}
                    </span>
                  ))}
                </div>
              ) : null}
            </article>
          ))}
          {session.messages.length === 0 ? <p className="text-sm text-[var(--muted)]">No messages have been posted yet.</p> : null}
        </div>
      </SectionCard>
    </PageShell>
  );
}
