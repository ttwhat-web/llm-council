"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import clsx from "clsx";
import { Command, CornerDownLeft, Search } from "lucide-react";

/**
 * Command Palette · UX-X. Global Cmd/Ctrl+K launcher. Every action is a
 * real in-app navigation or a navigation to the surface that performs it
 * — no fake AI, no hidden side effects. Recent picks persist locally.
 */

interface PaletteAction {
  id: string;
  label: string;
  hint: string;
  to: string;
}

const ACTIONS: PaletteAction[] = [
  { id: "atlas", label: "Open Atlas", hint: "home", to: "/" },
  { id: "terminal", label: "Open Intelligence Terminal", hint: "terminal", to: "/terminal" },
  { id: "terminal-pro", label: "Open Terminal Pro · Live Wall", hint: "terminal · w", to: "/terminal" },
  { id: "market-lab", label: "Open Market Lab", hint: "MIC", to: "/market-lab" },
  { id: "voice", label: "Open Voice · Atlas", hint: "jarvis", to: "/voice" },
  { id: "atlas-analyze", label: "Atlas analyze", hint: "voice console", to: "/voice" },
  { id: "clean-paste", label: "Clean paste", hint: "smart paste", to: "/voice" },
  { id: "new-mission", label: "New mission", hint: "mission control", to: "/mission-control" },
  { id: "new-note", label: "New note", hint: "memory", to: "/memory" },
  { id: "telegram", label: "Telegram", hint: "settings · remote", to: "/settings" },
  { id: "market-replay", label: "Market replay", hint: "library", to: "/library" },
  { id: "polymarket", label: "Polymarket research", hint: "market lab", to: "/market-lab" },
  { id: "tasks", label: "Recent tasks", hint: "voice queue", to: "/voice" },
  { id: "marketplace", label: "Open Marketplace", hint: "packs", to: "/marketplace" },
  { id: "workflows", label: "Open Workflows", hint: "workflows", to: "/workflows" },
  { id: "brain", label: "Open Brain", hint: "brain", to: "/brain" },
  { id: "settings", label: "Open Settings", hint: "settings", to: "/settings" }
];

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
      ? ACTIONS.filter((a) => a.label.toLowerCase().includes(q) || a.hint.toLowerCase().includes(q) || a.id.includes(q))
      : [
          ...recent.map((id) => ACTIONS.find((a) => a.id === id)).filter((a): a is PaletteAction => !!a),
          ...ACTIONS.filter((a) => !recent.includes(a.id))
        ];
    return base.slice(0, 9);
  }, [query, recent]);

  const run = (a: PaletteAction) => {
    const next = [a.id, ...recent.filter((r) => r !== a.id)].slice(0, 5);
    setRecent(next);
    try {
      window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
    setOpen(false);
    navigate(a.to);
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
            placeholder="Type a command or search…"
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
                  <span className="text-[12.5px] text-white">{a.label}</span>
                  <span className="flex items-center gap-2">
                    <span className="font-mono text-[9px] uppercase tracking-wider text-white/40">{a.hint}</span>
                    {i === sel && <CornerDownLeft className="h-3 w-3 text-accent" />}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
