"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { ChevronDown, ChevronUp, Play, Save, Trash2 } from "lucide-react";
import {
  listScripts,
  upsert,
  remove,
  getActiveId,
  setActiveId,
  newId,
  type SavedScript,
  EXAMPLES
} from "@/services/scripts/store";
import type { ScriptResult } from "@/services/scripts/engine";

interface Props {
  result: ScriptResult | null;
  candlesAvailable: boolean;
  scriptBody: string;
  activeId: string;
  onChange(body: string, activeId: string): void;
  onRun(): void;
  expanded: boolean;
  onToggleExpanded(): void;
}

export function ScriptLabEditor({
  result,
  candlesAvailable,
  scriptBody,
  activeId,
  onChange,
  onRun,
  expanded,
  onToggleExpanded
}: Props) {
  const [scripts, setScripts] = useState<SavedScript[]>(() => listScripts());
  const [nameDraft, setNameDraft] = useState<string>("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Keep name draft in sync with active script.
  useEffect(() => {
    const a = scripts.find((s) => s.id === activeId);
    if (a) setNameDraft(a.name);
  }, [activeId, scripts]);

  const onPick = (id: string) => {
    const s = scripts.find((x) => x.id === id);
    if (!s) return;
    setActiveId(s.id);
    onChange(s.body, s.id);
    setNameDraft(s.name);
  };

  const onSave = () => {
    const name = nameDraft.trim() || `Script ${scripts.length + 1}`;
    const id = activeId || newId();
    const next = upsert({ id, name, body: scriptBody });
    setScripts(next);
    setActiveId(id);
    onChange(scriptBody, id);
  };

  const onNew = () => {
    const id = newId();
    const fresh: SavedScript = {
      id,
      name: "Untitled script",
      body: "// Write your indicator below.\n// Built-ins: sma · ema · rsi · bb · plot · hline\nlet fast = sma(close, 20)\nplot(fast, \"SMA 20\")\n"
    };
    const next = upsert(fresh);
    setScripts(next);
    setActiveId(id);
    onChange(fresh.body, id);
    setNameDraft(fresh.name);
    textareaRef.current?.focus();
  };

  const onDelete = () => {
    if (!activeId) return;
    const isBuiltin = EXAMPLES.some((e) => e.id === activeId);
    if (isBuiltin) return;
    const next = remove(activeId);
    setScripts(next);
    const fallback = next[0];
    setActiveId(fallback.id);
    onChange(fallback.body, fallback.id);
    setNameDraft(fallback.name);
  };

  const isBuiltin = useMemo(() => EXAMPLES.some((e) => e.id === activeId), [activeId]);

  return (
    <section
      className="flex flex-col gap-1.5 rounded-md border border-white/10 bg-black/40 p-2"
      aria-label="Script Lab"
    >
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleExpanded}
            title={expanded ? "Collapse Script Lab" : "Expand Script Lab"}
            aria-label="Toggle Script Lab"
            className="inline-flex h-6 w-6 items-center justify-center rounded border border-white/10 bg-white/[0.03] text-white/65 transition hover:bg-white/[0.06] hover:text-white"
          >
            {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
          </button>
          <span className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-white/85">
            Script Lab
          </span>
          <span className="font-mono text-[9px] uppercase tracking-wider text-white/40">
            local · sandboxed · sma / ema / rsi / bb / plot / hline
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <select
            value={activeId}
            onChange={(e) => onPick(e.target.value)}
            aria-label="Saved script"
            className="rounded-md border border-white/10 bg-white/[0.03] px-1.5 py-1 font-mono text-[10px] text-white/85"
          >
            {scripts.map((s) => (
              <option key={s.id} value={s.id}>
                {s.builtin ? `· ${s.name}` : s.name}
              </option>
            ))}
          </select>
          <input
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            placeholder="script name"
            aria-label="Script name"
            className="rounded-md border border-white/10 bg-white/[0.03] px-1.5 py-1 font-mono text-[10px] text-white/85 placeholder:text-white/30 focus:border-accent/40 focus:outline-none"
            style={{ width: 130 }}
          />
          <button
            type="button"
            onClick={onSave}
            title="Save script · WORKS"
            aria-label="Save script · WORKS"
            className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 font-mono text-[9.5px] uppercase tracking-wider text-white/65 transition hover:bg-white/[0.06] hover:text-white"
          >
            <Save className="h-3 w-3" /> save
          </button>
          <button
            type="button"
            onClick={onNew}
            title="New script · WORKS"
            aria-label="New script · WORKS"
            className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 font-mono text-[9.5px] uppercase tracking-wider text-white/65 transition hover:bg-white/[0.06] hover:text-white"
          >
            new
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={isBuiltin}
            title={isBuiltin ? "Built-in examples cannot be deleted" : "Delete script · WORKS"}
            aria-label="Delete script"
            className="inline-flex items-center gap-1 rounded-md border border-rose-400/25 bg-rose-500/[0.06] px-2 py-1 font-mono text-[9.5px] uppercase tracking-wider text-rose-200/80 transition hover:bg-rose-500/[0.12] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Trash2 className="h-3 w-3" /> del
          </button>
          <button
            type="button"
            onClick={onRun}
            disabled={!candlesAvailable}
            title={candlesAvailable ? "Run script · WORKS" : "Run script · script requires candles"}
            aria-label="Run script · WORKS"
            className="inline-flex items-center gap-1 rounded-md border border-accent/40 bg-accent/[0.1] px-2 py-1 font-mono text-[9.5px] uppercase tracking-wider text-accent transition hover:bg-accent/[0.15] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Play className="h-3 w-3" /> run
          </button>
        </div>
      </header>

      {expanded && (
        <>
          <textarea
            ref={textareaRef}
            value={scriptBody}
            onChange={(e) => onChange(e.target.value, activeId)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                onRun();
              }
            }}
            spellCheck={false}
            wrap="off"
            className="no-drag w-full resize-y rounded-md border border-white/10 bg-black/60 p-2 font-mono text-[11.5px] leading-snug text-white/90 placeholder:text-white/30 focus:border-accent/40 focus:outline-none"
            style={{ minHeight: 120, height: 160 }}
            aria-label="Script body"
            placeholder="// sources: close, open, high, low, volume, hl2, hlc3, ohlc4"
          />
          <ResultLine result={result} candlesAvailable={candlesAvailable} />
        </>
      )}
    </section>
  );
}

