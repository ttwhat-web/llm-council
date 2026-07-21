"use client";

import { useCallback, useEffect, useState } from "react";
import clsx from "clsx";
import {
  CheckCircle2,
  ChevronRight,
  Circle,
  Copy,
  Loader2,
  ListChecks,
  Play,
  RefreshCw,
  Rocket
} from "lucide-react";
import {
  runReadinessChecks,
  type ReadinessReport,
  type CheckResult,
  type CheckAction
} from "@/services/setupReadiness";
import { downloadSnapshot } from "@/services/snapshot";
import { downloadDiagnostics } from "@/services/diagnostics";
import { useBrainStore } from "@/store/brain";
import { useMissionStore } from "@/store/mission";
import { useAtlasStore } from "@/store/atlas";

/**
 * Setup wizard · Phase 19 launch readiness.
 *
 * Runs real checks against local state and gives the operator a single
 * place to fix what's missing. No fake green checks.
 */

export function SetupWizard() {
  const [report, setReport] = useState<ReadinessReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionFlash, setActionFlash] = useState<string | null>(null);
  const dispatch = useMissionStore((s) => s.dispatch);
  const generateTelegramLink = useAtlasStore((s) => s.generateTelegramLink);

  const run = useCallback(async () => {
    setBusy(true);
    try {
      const r = await runReadinessChecks();
      setReport(r);
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void run();
  }, [run]);

  const onAction = async (action: CheckAction) => {
    setActionFlash(null);
    switch (action.kind) {
      case "run-test-mission": {
        await dispatch(
          "Diagnostic: confirm the deterministic engine returns deliverables. Reply with a 3-bullet summary of what just happened.",
          "auto",
          "fast",
          null
        );
        setActionFlash("test mission dispatched");
        break;
      }
      case "create-snapshot": {
        downloadSnapshot("setup-wizard");
        setActionFlash("snapshot downloaded · also kept in memory");
        break;
      }
      case "export-diagnostics": {
        downloadDiagnostics();
        setActionFlash("diagnostics.md downloaded");
        break;
      }
      case "copy-ollama-pull": {
        if (action.payload && navigator?.clipboard) {
          await navigator.clipboard.writeText(action.payload);
          setActionFlash(`copied · ${action.payload}`);
        }
        break;
      }
      case "create-demo-brain": {
        useBrainStore.getState().enableDemo();
        setActionFlash("demo brain enabled");
        break;
      }
      case "generate-telegram-code": {
        const code = generateTelegramLink();
        setActionFlash(`telegram code · ${code}`);
        break;
      }
      case "open-bootstrap": {
        useBrainStore.getState().reset();
        setActionFlash("brain reset · welcome flow will appear on next view");
        break;
      }
      case "open-settings": {
        setActionFlash("you're already in Settings");
        break;
      }
    }
    window.setTimeout(() => setActionFlash(null), 4000);
    void run();
  };

  const scoreTone =
    !report || report.state === "blocked"
      ? "text-rose-300"
      : report.state === "partial"
        ? "text-amber-300"
        : "text-emerald-300";

  return (
    <section className="rounded-2xl border border-accent/25 bg-accent/[0.04] p-4 shadow-glow">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ListChecks className="h-4 w-4 text-accent" />
          <span className="text-[13px] font-semibold text-white">Setup wizard</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={clsx("font-mono text-[14px] font-semibold", scoreTone)}>
            {report ? `${report.score}/100` : "…"}
          </span>
          {report && (
            <span
              className={clsx(
                "rounded border px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider",
                report.state === "ok"
                  ? "border-emerald-400/30 bg-emerald-500/[0.08] text-emerald-200"
                  : report.state === "partial"
                    ? "border-amber-400/30 bg-amber-500/[0.08] text-amber-200"
                    : "border-rose-400/30 bg-rose-500/[0.08] text-rose-200"
              )}
            >
              {report.state}
            </span>
          )}
          <button
            type="button"
            onClick={() => void run()}
            disabled={busy}
            className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-white/65 hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
            recheck
          </button>
        </div>
      </header>

      <p className="mt-1 text-[11px] text-white/55">
        Probes real local state. Unknown checks (e.g. the desktop runtime
        when running in a browser) don't lower the score.
      </p>

      {actionFlash && (
        <p className="mt-2 rounded-md border border-accent/30 bg-accent/[0.08] px-2 py-1 font-mono text-[10.5px] uppercase tracking-wider text-accent">
          {actionFlash}
        </p>
      )}

      <ul className="mt-3 flex flex-col gap-1">
        {report?.results.map((c) => (
          <CheckRow key={c.id} check={c} onAction={onAction} />
        ))}
      </ul>
    </section>
  );
}

function CheckRow({
  check,
  onAction
}: {
  check: CheckResult;
  onAction: (a: CheckAction) => void;
}) {
  const Icon =
    check.state === "ok"
      ? CheckCircle2
      : check.state === "partial"
        ? ChevronRight
        : check.state === "unknown"
          ? Circle
          : Circle;
  const tone =
    check.state === "ok"
      ? "text-emerald-300/85"
      : check.state === "partial"
        ? "text-amber-300/85"
        : check.state === "unknown"
          ? "text-white/40"
          : "text-rose-300/85";
  return (
    <li className="flex items-start justify-between gap-2 rounded-md border border-white/8 bg-white/[0.012] px-2 py-1.5">
      <div className="flex min-w-0 items-start gap-2">
        <Icon className={clsx("mt-0.5 h-3.5 w-3.5 shrink-0", tone)} />
        <div className="flex min-w-0 flex-col">
          <span className="text-[12px] text-white">{check.label}</span>
          <span className="text-[10.5px] text-white/55">{check.detail}</span>
        </div>
      </div>
      {check.action && (
        <button
          type="button"
          onClick={() => onAction(check.action!)}
          className="inline-flex shrink-0 items-center gap-1 rounded-md border border-white/10 bg-white/[0.03] px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider text-white/75 hover:bg-white/[0.06]"
        >
          {check.action.kind === "run-test-mission" && <Play className="h-2.5 w-2.5 text-accent" />}
          {check.action.kind === "copy-ollama-pull" && <Copy className="h-2.5 w-2.5 text-accent" />}
          {check.action.kind === "create-snapshot" && <Rocket className="h-2.5 w-2.5 text-accent" />}
          {check.action.label}
        </button>
      )}
    </li>
  );
}
