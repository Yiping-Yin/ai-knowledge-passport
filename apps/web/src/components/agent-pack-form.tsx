"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function AgentPackForm(props: {
  passports: Array<{ id: string; title: string }>;
  visas: Array<{ id: string; title: string }>;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const formData = new FormData(form);

        startTransition(async () => {
          const response = await fetch("/api/agent-packs", {
            method: "POST",
            headers: {
              "content-type": "application/json"
            },
            body: JSON.stringify({
              title: formData.get("title"),
              passportId: formData.get("passportId") || undefined,
              visaId: formData.get("visaId") || undefined,
              includeNodeIds: String(formData.get("includeNodeIds") ?? "")
                .split(",")
                .map((entry) => entry.trim())
                .filter(Boolean),
              includePostcardIds: String(formData.get("includePostcardIds") ?? "")
                .split(",")
                .map((entry) => entry.trim())
                .filter(Boolean),
              privacyFloor: formData.get("privacyFloor")
            })
          });

          const payload = await response.json();
          if (response.ok) {
            setMessage(`Agent pack created: ${payload.packId}`);
            form.reset();
            router.refresh();
            return;
          }
          setMessage(payload.error ?? "Agent pack creation failed");
        });
      }}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm">
          <span>Pack Title</span>
          <input name="title" defaultValue="Governed Agent Pack" required className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3" />
        </label>
        <label className="space-y-2 text-sm">
          <span>Privacy Floor</span>
          <select name="privacyFloor" defaultValue="L1_LOCAL_AI" className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3">
            <option value="L0_SELF">L0_SELF</option>
            <option value="L1_LOCAL_AI">L1_LOCAL_AI</option>
            <option value="L2_INVITED">L2_INVITED</option>
            <option value="L3_PUBLIC">L3_PUBLIC</option>
            <option value="L4_AGENT_ONLY">L4_AGENT_ONLY</option>
          </select>
        </label>
        <label className="space-y-2 text-sm">
          <span>Source Passport</span>
          <select name="passportId" defaultValue="" className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3">
            <option value="">None</option>
            {props.passports.map((passport) => (
              <option key={passport.id} value={passport.id}>
                {passport.title} · {passport.id}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-2 text-sm">
          <span>Source Visa</span>
          <select name="visaId" defaultValue="" className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3">
            <option value="">None</option>
            {props.visas.map((visa) => (
              <option key={visa.id} value={visa.id}>
                {visa.title} · {visa.id}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="space-y-2 text-sm">
        <span>Included Node IDs</span>
        <input name="includeNodeIds" className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3" placeholder="Leave empty to inherit from the selected passport or visa" />
      </label>
      <label className="space-y-2 text-sm">
        <span>Included Postcard IDs</span>
        <input name="includePostcardIds" className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3" placeholder="Leave empty to inherit from the selected passport or visa" />
      </label>

      <div className="flex items-center gap-4">
        <button disabled={isPending} className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-medium text-white disabled:opacity-50">
          {isPending ? "Creating..." : "Create Agent Pack"}
        </button>
        {message ? <span className="text-sm text-[var(--muted)]">{message}</span> : null}
      </div>
    </form>
  );
}
