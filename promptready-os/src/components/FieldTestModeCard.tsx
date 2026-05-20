"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { FlaskConical } from "lucide-react";
import { useMissionStore } from "@/store/mission";
import { adapterSummary } from "@/services/adapters";
import { readPresence, type PresenceSnapshot } from "@/services/presence";
import { fieldLog, isFieldTestMode, setFieldTestMode } from "@/services/fieldTest";

/**
 * Field Test Mode card · Sprint D · Section G.
 *
 * A single local toggle that surfaces extra debug panels. HARD HONESTY:
 * this is read-only. It never mutates a store, never fakes a number, and
 * never changes runtime behavior — only logging + the panels below.
 */

export function FieldTestModeCard() {
  const [on, setOn] = useState(false);
  const history = useMissionStore((s) => s.history);
  const [presence, setPresence] = useState<PresenceSnapshot | null>(null);

  useEffect(() => {
    setOn(isFieldTestMode());
  }, []);

  useEffect(() => {
    if (!on) {
      setPresence(null);
      return;
    }
    setPresence(readPresence());
    const t = window.setInterval(() => setPresence(readPresence()), 3000);
    return () => window.clearInterval(t);
  }, [on]);

  const toggle = () => {
    const next = !on;
    setFieldTestMode(next);
    setOn(next);
    fieldLog("mode", next);
  };

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <FlaskConical className="h-4 w-4 text-accent" />
          <span className="text-[13px] font-semibold text-white">Field Test Mode</span>
        </div>
        <button
          type="button"
          onClick={toggle}
          className={clsx(
            "rounded border px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider transition-colors",
            on
              ? "border-emerald-400/30 bg-emerald-500/[0.08] text-emerald-200"
              : "border-white/10 bg-white/[0.03] text-white/55"
          )}
        >
          {on ? "on" : "off"}
        </button>
      </header>

      <p className="text-[11px] text-white/55">
        Adds extra logs + debug panels. No runtime changes — nothing about mission
        execution, providers, or stores changes.
      </p>

      {on ? (
        <DebugPanel presence={presence} receipts={history} />
      ) : (
        <p className="font-mono text-[9.5px] uppercase tracking-wider text-white/40">
          off · enable to surface debug panels
        </p>
      )}
    </section>
  );
}

function DebugPanel({
  presence,
  receipts
}: {
  presence: PresenceSnapshot | null;
  receipts: ReturnType<typeof useMissionStore.getState>["history"];
}) {
  const adapters = adapterSummary();
  const last = receipts[0];
  const storage = readStorageDebug();

  return (
    <div className="flex flex-col gap-3">
      <Block title="provider diagnostics">
        <Row label="connected" value={String(adapters.connected)} />
        <Row label="ready" value={String(adapters.ready)} />
        <Row label="error" value={String(adapters.error)} />
        <Row label="offline" value={String(adapters.offline)} />
        <Row label="total" value={String(adapters.total)} />
      </Block>

      <Block title="receipt debug">
        <Row label="count" value={String(receipts.length)} />
        <Row label="last id" value={last?.id ?? "—"} />
        <Row label="engine" value={last?.engine ?? "—"} />
        <Row label="score" value={last?.score != null ? String(last.score) : "—"} />
      </Block>

      <Block title="presence debug">
        <Row label="desktop" value={presence?.desktop ?? "—"} />
        <Row label="ollama" value={presence?.ollama ?? "—"} />
        <Row label="markets" value={presence?.markets ?? "—"} />
        <Row label="news" value={presence?.news ?? "—"} />
        <Row label="telegram" value={presence?.telegram ?? "—"} />
      </Block>

      <Block title="storage debug">
        <Row label="keys" value={String(storage.keys)} />
        <Row label="approx kb" value={storage.kb.toFixed(1)} />
      </Block>
    </div>
  );
}

function readStorageDebug(): { keys: number; kb: number } {
  if (typeof window === "undefined") return { keys: 0, kb: 0 };
  try {
    const ls = window.localStorage;
    let bytes = 0;
    for (let i = 0; i < ls.length; i++) {
      const key = ls.key(i);
      if (key == null) continue;
      const value = ls.getItem(key) ?? "";
      bytes += key.length + value.length;
    }
    return { keys: ls.length, kb: bytes / 1024 };
  } catch {
    return { keys: 0, kb: 0 };
  }
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-white/8 bg-white/[0.012] p-2.5">
      <span className="font-mono text-[9px] uppercase tracking-[0.22em] text-white/45">
        {title}
      </span>
      <div className="flex flex-col gap-0.5">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 font-mono text-[10px]">
      <span className="uppercase tracking-wider text-white/40">{label}</span>
      <span className="tabular-nums text-white/80">{value}</span>
    </div>
  );
}
