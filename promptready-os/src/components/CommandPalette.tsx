"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import clsx from "clsx";
import { Command, CornerDownLeft, RefreshCw, Check, Search } from "lucide-react";
import { useSourcesStore } from "@/store/sources";
import { useOperatorMemoryStore } from "@/store/operatorMemory";
import { useMorningRunStore } from "@/store/morningRun";
import { useActionQueue } from "@/services/executors";
import { buildTimeline } from "@/services/executors/timeline";
import { searchWorkspace, type SearchResult } from "@/services/search/search";

/**
 * Command Palette · Cmd/Ctrl+K. One surface for "go somewhere" AND
 * "do something" AND "find something" — Command + Search from the
 * Product Bible, built into the palette that already existed rather
 * than as parallel new screens. Every action is real: navigation to
 * an actual route, or a real call into the Action Queue / Morning Run
 * orchestrator. Search results come from services/search/search.ts —
 * plain keyword matching over data that already exists, no invented
 * "semantic" claim. Recent picks persist locally.
 */

interface PaletteAction {
  id: string;
  label: string;
  hint: string;
  /** Navigate here. Mutually exclusive with run. */
  to?: string;
  /** Perform a real side effect (queue/pipeline call) instead of navigating. */
  run?: () => void;
}

const NAV_ACTIONS: PaletteAction[] = [
  // Primary surfaces
  { id: "home", label: "Open Home", hint: "today", to: "/" },
  { id: "markets", label: "Open Markets", hint: "chart workspace", to: "/markets" },
  { id: "console", label: "Open Console", hint: "dispatch missions", to: "/console" },
  { id: "library", label: "Open Library", hint: "notes · saved", to: "/library" },
  { id: "launchpad", label: "Open Launchpad", hint: "external apps", to: "/launchpad" },
  { id: "settings", label: "Open Settings", hint: "providers · workspace", to: "/settings" },
  // Power-user routes
  { id: "atlas", label: "Open Atlas", hint: "blueprint canvas", to: "/atlas" },
  { id: "brain", label: "Open Brain", hint: "identity · memory", to: "/brain" },
  { id: "memory", label: "Open Memory", hint: "notes", to: "/memory" },
  { id: "workflows", label: "Open Workflows", hint: "automations", to: "/workflows" },
  { id: "marketplace", label: "Open Marketplace", hint: "packs", to: "/marketplace" },
  { id: "voice", label: "Open Voice console", hint: "transcripts", to: "/voice" },
  { id: "terminal", label: "Open Intelligence Terminal", hint: "feeds", to: "/terminal" },
  { id: "agents", label: "Open Agents", hint: "agent registry", to: "/agents" },
  { id: "server", label: "Open Server", hint: "ssh bridge", to: "/server" }
];

const SOURCE_LABEL: Record<SearchResult["source"], string> = {
  email: "Email",
  calendar: "Calendar",
  timeline: "Timeline",
  memory: "Memory"
};

const RECENT_KEY = "promptready-os.cmdk.recent";

