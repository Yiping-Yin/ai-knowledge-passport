export const dynamic = "force-dynamic";

import { PageShell } from "@/components/page-shell";
import { PolicyForm } from "@/components/policy-form";
import { SectionCard, StatusBadge } from "@/components/ui";
import { getAppContext } from "@/server/context";
import { listAgentPacks } from "@/server/services/agent-packs";
import { listAvatarProfiles } from "@/server/services/avatars";
import { listExportPackages } from "@/server/services/exports";
import { listPassports } from "@/server/services/passports";
import { listObjectPolicies, resolveObjectPolicy } from "@/server/services/policies";
import { listVisaBundles } from "@/server/services/visas";

export default async function PoliciesPage() {
  const context = getAppContext();
  const [policies, passports, visas, packs, avatars, exports] = await Promise.all([
    listObjectPolicies(context, 120),
    listPassports(context),
    listVisaBundles(context, 20),
    listAgentPacks(context, 20),
    listAvatarProfiles(context, 20),
    listExportPackages(context, 20)
  ]);

  const previewObjects = [
    ...passports.slice(0, 3).map((entry) => ({ objectType: "passport_snapshot" as const, objectId: entry.id, title: entry.title })),
    ...visas.slice(0, 3).map((entry) => ({ objectType: "visa_bundle" as const, objectId: entry.id, title: entry.title })),
    ...packs.slice(0, 3).map((entry) => ({ objectType: "agent_pack_snapshot" as const, objectId: entry.id, title: entry.title })),
    ...avatars.slice(0, 3).map((entry) => ({ objectType: "avatar_profile" as const, objectId: entry.id, title: entry.title })),
    ...exports.slice(0, 3).map((entry) => ({ objectType: "export_package" as const, objectId: entry.id, title: entry.title }))
  ];

  const resolvedPreviews = await Promise.all(
    previewObjects.map(async (entry) => ({
      ...entry,
      resolved: await resolveObjectPolicy(context, entry.objectType, entry.objectId)
    }))
  );

  return (
    <PageShell currentPath="/policies" title="Policies" subtitle="Unify governance rules across passports, visas, agent packs, avatars, and exports with one object-level policy layer">
      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <SectionCard title="Create or Update Policy" description="Direct policies override defaults and inherited rules for one governed object.">
          <PolicyForm />
        </SectionCard>

        <SectionCard title="Direct Policy Registry" description="These are the explicit policy records stored in the local system.">
          <div className="space-y-4">
            {policies.map((policy) => (
              <article key={policy.id} className="rounded-3xl border border-[var(--line)] bg-white/80 p-4 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge>{policy.objectType}</StatusBadge>
                    {policy.privacyFloorOverride ? <StatusBadge>{policy.privacyFloorOverride}</StatusBadge> : null}
                  </div>
                  <p className="text-xs uppercase tracking-[0.16em] text-[var(--muted)]">{policy.id}</p>
                </div>
                <p className="mt-3 font-medium">{policy.objectId}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-[var(--muted)]">
                  <span className="rounded-full bg-black/5 px-3 py-1">secret {String(policy.allowSecretLinks)}</span>
                  <span className="rounded-full bg-black/5 px-3 py-1">machine {String(policy.allowMachineAccess)}</span>
                  <span className="rounded-full bg-black/5 px-3 py-1">export {String(policy.allowExports)}</span>
                  <span className="rounded-full bg-black/5 px-3 py-1">bind {String(policy.allowAvatarBinding)}</span>
                  <span className="rounded-full bg-black/5 px-3 py-1">simulate {String(policy.allowAvatarSimulation)}</span>
                </div>
                {policy.notes ? <p className="mt-3 text-[var(--muted)]">{policy.notes}</p> : null}
              </article>
            ))}
            {policies.length === 0 ? <p className="text-sm text-[var(--muted)]">No direct object policies exist yet.</p> : null}
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Resolved Policy Preview" description="A sample of governed objects after inheritance and direct overrides are applied.">
        <div className="space-y-4">
          {resolvedPreviews.map((entry) => (
            <article key={`${entry.objectType}:${entry.objectId}`} className="rounded-3xl border border-[var(--line)] bg-white/80 p-4 text-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{entry.title}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[var(--muted)]">
                    {entry.objectType} · {entry.objectId}
                  </p>
                </div>
                {entry.resolved.privacyFloor ? <StatusBadge>{entry.resolved.privacyFloor}</StatusBadge> : null}
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-[var(--muted)]">
                <span className="rounded-full bg-black/5 px-3 py-1">secret {String(entry.resolved.allowSecretLinks)}</span>
                <span className="rounded-full bg-black/5 px-3 py-1">machine {String(entry.resolved.allowMachineAccess)}</span>
                <span className="rounded-full bg-black/5 px-3 py-1">export {String(entry.resolved.allowExports)}</span>
                <span className="rounded-full bg-black/5 px-3 py-1">bind {String(entry.resolved.allowAvatarBinding)}</span>
                <span className="rounded-full bg-black/5 px-3 py-1">simulate {String(entry.resolved.allowAvatarSimulation)}</span>
              </div>
              <p className="mt-3 text-[var(--muted)]">
                Chain: {entry.resolved.chain.map((segment) => `${segment.objectType}:${segment.objectId}`).join(" -> ")}
              </p>
            </article>
          ))}
          {resolvedPreviews.length === 0 ? <p className="text-sm text-[var(--muted)]">No governed objects are available for preview yet.</p> : null}
        </div>
      </SectionCard>
    </PageShell>
  );
}
