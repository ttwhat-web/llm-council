"use client";

import { useState } from "react";
import { BookOpen, Download } from "lucide-react";
import { useBrainStore } from "@/store/brain";
import { useMissionStore } from "@/store/mission";
import { useAtlasStore } from "@/store/atlas";
import { readMorningBrief, readOperatorRank } from "@/services/operatorRank";
import { auditLog } from "@/services/auditLog";

/**
 * Brain Passport · UX RESET 03.
 *
 * Read-only export of who this operator is and what their brain has
 * accumulated. Bundles operator identity, mode, health, counters, and
 * a snapshot of runtime state into a portable `atlas-passport.brain`
 * file. Export only · no restore yet (snapshot restore lives in the
 * Snapshots card with its own .brainpack format).
 */

interface PassportFile {
  format: "operator.center.passport";
  version: 1;
  exportedAt: number;
  operator: {
    tier: string;
    rank: string;
    level: string;
    ageDays: number;
    maturityPct: number;
  };
  brain: {
    name: string | null;
    mode: string | null;
    createdAt: number | null;
    demo: boolean;
  };
  counters: {
    missions: number;
    receipts: number;
    repos: number;
    imports: number;
    snapshots: number;
    workflows: number;
    pinnedDeliverables: number;
    inboxItems: number;
  };
  runtime: {
    engines: string[];
    sources: Array<{ kind: string; label: string; state: string }>;
    templates: number;
  };
  morningBrief: ReturnType<typeof readMorningBrief>;
}

function build(): PassportFile {
  const brain = useBrainStore.getState();
  const missions = useMissionStore.getState();
  const atlas = useAtlasStore.getState();
  const rank = readOperatorRank();
  return {
    format: "operator.center.passport",
    version: 1,
    exportedAt: Date.now(),
    operator: {
      tier: readOperatorTier(),
      rank: rank.rank,
      level: rank.levelLabel,
      ageDays: rank.ageDays,
      maturityPct: rank.maturityPct
    },
    brain: {
      name: brain.identity?.name ?? null,
      mode: brain.identity?.mode ?? null,
      createdAt: brain.identity?.createdAt ?? null,
      demo: brain.demo
    },
    counters: {
      missions: missions.history.length,
      receipts: missions.history.length,
      repos: brain.memorySources.filter((s) => s.kind === "github").length,
      imports: atlas.memoryDocs.length,
      snapshots: atlas.snapshots.length,
      workflows: atlas.workflowNodes.length,
      pinnedDeliverables: atlas.pinnedDeliverables.length,
      inboxItems: atlas.inbox.length
    },
    runtime: {
      engines: brain.engines.map((e) => e.kind),
      sources: brain.memorySources.map((s) => ({
        kind: s.kind,
        label: s.label,
        state: s.state
      })),
      templates: 0
    },
    morningBrief: readMorningBrief()
  };
}

const OPERATOR_MODE_KEY = "promptready-os.operator-mode";
function readOperatorTier(): string {
  if (typeof window === "undefined") return "Solo";
  try {
    const raw = window.localStorage.getItem(OPERATOR_MODE_KEY);
    if (raw === "team") return "Team";
    if (raw === "agency") return "Agency";
    if (raw === "enterprise") return "Enterprise";
    return "Solo";
  } catch {
    return "Solo";
  }
}

export function BrainPassportCard() {
  const [flash, setFlash] = useState<string | null>(null);
  const onExport = () => {
    const passport = build();
    const blob = new Blob([JSON.stringify(passport, null, 2)], {
      type: "application/json"
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
    const filename = `atlas-passport-${stamp}.brain`;
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    auditLog("snapshot.export", { kind: "passport", filename });
    setFlash(`exported ${filename}`);
    window.setTimeout(() => setFlash(null), 4000);
  };

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <header className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-accent" />
          <span className="text-[13px] font-semibold text-white">Brain Passport</span>
        </div>
        <span className="font-mono text-[9.5px] uppercase tracking-wider text-white/45">
          export only · restore lives in Snapshots
        </span>
      </header>

      <p className="text-[11.5px] text-white/65">
        Portable identity file · operator tier · brain · mode · age ·
        maturity · counters · runtime state · today's morning brief.
        Drops as <span className="font-mono text-accent">atlas-passport-YYYYMMDD-HHMM.brain</span>{" "}
        in your downloads. Local only · nothing transmitted.
      </p>

      <ul className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
        {[
          "operator",
          "brain",
          "mode",
          "health",
          "receipts",
          "repos",
          "imports",
          "runtime state"
        ].map((k) => (
          <li
            key={k}
            className="rounded-md border border-white/8 bg-white/[0.012] px-2 py-1 font-mono text-[10.5px] uppercase tracking-wider text-white/55"
          >
            ·  {k}
          </li>
        ))}
      </ul>

      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={onExport}
          className="inline-flex items-center gap-1.5 rounded-md bg-accent/90 px-3 py-1.5 text-[12px] font-semibold text-white shadow-glow transition hover:bg-accent"
        >
          <Download className="h-3.5 w-3.5" /> Export Passport
        </button>
        {flash && (
          <span className="font-mono text-[10px] uppercase tracking-wider text-accent">
            {flash}
          </span>
        )}
      </div>
    </section>
  );
}
