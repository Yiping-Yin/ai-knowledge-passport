export const dynamic = "force-dynamic";

import ReactMarkdown from "react-markdown";

import { accessVisaBundleByToken } from "@/server/services/visas";
import { getAppContext } from "@/server/context";
import { StatusBadge } from "@/components/ui";

function VisaUnavailable(props: { reason: string }) {
  return (
    <main className="mx-auto min-h-screen max-w-4xl px-5 py-10">
      <div className="rounded-[32px] border border-[var(--line)] bg-[var(--surface)] p-8">
        <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">Visa unavailable</p>
        <h1 className="mt-3 text-3xl font-semibold">This secret link cannot be used.</h1>
        <p className="mt-4 text-base leading-7 text-[var(--muted)]">{props.reason}</p>
      </div>
    </main>
  );
}

export default async function PublicVisaPage(props: { params: Promise<{ token: string }> }) {
  const params = await props.params;
  const access = await accessVisaBundleByToken(getAppContext(), params.token, "human");

  if (access.status === "invalid") {
    return <VisaUnavailable reason="The visa link is invalid or no longer available." />;
  }
  if (access.status === "revoked") {
    return <VisaUnavailable reason="This visa has been revoked by its owner." />;
  }
  if (access.status === "expired") {
    return <VisaUnavailable reason="This visa has expired and is no longer accessible." />;
  }

  if (access.status !== "active") {
    return <VisaUnavailable reason="This secret link cannot be used." />;
  }

  const visa = access.visa;

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-5 py-10">
      <div className="space-y-6">
        <section className="rounded-[32px] border border-[var(--line)] bg-[var(--surface)] p-8">
          <p className="text-xs uppercase tracking-[0.24em] text-[var(--muted)]">Read-only visa</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight">{visa.title}</h1>
          <p className="mt-4 text-base leading-7 text-[var(--muted)]">
            Audience: {visa.audienceLabel} · Source: {visa.passportId ? `passport ${visa.passportId}` : "direct selection"}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <StatusBadge>{visa.status}</StatusBadge>
            <StatusBadge>{visa.privacyFloor}</StatusBadge>
            <StatusBadge>{visa.expiresAt ? `expires ${visa.expiresAt}` : "no expiry"}</StatusBadge>
            <StatusBadge>{visa.allowMachineDownload ? "machine download enabled" : "machine download disabled"}</StatusBadge>
          </div>
          {visa.allowMachineDownload ? (
            <a className="mt-6 inline-flex rounded-full border border-[var(--line)] px-4 py-2 text-sm" href={visa.machinePath ?? "#"}>
              Download machine manifest
            </a>
          ) : null}
        </section>

        <section className="rounded-[32px] border border-[var(--line)] bg-[var(--surface)] p-8">
          <div className="prose prose-sm max-w-none">
            <ReactMarkdown>{visa.humanMarkdown}</ReactMarkdown>
          </div>
        </section>
      </div>
    </main>
  );
}
