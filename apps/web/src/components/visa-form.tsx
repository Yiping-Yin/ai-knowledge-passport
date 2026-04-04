"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function VisaForm(props: {
  passports: Array<{ id: string; title: string }>;
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
        const formData = new FormData(event.currentTarget);
        const expiresAtRaw = String(formData.get("expiresAt") ?? "").trim();

        startTransition(async () => {
          const response = await fetch("/api/visas", {
            method: "POST",
            headers: {
              "content-type": "application/json"
            },
            body: JSON.stringify({
              title: formData.get("title"),
              passportId: formData.get("passportId") || undefined,
              includeNodeIds: String(formData.get("includeNodeIds") ?? "")
                .split(",")
                .map((entry) => entry.trim())
                .filter(Boolean),
              includePostcardIds: String(formData.get("includePostcardIds") ?? "")
                .split(",")
                .map((entry) => entry.trim())
                .filter(Boolean),
              privacyFloor: formData.get("privacyFloor"),
              audienceLabel: formData.get("audienceLabel"),
              description: formData.get("description") || "",
              purpose: formData.get("purpose") || "",
              expiresAt: expiresAtRaw ? new Date(expiresAtRaw).toISOString() : undefined,
              maxAccessCount: formData.get("maxAccessCount") ? Number(formData.get("maxAccessCount")) : undefined,
              maxMachineDownloads: formData.get("maxMachineDownloads") ? Number(formData.get("maxMachineDownloads")) : undefined,
              allowMachineDownload: formData.get("allowMachineDownload") === "on",
              redaction: {
                hideOriginUrls: formData.get("hideOriginUrls") === "on",
                hideSourcePaths: formData.get("hideSourcePaths") === "on",
                hideRawSourceIds: formData.get("hideRawSourceIds") === "on"
              }
            })
          });
          const payload = await response.json();
          if (response.ok) {
            setMessage(`Visa created: ${payload.visaId}`);
            form.reset();
            router.refresh();
            return;
          }
          setMessage(payload.error ?? "Visa creation failed");
        });
      }}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm">
          <span>Visa Title</span>
          <input name="title" defaultValue="Scenario Visa" required className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3" />
        </label>
        <label className="space-y-2 text-sm">
          <span>Audience Label</span>
          <input name="audienceLabel" defaultValue="General audience" required className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3" />
        </label>
        <label className="space-y-2 text-sm md:col-span-2">
          <span>Source Passport</span>
          <select name="passportId" defaultValue="" className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3">
            <option value="">No passport snapshot</option>
            {props.passports.map((passport) => (
              <option key={passport.id} value={passport.id}>
                {passport.title} · {passport.id}
              </option>
            ))}
          </select>
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
          <span>Expires At</span>
          <input name="expiresAt" type="datetime-local" className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3" />
        </label>
        <label className="space-y-2 text-sm md:col-span-2">
          <span>Description</span>
          <textarea name="description" rows={3} className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3" />
        </label>
        <label className="space-y-2 text-sm md:col-span-2">
          <span>Purpose</span>
          <textarea name="purpose" rows={2} className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3" />
        </label>
        <label className="space-y-2 text-sm">
          <span>Max Human Views</span>
          <input name="maxAccessCount" type="number" min={1} className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3" />
        </label>
        <label className="space-y-2 text-sm">
          <span>Max Machine Downloads</span>
          <input name="maxMachineDownloads" type="number" min={1} className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3" />
        </label>
      </div>

      <label className="space-y-2 text-sm">
        <span>Included Node IDs</span>
        <input
          name="includeNodeIds"
          className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3"
          placeholder="Leave empty to inherit the selected passport snapshot"
        />
      </label>
      <label className="space-y-2 text-sm">
        <span>Included Postcard IDs</span>
        <input
          name="includePostcardIds"
          className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3"
          placeholder="Leave empty to inherit the selected passport snapshot"
        />
      </label>

      <div className="grid gap-3 rounded-3xl border border-[var(--line)] bg-white/80 p-4 md:grid-cols-2">
        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" name="allowMachineDownload" defaultChecked className="h-4 w-4 rounded border-[var(--line)]" />
          <span>Allow machine manifest download</span>
        </label>
        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" name="hideOriginUrls" className="h-4 w-4 rounded border-[var(--line)]" />
          <span>Hide origin URLs</span>
        </label>
        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" name="hideSourcePaths" className="h-4 w-4 rounded border-[var(--line)]" />
          <span>Hide source file paths</span>
        </label>
        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" name="hideRawSourceIds" className="h-4 w-4 rounded border-[var(--line)]" />
          <span>Hide raw source IDs</span>
        </label>
      </div>

      <div className="flex items-center gap-4">
        <button disabled={isPending} className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-medium text-white disabled:opacity-50">
          {isPending ? "Creating..." : "Create Visa"}
        </button>
        {message ? <span className="text-sm text-[var(--muted)]">{message}</span> : null}
      </div>
    </form>
  );
}
