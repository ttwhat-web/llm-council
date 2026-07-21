"use client";

import clsx from "clsx";
import { Check, Rocket } from "lucide-react";
import { useBrainStore } from "@/store/brain";
import { useMissionStore } from "@/store/mission";
import { useAtlasStore } from "@/store/atlas";
import { listInstalledPacks } from "@/services/marketplace";
import { getTelegramBridgeStatus } from "@/services/telegramLive";

/**
 * Founder Beta · honest progress card.
 *
 * Eight founder milestones, each marked done STRICTLY from real local
 * state — store slices, the installed-packs registry, the Telegram
 * bridge status, and a handful of localStorage flags. Nothing is faked
 * and nothing is rewarded: this is pure n/8 progress. An item only
 * completes when its real condition is true.
 */

interface Item {
  label: string;
  hint: string;
  done: boolean;
}

export function FounderBetaCard() {
  const identity = useBrainStore((s) => s.identity);
  const history = useMissionStore((s) => s.history);
  const snapshots = useAtlasStore((s) => s.snapshots);

  const items: Item[] = [
    {
      label: "Brain created",
      hint: "identity wired",
      done: identity != null
    },
    {
      label: "Mission executed",
      hint: "first dispatch",
      done: history.length > 0
    },
    {
      label: "Receipt created",
      hint: "deliverable shipped",
      done: history.some((r) => r.deliverables.length > 0)
    },
    {
      label: "Replay tested",
      hint: "receipt replayed",
      done: readFlag("promptready-os.replay.tested")
    },
    {
      label: "Passport exported",
      hint: "snapshot · export",
      done: snapshots.length > 0 || readFlag("promptready-os.passport.exported")
    },
    {
      label: "Telegram tested",
      hint: "real send round-trip",
      done: getTelegramBridgeStatus().lastSendAt != null
    },
    {
      label: "Marketplace installed",
      hint: "operator pack",
      done: listInstalledPacks().length > 0
    },
    {
      label: "Model validated",
      hint: "model lab results",
      done: readNonEmptyArray("promptready-os.model-lab.results")
    }
  ];

  const doneCount = items.filter((i) => i.done).length;
  const allDone = doneCount === items.length;
  const pct = (doneCount / items.length) * 100;

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Rocket className="h-4 w-4 text-accent" />
          <span className="text-[13px] font-semibold text-white">Founder Beta</span>
        </div>
        <span
          className={clsx(
            "rounded border px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider",
            allDone
              ? "border-emerald-400/30 bg-emerald-500/[0.08] text-emerald-200"
              : "border-accent/30 bg-accent/[0.06] text-accent"
          )}
        >
          {doneCount} / {items.length}
        </span>
      </header>

      <div className="h-1.5 overflow-hidden rounded bg-white/10">
        <div
          className={clsx("h-full rounded", allDone ? "bg-emerald-400" : "bg-accent")}
          style={{ width: `${pct}%` }}
        />
      </div>

      {allDone && (
        <p className="font-mono text-[10px] uppercase tracking-wider text-emerald-200">
          Founder beta complete · every milestone is real.
        </p>
      )}

      <ol className="flex flex-col gap-1.5">
        {items.map((item) => (
          <li
            key={item.label}
            className={clsx(
              "flex items-center gap-3 rounded-xl border p-2.5",
              item.done
                ? "border-emerald-400/20 bg-emerald-500/[0.04]"
                : "border-white/8 bg-white/[0.02]"
            )}
          >
            <span
              className={clsx(
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border",
                item.done
                  ? "border-emerald-400/40 bg-emerald-500/[0.1] text-emerald-200"
                  : "border-white/10 bg-white/[0.02] text-white/30"
              )}
            >
              {item.done ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <span className="h-1.5 w-1.5 rounded-full bg-white/30" />
              )}
            </span>

            <div className="flex min-w-0 flex-col">
              <span
                className={clsx(
                  "text-[12.5px] font-semibold",
                  item.done ? "text-white/45 line-through" : "text-white"
                )}
              >
                {item.label}
              </span>
              <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-white/40">
                {item.hint}
              </span>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function readFlag(key: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(key) === "true";
  } catch {
    return false;
  }
}

function readNonEmptyArray(key: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) && parsed.length > 0;
  } catch {
    return false;
  }
}
