"use client";

import { useMemo } from "react";
import clsx from "clsx";
import { CopyButton } from "./CopyButton";
import { diffLines } from "@/lib/diff";

/**
 * Side-by-side diff between the user's cleaned input and the rendered
 * execution-ready prompt. Set-based line tagging from lib/diff.ts:
 *
 *   left  — cleaned input
 *           common lines: neutral
 *           lines absent from prompt: muted red (removed)
 *
 *   right — execution-ready prompt
 *           common lines: neutral
 *           lines absent from input: muted emerald (added by the engine)
 */

interface Props {
  before: string;
  after: string;
  compact?: boolean;
}

export function DiffView({ before, after, compact }: Props) {
  const diff = useMemo(() => diffLines(before, after), [before, after]);

  return (
    <div className={clsx("flex flex-col gap-2", compact && "gap-1.5")}>
      <div className="flex flex-wrap items-center gap-2 text-[11px]">
        <span className="rounded-md border border-red-500/25 bg-red-500/5 px-2 py-0.5 text-red-200/80">
          − {diff.removedLines} removed
        </span>
        <span className="rounded-md border border-emerald-500/25 bg-emerald-500/5 px-2 py-0.5 text-emerald-200/80">
          + {diff.addedLines} added
        </span>
        <span className="rounded-md bg-white/[0.04] px-2 py-0.5 text-white/55">
          {diff.commonLines} common
        </span>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-2 lg:grid-cols-2">
        <Pane
          title="Cleaned input"
          subtitle="What you wrote"
          tone="left"
          text={before}
          lines={diff.left}
        />
        <Pane
          title="Execution-ready prompt"
          subtitle="What the engine produced"
          tone="right"
          text={after}
          lines={diff.right}
        />
      </div>
    </div>
  );
}

function Pane({
  title,
  subtitle,
  tone,
  text,
  lines
}: {
  title: string;
  subtitle: string;
  tone: "left" | "right";
  text: string;
  lines: ReturnType<typeof diffLines>["left"];
}) {
  return (
    <div className="flex min-h-0 flex-col rounded-2xl border border-white/8 bg-black/30">
      <div className="flex items-center justify-between border-b border-white/5 px-3 py-2">
        <div className="flex flex-col leading-tight">
          <span className="text-[11px] font-medium uppercase tracking-wider text-white/55">
            {title}
          </span>
          <span className="text-[10px] text-white/35">{subtitle}</span>
        </div>
        <CopyButton text={text} />
      </div>
      <div className="scrollbar-thin max-h-[60vh] flex-1 overflow-auto px-0 py-1.5 font-mono text-[12px] leading-relaxed">
        {lines.map((line, i) => (
          <DiffLineRow key={i} text={line.text} op={line.op} side={tone} index={i + 1} />
        ))}
      </div>
    </div>
  );
}

function DiffLineRow({
  text,
  op,
  side,
  index
}: {
  text: string;
  op: "common" | "removed" | "added";
  side: "left" | "right";
  index: number;
}) {
  const isChanged =
    (op === "removed" && side === "left") || (op === "added" && side === "right");
  const tone = isChanged
    ? side === "left"
      ? "bg-red-500/[0.05] text-red-100/90 border-l-red-500/40"
      : "bg-emerald-500/[0.05] text-emerald-100/95 border-l-emerald-500/40"
    : "border-l-transparent text-white/70";
  const marker = isChanged ? (side === "left" ? "−" : "+") : " ";
  const markerClass = isChanged
    ? side === "left"
      ? "text-red-300/70"
      : "text-emerald-300/80"
    : "text-white/20";

  return (
    <div className={clsx("flex items-start gap-0 border-l-2 px-3", tone)}>
      <span className="mr-2 w-7 shrink-0 select-none text-right font-mono text-[10px] text-white/20">
        {index}
      </span>
      <span className={clsx("mr-2 w-3 shrink-0 select-none font-mono text-[11px]", markerClass)}>
        {marker}
      </span>
      <span className="whitespace-pre-wrap break-words">{text || " "}</span>
    </div>
  );
}
