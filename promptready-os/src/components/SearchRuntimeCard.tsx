"use client";

import { useState } from "react";
import clsx from "clsx";
import { Search, Globe, Newspaper, GitBranch, ExternalLink, Rocket, Save } from "lucide-react";
import {
  SEARCH_CAPABILITIES,
  SEARCH_PROVIDERS,
  openExternalSearch,
  type SearchKind
} from "@/services/search";
import { useAtlasStore } from "@/store/atlas";
import { useMissionStore } from "@/store/mission";

/**
 * Search Runtime card · honest web-search seam.
 *
 * No in-app results, no scraping. The only real action is opening an
 * external browser search (always works). Provider APIs are adapter-ready
 * but key-based — none connected today. "Save to brain" writes a local
 * note only when the operator clicks it.
 */

const TONE = {
  muted: "border-white/10 bg-white/[0.03] text-white/55",
  accent: "border-accent/30 bg-accent/[0.08] text-accent",
  ok: "border-emerald-400/30 bg-emerald-500/[0.08] text-emerald-200"
} as const;

const KINDS: Array<{ id: SearchKind; label: string; Icon: typeof Globe }> = [
  { id: "web", label: "web", Icon: Globe },
  { id: "news", label: "news", Icon: Newspaper },
  { id: "repo", label: "repo", Icon: GitBranch }
];

type Flash = "saved to brain" | "opened browser" | null;

export function SearchRuntimeCard() {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<SearchKind>("web");
  const [flash, setFlash] = useState<Flash>(null);

  const trimmed = query.trim();
  const disabled = trimmed.length === 0;

  function onOpenBrowser() {
    if (disabled) return;
    if (openExternalSearch(trimmed, kind)) setFlash("opened browser");
  }

  function onTurnIntoMission() {
    if (disabled) return;
    void useMissionStore
      .getState()
      .dispatch(
        `Research: ${trimmed}. Summarize findings, list sources to open, and propose next operator actions.`,
        "general",
        "smart",
        null
      );
  }

  function onSaveToBrain() {
    if (disabled) return;
    useAtlasStore.getState().addMemoryDocs([
      {
        name: `Search · ${trimmed}`,
        ext: "md",
        size: trimmed.length,
        body: `# Search note\n\nQuery: ${trimmed}\nKind: ${kind}\nSearched externally (browser). Paste useful findings here.`
      }
    ]);
    setFlash("saved to brain");
  }

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-accent" />
          <span className="text-[13px] font-semibold text-white">Search Runtime</span>
        </div>
        <span
          className={clsx(
            "rounded border px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider",
            TONE.ok
          )}
        >
          browser fallback · live
        </span>
      </header>

      <p className="text-[11px] text-white/55">
        No search API connected — results open in your browser. Save adds a local
        note only if you click Save. No scraping, no in-app results.
      </p>

      <ul className="flex flex-wrap gap-1.5">
        {SEARCH_CAPABILITIES.map((cap) => (
          <li
            key={cap}
            className={clsx(
              "rounded border px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider",
              TONE.muted
            )}
          >
            {cap}
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-1.5">
        <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-white/45">
          Providers
        </span>
        <ul className="flex flex-col gap-1.5">
          {SEARCH_PROVIDERS.map((p) => (
            <li
              key={p.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/8 bg-white/[0.012] px-2.5 py-2"
            >
              <div className="flex flex-col">
                <span className="text-[12px] text-white">{p.label}</span>
                <span className="font-mono text-[9.5px] uppercase tracking-wider text-white/40">
                  {p.envVar}
                </span>
              </div>
              <span
                className={clsx(
                  "rounded border px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider",
                  TONE.muted
                )}
              >
                adapter ready · needs key
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setFlash(null);
          }}
          placeholder="Search query…"
          className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-[12px] text-white placeholder:text-white/35 outline-none focus:border-accent/40"
        />

        <div className="flex flex-wrap gap-1.5">
          {KINDS.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setKind(id)}
              className={clsx(
                "flex items-center gap-1.5 rounded border px-2 py-1 font-mono text-[9.5px] uppercase tracking-wider transition-colors",
                kind === id ? TONE.accent : TONE.muted
              )}
            >
              <Icon className="h-3 w-3" />
              {label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={onOpenBrowser}
            disabled={disabled}
            className={clsx(
              "flex items-center gap-1.5 rounded border px-2.5 py-1.5 text-[11px] transition-colors disabled:opacity-40",
              TONE.accent
            )}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Open in browser
          </button>
          <button
            type="button"
            onClick={onTurnIntoMission}
            disabled={disabled}
            className={clsx(
              "flex items-center gap-1.5 rounded border px-2.5 py-1.5 text-[11px] transition-colors disabled:opacity-40",
              TONE.muted
            )}
          >
            <Rocket className="h-3.5 w-3.5" />
            Turn into mission
          </button>
          <button
            type="button"
            onClick={onSaveToBrain}
            disabled={disabled}
            className={clsx(
              "flex items-center gap-1.5 rounded border px-2.5 py-1.5 text-[11px] transition-colors disabled:opacity-40",
              TONE.muted
            )}
          >
            <Save className="h-3.5 w-3.5" />
            Save to brain
          </button>
        </div>

        {flash ? (
          <span
            className={clsx(
              "self-start rounded border px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider",
              TONE.ok
            )}
          >
            {flash}
          </span>
        ) : null}
      </div>
    </section>
  );
}
