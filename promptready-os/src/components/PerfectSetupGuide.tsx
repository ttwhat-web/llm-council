"use client";

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import clsx from "clsx";
import { Check, ChevronDown, ChevronUp, Compass } from "lucide-react";
import { useBrainStore } from "@/store/brain";
import { useAtlasStore } from "@/store/atlas";
import { useMissionStore } from "@/store/mission";
import { listInstalledPacks } from "@/services/marketplace";
import { probeOllama } from "@/services/missionRunner";
import { getTelegramBridgeStatus } from "@/services/telegramLive";

/**
 * Perfect Setup guide · V2.
 *
 * Ten onboarding steps, each marked done strictly from real local
 * state — store slices, the installed-packs registry, a live Ollama
 * probe, the Telegram bridge status, and actual mission receipts.
 * Nothing is faked: a step only completes when the operator has truly
 * wired that piece of the brain. Two engine steps are "optional" but
 * still count toward the honest n/10 progress. The step list collapses
 * (persisted to localStorage) without hiding the header or progress.
 */

const COLLAPSE_KEY = "promptready-os.setup-guide.collapsed";

interface Step {
  label: string;
  hint: string;
  to: string;
  done: boolean;
  optional?: boolean;
}

export function PerfectSetupGuide() {
  const identity = useBrainStore((s) => s.identity);
  const memorySources = useBrainStore((s) => s.memorySources);
  const memoryDocs = useAtlasStore((s) => s.memoryDocs);
  const telegram = useAtlasStore((s) => s.telegram);
  const snapshots = useAtlasStore((s) => s.snapshots);
  const history = useMissionStore((s) => s.history);

  const [collapsed, setCollapsed] = useState<boolean>(() => readCollapsed());

  // Live, async Ollama probe — never assumed reachable until the real
  // round-trip resolves. Same safe-unmount pattern as ModelLabCard.
  const [ollamaReachable, setOllamaReachable] = useState(false);
  const [ollamaModelCount, setOllamaModelCount] = useState(0);

  useEffect(() => {
    let alive = true;
    probeOllama()
      .then((res) => {
        if (!alive) return;
        setOllamaReachable(res.reachable);
        setOllamaModelCount(res.models.length);
      })
      .catch(() => {
        if (!alive) return;
        setOllamaReachable(false);
        setOllamaModelCount(0);
      });
    return () => {
      alive = false;
    };
  }, []);

  // Telegram counts as connected via the persisted link OR a real
  // bridge that has moved past the simulator.
  const telegramLive = getTelegramBridgeStatus().live !== "simulator";

  const steps: Step[] = [
    {
      label: "Create Brain",
      hint: "identity · mode · engines",
      to: "/",
      done: Boolean(identity)
    },
    {
      label: "Install Ollama",
      hint: "local engine · optional",
      to: "/settings",
      done: ollamaReachable,
      optional: true
    },
    {
      label: "Choose model",
      hint: "pull a model · optional",
      to: "/settings",
      done: ollamaModelCount > 0,
      optional: true
    },
    {
      label: "Import Notes",
      hint: "seed the brain",
      to: "/memory",
      done: memoryDocs.length > 0
    },
    {
      label: "Attach Repo",
      hint: "GitHub source",
      to: "/mission-control",
      done: memorySources.some((s) => s.kind === "github")
    },
    {
      label: "Install marketplace pack",
      hint: "operator brain pack",
      to: "/marketplace",
      done: listInstalledPacks().length > 0
    },
    {
      label: "Connect Telegram",
      hint: "link code · live bridge",
      to: "/settings",
      done: Boolean(telegram) || telegramLive
    },
    {
      label: "Enable replay",
      hint: "receipt with events",
      to: "/mission-control",
      done: history.some((r) => (r.events?.length ?? 0) > 0)
    },
    {
      label: "Run mission",
      hint: "first dispatch",
      to: "/mission-control",
      done: history.length > 0
    },
    {
      label: "Create passport",
      hint: "brain snapshot",
      to: "/",
      done: snapshots.length > 0
    }
  ];

  const doneCount = steps.filter((s) => s.done).length;
  const allDone = doneCount === steps.length;
  const pct = (doneCount / steps.length) * 100;

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev;
      writeCollapsed(next);
      return next;
    });
  }

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Compass className="h-4 w-4 text-accent" />
          <span className="text-[13px] font-semibold text-white">Perfect Setup</span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={clsx(
              "rounded border px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider",
              allDone
                ? "border-emerald-400/30 bg-emerald-500/[0.08] text-emerald-200"
                : "border-accent/30 bg-accent/[0.06] text-accent"
            )}
          >
            {doneCount} / {steps.length}
          </span>
          <button
            type="button"
            onClick={toggle}
            aria-label={collapsed ? "Expand steps" : "Collapse steps"}
            className="rounded-md border border-white/8 bg-white/[0.02] p-1 text-white/55 transition hover:text-white"
          >
            {collapsed ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronUp className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </header>

      <div className="h-1.5 overflow-hidden rounded bg-white/10">
        <div
          className={clsx("h-full rounded", allDone ? "bg-emerald-400" : "bg-accent")}
          style={{ width: `${pct}%` }}
        />
      </div>

      {allDone && (
        <p className="font-mono text-[10px] uppercase tracking-wider text-emerald-200">
          Setup complete · your operator brain is fully wired.
        </p>
      )}

      {!collapsed && (
        <ol className="flex flex-col gap-1.5">
          {steps.map((step, i) => (
            <li
              key={step.label}
              className={clsx(
                "flex items-center gap-3 rounded-xl border p-2.5",
                step.done
                  ? "border-emerald-400/20 bg-emerald-500/[0.04]"
                  : "border-white/8 bg-white/[0.02]"
              )}
            >
              <span
                className={clsx(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border font-mono text-[11px]",
                  step.done
                    ? "border-emerald-400/40 bg-emerald-500/[0.1] text-emerald-200"
                    : "border-accent/30 bg-accent/[0.06] text-accent"
                )}
              >
                {step.done ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </span>

              <div className="flex min-w-0 flex-col">
                <span className="flex items-center gap-1.5">
                  <span
                    className={clsx(
                      "text-[12.5px] font-semibold",
                      step.done ? "text-white/45 line-through" : "text-white"
                    )}
                  >
                    {step.label}
                  </span>
                  {step.optional && (
                    <span className="rounded border border-white/10 bg-white/[0.03] px-1 py-0.5 font-mono text-[8px] uppercase tracking-wider text-white/45">
                      optional
                    </span>
                  )}
                </span>
                <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-white/40">
                  {step.hint}
                </span>
              </div>

              <Link
                to={step.to}
                className={clsx(
                  "ml-auto shrink-0 rounded-md border px-2 py-1 font-mono text-[9.5px] uppercase tracking-wider transition",
                  step.done
                    ? "border-emerald-400/20 bg-emerald-500/[0.04] text-emerald-200/70 hover:text-emerald-200"
                    : "border-accent/30 bg-accent/[0.06] text-accent hover:bg-accent/[0.12]"
                )}
              >
                {step.done ? "done" : "open →"}
              </Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function readCollapsed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(COLLAPSE_KEY) === "true";
  } catch {
    return false;
  }
}

function writeCollapsed(value: boolean) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(COLLAPSE_KEY, String(value));
  } catch {
    // ignore
  }
}
