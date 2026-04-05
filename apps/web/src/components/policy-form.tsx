"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function PolicyForm() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);

        startTransition(async () => {
          const response = await fetch("/api/policies", {
            method: "POST",
            headers: {
              "content-type": "application/json"
            },
            body: JSON.stringify({
              objectType: formData.get("objectType"),
              objectId: formData.get("objectId"),
              privacyFloorOverride: formData.get("privacyFloorOverride") || undefined,
              allowSecretLinks: formData.get("allowSecretLinks") === "on" ? true : undefined,
              allowMachineAccess: formData.get("allowMachineAccess") === "on" ? true : undefined,
              allowExports: formData.get("allowExports") === "on" ? true : undefined,
              allowAvatarBinding: formData.get("allowAvatarBinding") === "on" ? true : undefined,
              allowAvatarSimulation: formData.get("allowAvatarSimulation") === "on" ? true : undefined,
              notes: formData.get("notes") || ""
            })
          });

          const payload = await response.json();
          setMessage(response.ok ? `Policy saved: ${payload.policyId}` : payload.error ?? "Policy save failed");
          if (response.ok) {
            router.refresh();
          }
        });
      }}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm">
          <span>Object Type</span>
          <select name="objectType" defaultValue="visa_bundle" className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3">
            <option value="passport_snapshot">passport_snapshot</option>
            <option value="visa_bundle">visa_bundle</option>
            <option value="agent_pack_snapshot">agent_pack_snapshot</option>
            <option value="avatar_profile">avatar_profile</option>
            <option value="export_package">export_package</option>
          </select>
        </label>
        <label className="space-y-2 text-sm">
          <span>Object ID</span>
          <input name="objectId" required className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3" />
        </label>
        <label className="space-y-2 text-sm">
          <span>Privacy Floor Override</span>
          <select name="privacyFloorOverride" defaultValue="" className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3">
            <option value="">No override</option>
            <option value="L0_SELF">L0_SELF</option>
            <option value="L1_LOCAL_AI">L1_LOCAL_AI</option>
            <option value="L2_INVITED">L2_INVITED</option>
            <option value="L3_PUBLIC">L3_PUBLIC</option>
            <option value="L4_AGENT_ONLY">L4_AGENT_ONLY</option>
          </select>
        </label>
      </div>

      <div className="grid gap-3 rounded-3xl border border-[var(--line)] bg-white/80 p-4 md:grid-cols-2">
        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" name="allowSecretLinks" className="h-4 w-4 rounded border-[var(--line)]" />
          <span>Allow secret links</span>
        </label>
        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" name="allowMachineAccess" className="h-4 w-4 rounded border-[var(--line)]" />
          <span>Allow machine access</span>
        </label>
        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" name="allowExports" className="h-4 w-4 rounded border-[var(--line)]" />
          <span>Allow exports</span>
        </label>
        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" name="allowAvatarBinding" className="h-4 w-4 rounded border-[var(--line)]" />
          <span>Allow avatar binding</span>
        </label>
        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" name="allowAvatarSimulation" className="h-4 w-4 rounded border-[var(--line)]" />
          <span>Allow avatar simulation</span>
        </label>
      </div>

      <label className="space-y-2 text-sm">
        <span>Notes</span>
        <textarea name="notes" rows={3} className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3" />
      </label>

      <div className="flex items-center gap-4">
        <button disabled={isPending} className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-medium text-white disabled:opacity-50">
          {isPending ? "Saving..." : "Save Policy"}
        </button>
        {message ? <span className="text-sm text-[var(--muted)]">{message}</span> : null}
      </div>
    </form>
  );
}