function loadRecent(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function CommandPalette() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [recent, setRecent] = useState<string[]>(() => loadRecent());
  const [sel, setSel] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const calendarWriteGranted = useSourcesStore((s) => s.google.calendarWriteGranted);
  const snapshot = useSourcesStore((s) => s.snapshot);
  const memory = useOperatorMemoryStore((s) => s.memory);
  const runMorningRun = useMorningRunStore((s) => s.run);
  const approveAllPending = useActionQueue((s) => s.approveAllPending);
  const log = useActionQueue((s) => s.log);
  const items = useActionQueue((s) => s.items);
  const timeline = useMemo(() => buildTimeline(log, items), [log, items]);

  // Real quick actions — call into the same queue/pipeline every other
  // surface uses, never a bespoke shortcut of their own.
  const liveActions = useMemo((): PaletteAction[] => {
    const actions: PaletteAction[] = [
      { id: "sync-now", label: "Sync now", hint: "re-run Morning Run", run: () => void runMorningRun() },
      {
        id: "approve-all-pending",
        label: "Approve everything pending",
        hint: "every executor, one gesture",
        run: () => {
          approveAllPending();
        }
      }
    ];
    if (!calendarWriteGranted) {
      actions.push({
        id: "grant-calendar-write",
        label: "Grant Calendar write access",
        hint: "Settings → Sources",
        to: "/settings"
      });
    }
    return actions;
  }, [runMorningRun, approveAllPending, calendarWriteGranted]);

  const actions = useMemo(() => [...liveActions, ...NAV_ACTIONS], [liveActions]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSel(0);
      window.setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q
      ? actions.filter((a) => a.label.toLowerCase().includes(q) || a.hint.toLowerCase().includes(q) || a.id.includes(q))
      : [
          ...recent.map((id) => actions.find((a) => a.id === id)).filter((a): a is PaletteAction => !!a),
          ...actions.filter((a) => !recent.includes(a.id))
        ];
    return base.slice(0, 9);
  }, [query, recent, actions]);

  const searchResults = useMemo(
    () => (query.trim() ? searchWorkspace(query, { messages: snapshot?.messages, events: snapshot?.events, timeline, memory }) : []),
    [query, snapshot, timeline, memory]
  );

  const run = (a: PaletteAction) => {
    const next = [a.id, ...recent.filter((r) => r !== a.id)].slice(0, 5);
    setRecent(next);
    try {
      window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
    setOpen(false);
    if (a.run) a.run();
    else if (a.to) navigate(a.to);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center bg-black/50 pt-[14vh] backdrop-blur-sm"
      onMouseDown={() => setOpen(false)}
    >
      <div
        className="w-[min(560px,92vw)] overflow-hidden rounded-2xl border border-white/12 bg-graphite-900/95 shadow-glass"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-white/8 px-3 py-2.5">
          <Search className="h-3.5 w-3.5 text-white/45" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSel(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setSel((s) => Math.min(s + 1, filtered.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setSel((s) => Math.max(s - 1, 0));
              } else if (e.key === "Enter" && filtered[sel]) {
                e.preventDefault();
                run(filtered[sel]);
              }
            }}
            placeholder="Search or run a command…"
            className="flex-1 bg-transparent font-mono text-[13px] text-white placeholder:text-white/35 focus:outline-none"
          />
          <span className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-wider text-white/35">
            <Command className="h-3 w-3" />K
          </span>
        </div>
        <ul className="max-h-[52vh] overflow-auto p-1">
          {filtered.length === 0 ? (
            <li className="px-3 py-3 font-mono text-[11px] text-white/45">no matching command</li>
          ) : (
            filtered.map((a, i) => (
              <li key={a.id}>
                <button
                  type="button"
                  onMouseEnter={() => setSel(i)}
                  onClick={() => run(a)}
                  className={clsx(
                    "flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left transition",
                    i === sel ? "bg-accent/[0.12]" : "hover:bg-white/[0.05]"
                  )}
                >
                  <span className="flex items-center gap-2 text-[12.5px] text-white">
                    {a.id === "sync-now" && <RefreshCw className="h-3 w-3 text-white/40" />}
                    {a.id === "approve-all-pending" && <Check className="h-3 w-3 text-white/40" />}
                    {a.label}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="font-mono text-[9px] uppercase tracking-wider text-white/40">{a.hint}</span>
                    {i === sel && <CornerDownLeft className="h-3 w-3 text-accent" />}
                  </span>
                </button>
              </li>
            ))
          )}

          {searchResults.length > 0 && (
            <>
              <li className="px-3 pb-1 pt-2 font-mono text-[9px] uppercase tracking-[0.15em] text-white/30">
                Search results
              </li>
              {searchResults.map((r) => (
                <li key={`${r.source}-${r.id}`} className="flex items-baseline justify-between gap-3 px-3 py-1.5">
                  <span className="min-w-0 truncate text-[12px] text-white/75">{r.label}</span>
                  <span className="shrink-0 font-mono text-[9px] uppercase tracking-wider text-white/35">
                    {SOURCE_LABEL[r.source]}
                    {r.detail ? ` · ${r.detail}` : ""}
                  </span>
                </li>
              ))}
            </>
          )}
        </ul>
      </div>
    </div>
  );
}
