"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Download, Sparkles, X } from "lucide-react";
import { MarketingShell } from "@/components/MarketingShell";

/**
 * /founders · Phase 19 launch readiness.
 *
 * Local waitlist. No backend. Entries persist to localStorage so the
 * operator can collect early interest without standing up infra.
 * The visible form is honest about that: "stored locally · we export
 * to CSV when we're ready to onboard."
 *
 * Admin CSV export is available at /founders?admin=1.
 */

interface WaitlistEntry {
  id: string;
  email: string;
  role: string;
  use: string;
  at: number;
}

const STORAGE_KEY = "operator.center.waitlist";
const ROLES = ["Founder", "Engineer", "Operator", "Designer", "Investor", "Other"];

export default function FoundersPage() {
  const [admin, setAdmin] = useState(false);
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);

  useEffect(() => {
    setAdmin(new URLSearchParams(window.location.search).get("admin") === "1");
    setEntries(loadEntries());
  }, []);

  return (
    <MarketingShell>
      <div className="flex flex-col gap-6">
        <header className="flex flex-col gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-accent">
            founders · operator waitlist
          </span>
          <h1 className="max-w-[18ch] text-3xl font-semibold leading-[1.05] tracking-tight text-white md:text-5xl">
            First 100 operators get Founder Lifetime.
          </h1>
          <p className="max-w-[58ch] text-[14px] leading-relaxed text-white/65">
            PromptReady OS is local-first and source-buildable today. Join
            the founder list and we&rsquo;ll ship signed installers, the mobile
            companion, and the Telegram bridge first to your machine. No
            recurring fee for you · ever.
          </p>
        </header>

        <WaitlistForm entries={entries} onChange={setEntries} />

        <Perks />

        {admin && <AdminPanel entries={entries} onChange={setEntries} />}

        <footer className="flex flex-wrap items-center gap-3 pt-4">
          <Link
            href="/download"
            className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[12px] font-medium text-white/85 hover:bg-white/[0.06]"
          >
            ← Download page
          </Link>
          <Link
            href="/docs"
            className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[12px] font-medium text-white/85 hover:bg-white/[0.06]"
          >
            Docs
          </Link>
          <span className="font-mono text-[10px] uppercase tracking-wider text-white/40">
            entries persist locally · export to CSV at /founders?admin=1
          </span>
        </footer>
      </div>
    </MarketingShell>
  );
}

