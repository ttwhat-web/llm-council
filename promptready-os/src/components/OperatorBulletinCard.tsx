"use client";

import clsx from "clsx";
import { Newspaper } from "lucide-react";
import { useAtlasStore } from "@/store/atlas";
import { useMissionStore } from "@/store/mission";

/**
 * Morning Operator Brief · honest-by-design bulletin.
 *
 * The desktop runtime will wire in external feeds (AI/markets/crypto/
 * travel/tech news). None of those adapters are live yet, so every
 * external row reports a real source state — "planned" or "adapter
 * ready" — and NEVER a fabricated headline or number.
 *
 * Only the Operator row and the Health rollup surface real local
 * numbers (mission history, armed alert rules, memory, snapshots).
 */

type Tone = "ok" | "warn" | "planned" | "accent";

function toneClass(tone: Tone): string {
  switch (tone) {
    case "ok":
      return "border-emerald-400/30 bg-emerald-500/[0.08] text-emerald-200";
    case "warn":
      return "border-amber-400/30 bg-amber-500/[0.08] text-amber-200";
    case "accent":
      return "border-accent/30 bg-accent/[0.08] text-accent";
    case "planned":
    default:
      return "border-white/10 bg-white/[0.03] text-white/55";
  }
}

function startOfToday(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function readAlertsCount(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = window.localStorage.getItem("promptready-os.intel-terminal.alerts");
    if (!raw) return 0;
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    return 0;
  }
}

interface BriefRow {
  section: string;
  value: string;
  pill: string;
  tone: Tone;
}

export function OperatorBulletinCard() {
  const history = useMissionStore((s) => s.history);
  const memoryDocs = useAtlasStore((s) => s.memoryDocs);
  const workflowRuns = useAtlasStore((s) => s.workflowRuns);
  const snapshots = useAtlasStore((s) => s.snapshots);

  const todayStart = startOfToday();
  const missionsToday = history.filter((r) => r.startedAt >= todayStart).length;
  const alertCount = readAlertsCount();
  const pendingApprovals = workflowRuns.filter((r) => r.status === "awaiting-approval").length;

  const health = Math.max(
    0,
    Math.min(
      100,
      50 +
        Math.min(20, history.length) +
        Math.min(10, memoryDocs.length) +
        Math.min(10, snapshots.length * 2)
    )
  );
  const healthTone: Tone = health >= 75 ? "ok" : health >= 50 ? "warn" : "warn";
  const healthColor =
    health >= 75 ? "text-emerald-200" : health >= 50 ? "text-amber-200" : "text-rose-200";

  const rows: BriefRow[] = [
    { section: "AI", value: "offline", pill: "planned", tone: "planned" },
    {
      section: "Markets",
      value: alertCount > 0 ? `${alertCount} alert${alertCount === 1 ? "" : "s"}` : "no alerts",
      pill: "adapter ready",
      tone: alertCount > 0 ? "warn" : "planned"
    },
    { section: "Crypto", value: "feed offline", pill: "planned", tone: "planned" },
    { section: "Export", value: "offline", pill: "planned", tone: "planned" },
    { section: "Travel", value: "offline", pill: "planned", tone: "planned" },
    { section: "Tech", value: "offline", pill: "planned", tone: "planned" },
    {
      section: "Operator",
      value: `${missionsToday} mission${missionsToday === 1 ? "" : "s"} today`,
      pill: "live",
      tone: "ok"
    }
  ];

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Newspaper className="h-4 w-4 text-accent" />
          <span className="text-[13px] font-semibold text-white">Morning Operator Brief</span>
        </div>
        <span
          className={clsx(
            "rounded border px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider",
            toneClass("planned")
          )}
        >
          sources offline
        </span>
      </header>

      <p className="text-[11px] text-white/55">
        External feeds (AI, markets, crypto, travel, tech) wire in with the desktop
        runtime — they are offline today, so each row reports its real source state
        and never invents a headline. Operator metrics below are live local counts.
      </p>

      <ul className="flex flex-col gap-1.5">
        {rows.map((row) => (
          <li
            key={row.section}
            className="flex items-center justify-between gap-2 rounded-md border border-white/8 bg-white/[0.012] px-2.5 py-1.5"
          >
            <span className="text-[12px] text-white">{row.section}</span>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] text-white/55">{row.value}</span>
              <span
                className={clsx(
                  "rounded border px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider",
                  toneClass(row.tone)
                )}
              >
                {row.pill}
              </span>
            </div>
          </li>
        ))}
        <li className="flex items-center justify-between gap-2 rounded-md border border-white/8 bg-white/[0.012] px-2.5 py-1.5">
          <span className="text-[12px] text-white">Operator · approvals</span>
          <span className="font-mono text-[11px] text-white/55">
            {pendingApprovals === 0
              ? "no pending approvals"
              : `${pendingApprovals} awaiting approval`}
          </span>
        </li>
      </ul>

      <div className="flex items-center justify-between gap-2 rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2">
        <span className="font-mono text-[10px] uppercase tracking-wider text-white/45">
          Health
        </span>
        <span className={clsx("font-mono text-[14px] tabular-nums", healthColor)}>
          {`Health · ${health}%`}
        </span>
        <span
          className={clsx(
            "rounded border px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider",
            toneClass(healthTone)
          )}
        >
          local
        </span>
      </div>

      <footer className="border-t border-white/6 pt-2 font-mono text-[9.5px] uppercase tracking-wider text-white/45">
        {`as of ${new Date().toLocaleTimeString()} · external feeds wire in with the desktop runtime.`}
      </footer>
    </section>
  );
}
