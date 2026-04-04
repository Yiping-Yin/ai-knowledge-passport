"use client";

import { useState, useTransition } from "react";

export function OutputForm() {
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
          const response = await fetch("/api/outputs", {
            method: "POST",
            headers: {
              "content-type": "application/json"
            },
            body: JSON.stringify({
              title: formData.get("title"),
              outputType: formData.get("outputType"),
              content: formData.get("content"),
              promptContext: formData.get("promptContext"),
              relatedNodeIds: String(formData.get("relatedNodeIds") ?? "")
                .split(",")
                .map((entry) => entry.trim())
                .filter(Boolean),
              relatedSourceIds: String(formData.get("relatedSourceIds") ?? "")
                .split(",")
                .map((entry) => entry.trim())
                .filter(Boolean),
              flowbackMode: formData.get("flowbackMode"),
              targetNodeId: formData.get("targetNodeId") || undefined
            })
          });
          const payload = await response.json();
          setMessage(response.ok ? `已保存：${payload.outputId}` : payload.error ?? "保存失败");
          if (response.ok) {
            form.reset();
          }
        });
      }}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm">
          <span>标题</span>
          <input name="title" required className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3" />
        </label>
        <label className="space-y-2 text-sm">
          <span>输出类型</span>
          <select name="outputType" defaultValue="markdown_memo" className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3">
            <option value="markdown_memo">markdown_memo</option>
            <option value="brief">brief</option>
            <option value="outline">outline</option>
            <option value="action_list">action_list</option>
          </select>
        </label>
      </div>
      <label className="space-y-2 text-sm">
        <span>Prompt Context</span>
        <input name="promptContext" className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3" />
      </label>
      <label className="space-y-2 text-sm">
        <span>内容</span>
        <textarea name="content" rows={10} required className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3" />
      </label>
      <div className="grid gap-4 md:grid-cols-3">
        <label className="space-y-2 text-sm">
          <span>关联 Node IDs</span>
          <input name="relatedNodeIds" className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3" placeholder="node_a,node_b" />
        </label>
        <label className="space-y-2 text-sm">
          <span>关联 Source IDs</span>
          <input name="relatedSourceIds" className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3" placeholder="src_a,src_b" />
        </label>
        <label className="space-y-2 text-sm">
          <span>回流模式</span>
          <select name="flowbackMode" defaultValue="none" className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3">
            <option value="none">none</option>
            <option value="new_node">new_node</option>
            <option value="append">append</option>
          </select>
        </label>
      </div>
      <label className="space-y-2 text-sm">
        <span>Append 目标 Node ID</span>
        <input name="targetNodeId" className="w-full rounded-2xl border border-[var(--line)] bg-white px-4 py-3" />
      </label>
      <div className="flex items-center gap-4">
        <button disabled={isPending} className="rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-medium text-white disabled:opacity-50">
          {isPending ? "保存中..." : "保存输出"}
        </button>
        {message ? <span className="text-sm text-[var(--muted)]">{message}</span> : null}
      </div>
    </form>
  );
}
