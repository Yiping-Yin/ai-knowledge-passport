"use client";

import { useState, useTransition } from "react";

export function PassportControls() {
  const [passportMessage, setPassportMessage] = useState("");
  const [backupMessage, setBackupMessage] = useState("");
  const [isPassportPending, startPassportTransition] = useTransition();
  const [isBackupPending, startBackupTransition] = useTransition();

  return (
    <div className="space-y-6">
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          startPassportTransition(async () => {
            const response = await fetch("/api/passports/generate", {
              method: "POST",
              headers: {
                "content-type": "application/json"
              },
              body: JSON.stringify({
                title: formData.get("title"),
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
            setPassportMessage(response.ok ? `已入队：${payload.jobId}` : payload.error ?? "生成失败");
          });
        }}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm">
            <span>护照标题</span>
            <input name="title" defaultValue="知识护照" className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3" />
          </label>
          <label className="space-y-2 text-sm">
            <span>最低权限层级</span>
            <select name="privacyFloor" defaultValue="L1_LOCAL_AI" className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3">
              <option value="L1_LOCAL_AI">L1_LOCAL_AI</option>
              <option value="L0_SELF">L0_SELF</option>
              <option value="L2_INVITED">L2_INVITED</option>
              <option value="L3_PUBLIC">L3_PUBLIC</option>
              <option value="L4_AGENT_ONLY">L4_AGENT_ONLY</option>
            </select>
          </label>
        </div>
        <label className="space-y-2 text-sm">
          <span>包含 Node IDs</span>
          <input name="includeNodeIds" className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3" placeholder="留空则自动包含全部 accepted node" />
        </label>
        <label className="space-y-2 text-sm">
          <span>包含 Postcard IDs</span>
          <input name="includePostcardIds" className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3" placeholder="留空则自动包含全部 postcard" />
        </label>
        <div className="flex items-center gap-4">
          <button disabled={isPassportPending} className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-medium text-white disabled:opacity-50">
            {isPassportPending ? "生成中..." : "生成护照"}
          </button>
          {passportMessage ? <span className="text-sm text-[var(--muted)]">{passportMessage}</span> : null}
        </div>
      </form>

      <div className="rounded-3xl border border-[var(--line)] bg-white/80 p-4">
        <p className="text-sm leading-6 text-[var(--muted)]">备份包会同时打入 SQLite 数据库、本地对象存储和 manifest。</p>
        <button
          disabled={isBackupPending}
          className="mt-4 rounded-full border border-[var(--line)] px-5 py-3 text-sm font-medium disabled:opacity-50"
          onClick={() => {
            startBackupTransition(async () => {
              const response = await fetch("/api/backups", {
                method: "POST",
                headers: {
                  "content-type": "application/json"
                },
                body: JSON.stringify({
                  note: "manual_backup"
                })
              });
              const payload = await response.json();
              setBackupMessage(response.ok ? `已入队：${payload.jobId}` : payload.error ?? "备份失败");
            });
          }}
        >
          {isBackupPending ? "备份中..." : "执行本地备份"}
        </button>
        {backupMessage ? <p className="mt-3 text-sm text-[var(--muted)]">{backupMessage}</p> : null}
      </div>
    </div>
  );
}
