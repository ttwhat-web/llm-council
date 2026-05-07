"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { ChevronDown, ChevronRight, Activity } from "lucide-react";
import { cleanInput } from "@/lib/cleaner";
import { buildSections, detectMode } from "@/lib/engine";
import { getMode } from "@/lib/modes";
import type { Mode } from "@/lib/types";

/**
 * Live structure preview — runs purely client-side off the user's typing.
 *
 *   RAW IDEA  →  STRUCTURED PROMPT  →  EXPECTED OUTPUT STYLE
 *
 * Lightweight, debounced (160 ms), no AI call, no fake streaming.
 * Reuses lib/cleaner.ts and lib/engine.ts (both pure).
 */

interface Props {
  input: string;
  mode: Mode;
  autoMode: boolean;
  /** Defaults to collapsed; the toggle persists in localStorage. */
  defaultOpen?: boolean;
  compact?: boolean;
}

const STORAGE_KEY = "promptfixer.livePreview.open";

export function LivePreview({ input, mode, autoMode, defaultOpen = false, compact }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const [debounced, setDebounced] = useState(input);

  useEffect(() => {
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      if (v != null) setOpen(v === "1");
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, open ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [open]);

  // Debounce input so we don't redo the work on every keystroke.
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(input), 160);
    return () => window.clearTimeout(id);
  }, [input]);

  const preview = useMemo(() => {
    const trimmed = debounced.trim();
    if (!trimmed) return null;
    const cleaned = cleanInput(trimmed).cleaned;
    const detected = autoMode ? detectMode(cleaned) : undefined;
    const finalMode = detected || mode;
    const sections = buildSections({ cleanedInput: cleaned, mode: finalMode });
    const profile = getMode(finalMode);
    return {
      cleaned,
      detectedMode: detected,
      finalMode,
      role: sections.role,
      task: sections.task,
      constraints: sections.constraints,
      outputFormat: sections.outputFormat,
      audience: profile.audience
    };
  }, [debounced, mode, autoMode]);

  return (
    <div
      className={clsx(
        "overflow-hidden rounded-2xl border border-white/6 bg-white/[0.015] transition",
        compact && "text-[11px]"
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-3 py-2 transition hover:bg-white/[0.02]"
      >
        <div className="flex items-center gap-2">
          <Activity className="h-3.5 w-3.5 text-accent/80" />
          <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/55">
            Live preview
          </span>
          {preview ? (
            <span className="rounded bg-white/[0.04] px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-white/45">
              {preview.finalMode}
            </span>
          ) : (
            <span className="text-[10px] text-white/30">type to preview structure</span>
          )}
        </div>
        {open ? (
          <ChevronDown className="h-3.5 w-3.5 text-white/40" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-white/40" />
        )}
      </button>

      {open && preview && (
        <div className="grid grid-cols-1 gap-px border-t border-white/6 bg-white/5 lg:grid-cols-3">
          <Pane label="Raw idea" subtitle="Cleaned input">
            <p className="whitespace-pre-wrap font-mono text-[11px] text-white/65">
              {preview.cleaned}
            </p>
          </Pane>
          <Pane label="Structured prompt" subtitle={`mode · ${preview.finalMode}`}>
            <Section label="Role">{preview.role}</Section>
            <Section label="Task">{preview.task}</Section>
            <Section label="Constraints">
              {preview.constraints.length === 0 ? (
                <span className="text-white/30">—</span>
              ) : (
                <ul className="m-0 space-y-0.5">
                  {preview.constraints.slice(0, 4).map((c, i) => (
                    <li key={i} className="text-[11px] text-white/65">
                      • {c}
                    </li>
                  ))}
                  {preview.constraints.length > 4 && (
                    <li className="text-[10px] text-white/35">
                      +{preview.constraints.length - 4} more
                    </li>
                  )}
                </ul>
              )}
            </Section>
          </Pane>
          <Pane label="Expected output" subtitle={preview.audience}>
            <p className="whitespace-pre-wrap font-mono text-[11px] text-white/70">
              {preview.outputFormat}
            </p>
          </Pane>
        </div>
      )}

      {open && !preview && (
        <div className="border-t border-white/6 px-3 py-3 text-[11px] text-white/35">
          Start typing — the structure preview updates as you go.
        </div>
      )}
    </div>
  );
}

function Pane({
  label,
  subtitle,
  children
}: {
  label: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5 bg-ink-900/60 px-3 py-2.5">
      <div className="flex items-baseline justify-between">
        <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-white/45">
          {label}
        </span>
        {subtitle && (
          <span className="truncate text-[9px] uppercase tracking-wider text-white/30">
            {subtitle}
          </span>
        )}
      </div>
      <div className="text-[11px] leading-5 text-white/75">{children}</div>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[9px] uppercase tracking-wider text-white/30">{label}</span>
      <div className="text-[11px] text-white/70">{children}</div>
    </div>
  );
}
