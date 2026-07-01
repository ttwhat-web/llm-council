"use client";

/**
 * Draft controls · presentational pieces shared by DraftReplies.
 * Split out to keep DraftReplies.tsx under the file-size limit.
 */

import { Check, Copy } from "lucide-react";
import clsx from "clsx";

export function DraftEditor({
  body,
  subject,
  editing,
  onEdit
}: {
  body: string;
  subject: string;
  editing: boolean;
  onEdit: (v: string) => void;
}) {
  return (
    <>
      <span className="text-[11.5px] text-white/45">Subject · {subject}</span>
      {editing ? (
        <textarea
          value={body}
          onChange={(e) => onEdit(e.target.value)}
          rows={5}
          className="min-h-[120px] w-full resize-y rounded-lg bg-black/30 p-3 text-[13px] leading-relaxed text-white focus:outline-none"
        />
      ) : (
        <pre className="whitespace-pre-wrap rounded-lg bg-black/30 p-3 font-sans text-[13px] leading-relaxed text-white/90">
          {body}
        </pre>
      )}
    </>
  );
}

export function ApproveRow({
  onApprove,
  onCopy,
  copied,
  onEditToggle,
  retry
}: {
  onApprove: () => void;
  onCopy: () => void;
  copied: boolean;
  onEditToggle: () => void;
  retry?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={onApprove}
        className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1 text-[12px] font-semibold text-black transition hover:bg-white/90"
      >
        <Check className="h-3.5 w-3.5" /> {retry ? "Approve & retry" : "Approve & send"}
      </button>
      <button
        type="button"
        onClick={onEditToggle}
        className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.05] px-3 py-1 text-[11.5px] text-white/80 transition hover:bg-white/[0.08]"
      >
        Edit
      </button>
      <button
        type="button"
        onClick={onCopy}
        className={clsx(
          "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11.5px] transition",
          copied ? "bg-emerald-500/[0.12] text-emerald-200" : "bg-white/[0.05] text-white/80 hover:bg-white/[0.08]"
        )}
      >
        {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

export function ReceiptLine({
  tone,
  children
}: {
  tone: "emerald" | "amber" | "rose" | "muted";
  children: React.ReactNode;
}) {
  const cls = {
    emerald: "bg-emerald-500/[0.08] text-emerald-200",
    amber: "bg-amber-500/[0.08] text-amber-200",
    rose: "bg-rose-500/[0.08] text-rose-200",
    muted: "bg-white/[0.04] text-white/60"
  }[tone];
  return <p className={clsx("rounded-lg px-3 py-2 text-[12.5px]", cls)}>{children}</p>;
}
