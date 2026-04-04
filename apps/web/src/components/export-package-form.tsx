"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function ExportPackageForm(props: {
  packs: Array<{ id: string; title: string }>;
  avatars: Array<{ id: string; title: string; activePackId: string }>;
  defaultPackId?: string;
  defaultAvatarId?: string;
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
          const response = await fetch("/api/exports/agent-packs", {
            method: "POST",
            headers: {
              "content-type": "application/json"
            },
            body: JSON.stringify({
              agentPackId: formData.get("agentPackId"),
              avatarProfileId: formData.get("avatarProfileId") || undefined,
              includeAvatarProfile: formData.get("includeAvatarProfile") === "on"
            })
          });

          const payload = await response.json();
          if (response.ok) {
            setMessage(`Export created: ${payload.exportId}`);
            form.reset();
            router.refresh();
            return;
          }
          setMessage(payload.error ?? "Export creation failed");
        });
      }}
    >
      <label className="space-y-2 text-sm">
        <span>Agent Pack</span>
        <select
          name="agentPackId"
          required
          defaultValue={props.defaultPackId ?? props.packs[0]?.id ?? ""}
          className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3"
        >
          {props.packs.map((pack) => (
            <option key={pack.id} value={pack.id}>
              {pack.title} · {pack.id}
            </option>
          ))}
        </select>
      </label>

      <div className="rounded-3xl border border-[var(--line)] bg-white/80 p-4">
        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            name="includeAvatarProfile"
            defaultChecked={Boolean(props.defaultAvatarId)}
            className="h-4 w-4 rounded border-[var(--line)]"
          />
          <span>Attach avatar profile context</span>
        </label>
        <label className="mt-4 block space-y-2 text-sm">
          <span>Avatar Profile</span>
          <select
            name="avatarProfileId"
            defaultValue={props.defaultAvatarId ?? ""}
            className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3"
          >
            <option value="">None</option>
            {props.avatars.map((avatar) => (
              <option key={avatar.id} value={avatar.id}>
                {avatar.title} · {avatar.id}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex items-center gap-4">
        <button disabled={isPending || props.packs.length === 0} className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-medium text-white disabled:opacity-50">
          {isPending ? "Exporting..." : "Create Export Package"}
        </button>
        {message ? <span className="text-sm text-[var(--muted)]">{message}</span> : null}
      </div>
    </form>
  );
}
