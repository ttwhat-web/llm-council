"use client";

import clsx from "clsx";
import { CopyButton } from "./CopyButton";
import { renderPrompt } from "@/lib/engine";
import type { Mode, PromptSections } from "@/lib/types";

interface Props {
  sections: PromptSections;
  compact?: boolean;
}

const VARIANTS: Array<{ id: Mode; label: string; tag: string }> = [
  { id: "claude", label: "Claude-style", tag: "XML, calm tone" },
  { id: "chatgpt", label: "ChatGPT-style", tag: "Markdown, action-first" },
  { id: "cursor", label: "Cursor-style", tag: "File paths, diffs" }
];

export function CompareView({ sections, compact }: Props) {
  return (
    <div className={clsx("flex flex-col gap-3", compact && "gap-2")}>
      <div className="text-[12px] text-white/65">
        The same execution-ready prompt, rendered for three different tools.
        Pick whichever matches where you'll paste it.
      </div>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        {VARIANTS.map((v) => {
          const text = renderPrompt(sections, v.id);
          return (
            <div
              key={v.id}
              className="flex min-h-0 flex-col rounded-2xl border border-white/8 bg-black/30"
            >
              <div className="flex items-center justify-between border-b border-white/5 px-3 py-2">
                <div className="flex flex-col">
                  <div className="text-[11px] font-medium uppercase tracking-wider text-white/65">
                    {v.label}
                  </div>
                  <div className="text-[10px] text-white/40">{v.tag}</div>
                </div>
                <CopyButton text={text} />
              </div>
              <pre className="scrollbar-thin max-h-[50vh] flex-1 overflow-auto whitespace-pre-wrap px-3 py-2.5 font-mono text-[11px] leading-relaxed text-white/85">
                {text}
              </pre>
            </div>
          );
        })}
      </div>
    </div>
  );
}