function ResultLine({ result, candlesAvailable }: { result: ScriptResult | null; candlesAvailable: boolean }) {
  if (!candlesAvailable) {
    return (
      <div className="rounded border border-amber-400/30 bg-amber-500/[0.06] px-2 py-1 font-mono text-[9.5px] uppercase tracking-wider text-amber-200">
        script requires candles · select a Binance-supported symbol (BTC / ETH / SOL / BNB / XRP)
      </div>
    );
  }
  if (!result) {
    return (
      <div className="rounded border border-white/8 bg-white/[0.012] px-2 py-1 font-mono text-[9.5px] uppercase tracking-wider text-white/45">
        idle · press run or Cmd/Ctrl+Enter
      </div>
    );
  }
  if (!result.ok) {
    return (
      <div className="rounded border border-rose-400/30 bg-rose-500/[0.06] px-2 py-1 font-mono text-[10px] text-rose-200">
        <span className="uppercase tracking-wider">{result.error}</span>
        {result.errorLine != null && <span className="ml-1 text-white/45">· line {result.errorLine}</span>}
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded border border-emerald-400/25 bg-emerald-500/[0.05] px-2 py-1 font-mono text-[9.5px] text-emerald-200">
      <span className="uppercase tracking-wider">ok · {result.plots.length} plot · {result.hlines.length} hline</span>
      {result.log.map((line, i) => (
        <span key={i} className="rounded border border-white/8 bg-white/[0.03] px-1.5 py-px text-white/70">
          {line}
        </span>
      ))}
    </div>
  );
}
