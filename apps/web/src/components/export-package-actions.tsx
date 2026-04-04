"use client";

export function ExportPackageActions(props: {
  exportId: string;
}) {
  return (
    <div className="flex flex-wrap gap-3 text-sm">
      <a className="rounded-full border border-[var(--line)] px-4 py-2" href={`/api/exports/${props.exportId}/download`}>
        Download Bundle
      </a>
      <a className="rounded-full border border-[var(--line)] px-4 py-2" href={`/api/exports/${props.exportId}`}>
        View Manifest JSON
      </a>
    </div>
  );
}
