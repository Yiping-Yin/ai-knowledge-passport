"use client";

import { useState, useTransition } from "react";

export function BackupRestoreForm() {
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);

        startTransition(async () => {
          const response = await fetch("/api/backups", {
            method: "PATCH",
            headers: {
              "content-type": "application/json"
            },
            body: JSON.stringify({
              backupId: formData.get("backupId"),
              targetDir: formData.get("targetDir") || undefined
            })
          });
          const payload = await response.json();
          setMessage(response.ok ? `Restored to ${payload.targetDir}` : payload.error ?? "Restore failed");
        });
      }}
    >
      <label className="space-y-2 text-sm">
        <span>Backup ID</span>
        <input name="backupId" required className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3" placeholder="backup_xxxxx" />
      </label>
      <label className="space-y-2 text-sm">
        <span>Restore Target Directory</span>
        <input name="targetDir" className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3" placeholder="Optional. Defaults to data/restores/<backupId>" />
      </label>
      <div className="flex items-center gap-4">
        <button disabled={isPending} className="rounded-full border border-[var(--line)] px-5 py-3 text-sm font-medium disabled:opacity-50">
          {isPending ? "Restoring..." : "Restore Backup"}
        </button>
        {message ? <span className="text-sm text-[var(--muted)]">{message}</span> : null}
      </div>
    </form>
  );
}