function WaitlistForm({
  entries,
  onChange
}: {
  entries: WaitlistEntry[];
  onChange: (next: WaitlistEntry[]) => void;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState(ROLES[0]);
  const [use, setUse] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmed = email.trim();
    if (!isLikelyEmail(trimmed)) {
      setError("That doesn't look like an email.");
      return;
    }
    if (entries.some((x) => x.email.toLowerCase() === trimmed.toLowerCase())) {
      setError("That email is already on the list.");
      return;
    }
    const entry: WaitlistEntry = {
      id: Math.random().toString(36).slice(2, 10),
      email: trimmed,
      role,
      use: use.trim(),
      at: Date.now()
    };
    const next = [entry, ...entries].slice(0, 500);
    saveEntries(next);
    onChange(next);
    setSubmitted(true);
    setEmail("");
    setUse("");
    setRole(ROLES[0]);
    window.setTimeout(() => setSubmitted(false), 4000);
  };

  return (
    <section className="rounded-3xl border border-accent/25 bg-accent/[0.04] p-5 shadow-glow">
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-accent">
              email
            </span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@operator.center"
              className="rounded-md border border-white/10 bg-white/[0.025] px-3 py-2 text-[13px] text-white placeholder:text-white/30 focus:border-accent/40 focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-accent">
              role
            </span>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="rounded-md border border-white/10 bg-white/[0.025] px-3 py-2 text-[13px] text-white focus:border-accent/40 focus:outline-none"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </label>
        </div>
        <label className="flex flex-col gap-1">
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-accent">
            intended use
          </span>
          <textarea
            value={use}
            onChange={(e) => setUse(e.target.value)}
            placeholder="What do you want PromptReady OS to do for you? (optional)"
            rows={3}
            className="rounded-md border border-white/10 bg-white/[0.025] px-3 py-2 text-[13px] text-white placeholder:text-white/30 focus:border-accent/40 focus:outline-none"
          />
        </label>
        {error && (
          <p className="flex items-center gap-1.5 rounded-md border border-rose-400/30 bg-rose-500/[0.08] px-2 py-1 text-[11.5px] text-rose-100/90">
            <X className="h-3 w-3" /> {error}
          </p>
        )}
        {submitted && (
          <p className="flex items-center gap-1.5 rounded-md border border-emerald-400/30 bg-emerald-500/[0.08] px-2 py-1 text-[11.5px] text-emerald-100/90">
            <Check className="h-3 w-3" /> Saved locally · we&rsquo;ll reach out
            via email when installers ship.
          </p>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-xl bg-accent/90 px-4 py-2 text-sm font-semibold text-white shadow-glow transition hover:bg-accent"
          >
            <Sparkles className="h-4 w-4" /> Reserve founder spot
          </button>
          <span className="font-mono text-[10px] uppercase tracking-wider text-white/40">
            stored locally · we export to CSV when we&rsquo;re ready to onboard
          </span>
        </div>
      </form>
    </section>
  );
}

function Perks() {
  const perks = [
    "Founder lifetime tier · no recurring fee, ever",
    "Direct line to the build · weekly progress receipts",
    "Vote on the next surface (mobile · agents · marketplace · team spaces)",
    "Signed installers ship to you before public release",
    "Private workflow + memory pack swaps with other founders"
  ];
  return (
    <section className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
      <header className="mb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-white/45">
        what founders get
      </header>
      <ul className="flex flex-col gap-1.5">
        {perks.map((p) => (
          <li key={p} className="flex items-start gap-2 text-[12.5px] text-white/80">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent" />
            <span>{p}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function AdminPanel({
  entries,
  onChange
}: {
  entries: WaitlistEntry[];
  onChange: (next: WaitlistEntry[]) => void;
}) {
  const onExport = () => {
    const csv = toCsv(entries);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const stamp = new Date().toISOString().slice(0, 10);
    a.download = `operator-center-waitlist-${stamp}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const onClear = () => {
    if (!window.confirm("Clear local waitlist?")) return;
    saveEntries([]);
    onChange([]);
  };
  return (
    <section className="rounded-2xl border border-rose-400/25 bg-rose-500/[0.04] p-4">
      <header className="mb-2 flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-rose-200">
          admin · local waitlist export
        </span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onExport}
            disabled={entries.length === 0}
            className="inline-flex items-center gap-1 rounded-md bg-accent/85 px-2 py-1 text-[11px] font-semibold text-white shadow-glow hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Download className="h-3 w-3" /> Export CSV
          </button>
          <button
            type="button"
            onClick={onClear}
            disabled={entries.length === 0}
            className="inline-flex items-center gap-1 rounded-md border border-rose-400/30 bg-rose-500/[0.06] px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-rose-200 hover:bg-rose-500/[0.12] disabled:cursor-not-allowed disabled:opacity-40"
          >
            clear local
          </button>
        </div>
      </header>
      <p className="text-[11px] text-white/55">
        {entries.length} entr{entries.length === 1 ? "y" : "ies"} on this
        machine. CSV export bundles them so you can hand them to whatever
        CRM / sendgrid / mailchimp comes next.
      </p>
      {entries.length > 0 && (
        <ul className="mt-2 flex max-h-[200px] flex-col gap-1 overflow-auto">
          {entries.slice(0, 25).map((e) => (
            <li
              key={e.id}
              className="flex items-center justify-between rounded-md border border-white/8 bg-white/[0.012] px-2 py-1 text-[11px]"
            >
              <span className="truncate font-mono text-white/85">{e.email}</span>
              <span className="font-mono text-[9.5px] uppercase tracking-wider text-white/45">
                {e.role} · {new Date(e.at).toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function loadEntries(): WaitlistEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as WaitlistEntry[];
  } catch {
    return [];
  }
}
function saveEntries(entries: WaitlistEntry[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // ignore
  }
}

function isLikelyEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function toCsv(entries: WaitlistEntry[]): string {
  const header = ["email", "role", "use", "at"];
  const rows = entries.map((e) => [e.email, e.role, e.use, new Date(e.at).toISOString()]);
  const escape = (s: string) =>
    /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  return [
    header.join(","),
    ...rows.map((r) => r.map((c) => escape(String(c))).join(","))
  ].join("\n");
}
