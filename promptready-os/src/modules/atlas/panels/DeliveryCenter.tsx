"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import { Copy, Download, Pin, PinOff, Rocket, X } from "lucide-react";
import { useMissionStore } from "@/store/mission";
import { useAtlasStore } from "@/store/atlas";
import { CodeOperatorActions } from "@/components/CodeOperatorActions";
import type { Deliverable } from "@/services/missionRunner";

/**
 * Delivery Center · inside Atlas Delivery Layer detail.
 *
 * Lists every deliverable across all archived receipts. Per row:
 *   · Copy        · clipboard
 *   · Download    · blob save
 *   · Pin / Unpin · Atlas pinned set
 *   · Send to mission · pre-fills a follow-up brief that quotes the
 *                       deliverable's first 240 chars
 */

interface Row extends Deliverable {
  missionId: string;
  ts: number;
  engine?: string;
  model?: string;
  score?: number;
  elapsedMs?: number;
}

export function DeliveryCenter({ onClose }: { onClose: () => void }) {
  const history = useMissionStore((s) => s.history);
  const dispatch = useMissionStore((s) => s.dispatch);
  const pinned = useAtlasStore((s) => s.pinnedDeliverables);
  const togglePin = useAtlasStore((s) => s.togglePin);
  const [filter, setFilter] = useState<"all" | "pinned" | "markdown" | "shell">("all");

  const rows = useMemo<Row[]>(
    () =>
      history.flatMap((m) =>
        m.deliverables.map((d) => ({
          ...d,
          missionId: m.id,
          ts: m.startedAt,
          engine: m.engine ?? "deterministic",
          model: m.model,
          score: m.score,
          elapsedMs: m.elapsedMs
        }))
      ),
    [history]
  );

  const filtered = useMemo(() => {
    if (filter === "all") return rows;
    if (filter === "pinned") return rows.filter((r) => pinned.includes(r.id));
    return rows.filter((r) => r.format === filter);
  }, [rows, filter, pinned]);

  const onCopy = (r: Row) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      void navigator.clipboard.writeText(r.content);
    }
  };
  const onDownload = (r: Row) => {
    if (typeof window === "undefined") return;
    const ext = r.format === "shell" ? "sh" : r.format === "json" ? "json" : r.format === "markdown" ? "md" : "txt";
    const blob = new Blob([r.content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${r.label.toLowerCase().replace(/\s+/g, "-")}.${ext}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const onSendToMission = (r: Row) => {
    const quoted = r.content.replace(/\n+/g, "\n").slice(0, 240);
    void dispatch(
      `Iterate on this ${r.label}:\n\n"""\n${quoted}\n"""\n\nProduce a refined version.`,
      "auto",
      "fast",
      null
    );
    onClose();
  };

  return (
    <div className="flex flex-col gap-2">
      <header className="flex items-center justify-between">
        <span className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-accent">
          delivery center · {rows.length} artifact{rows.length === 1 ? "" : "s"}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-0.5 text-white/55 hover:bg-white/[0.06] hover:text-white"
        >
          <X className="h-3 w-3" />
        </button>
      </header>

      <nav className="flex items-center gap-1">
        {(["all", "pinned", "markdown", "shell"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={clsx(
              "rounded-md border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider transition",
              filter === f
                ? "border-accent/40 bg-accent/[0.08] text-accent"
                : "border-white/10 bg-white/[0.03] text-white/65 hover:bg-white/[0.06]"
            )}
          >
            {f}
          </button>
        ))}
      </nav>

      {filtered.length === 0 ? (
        <p className="rounded-md border border-dashed border-white/10 bg-white/[0.008] p-3 text-[11px] text-white/55">
          {rows.length === 0
            ? "No deliverables yet. Dispatch a mission to produce some."
            : "No deliverables match this filter."}
        </p>
      ) : (
        <ul className="flex max-h-[440px] flex-col gap-2 overflow-auto pr-1">
          {filtered.map((r) => (
            <li
              key={`${r.missionId}-${r.id}`}
              className="overflow-hidden rounded-md border border-white/10 bg-black/30"
            >
              {/* Title bar · terminal report header */}
              <header className="flex items-center justify-between gap-2 border-b border-white/8 bg-white/[0.02] px-2 py-1">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="rounded border border-accent/30 bg-accent/[0.08] px-1 py-px font-mono text-[8.5px] uppercase tracking-[0.22em] text-accent">
                    {r.format}
                  </span>
                  <span className="truncate font-mono text-[12px] font-semibold text-white">
                    {r.label}
                  </span>
                </div>
                <span className="shrink-0 font-mono text-[9px] uppercase tracking-wider text-white/40">
                  {r.missionId}
                </span>
              </header>

              {/* Preview · 2-line snippet */}
              <pre className="line-clamp-2 max-h-[40px] overflow-hidden px-2 py-1 font-mono text-[10.5px] leading-snug text-white/65">
                {r.content.slice(0, 220)}
              </pre>

              {/* Actions row · Send-To + Copy / Download / Pin / Iterate */}
              <div className="flex flex-wrap items-center justify-between gap-1 border-t border-white/6 bg-white/[0.012] px-2 py-1">
                <CodeOperatorActions label={r.label} content={r.content} />
                <div className="flex items-center gap-1">
                  <IconBtn label="Copy" onClick={() => onCopy(r)} Icon={Copy} />
                  <IconBtn label="Download" onClick={() => onDownload(r)} Icon={Download} />
                  <IconBtn
                    label={pinned.includes(r.id) ? "Unpin" : "Pin"}
                    onClick={() => togglePin(r.id)}
                    Icon={pinned.includes(r.id) ? PinOff : Pin}
                    active={pinned.includes(r.id)}
                  />
                  <IconBtn label="Iterate" onClick={() => onSendToMission(r)} Icon={Rocket} accent />
                </div>
              </div>

              {/* Footer · engine · model · latency · score · time */}
              <footer className="grid grid-cols-2 gap-x-3 gap-y-0.5 border-t border-white/6 px-2 py-1 font-mono text-[9.5px] sm:grid-cols-5">
                <MetaCell k="engine" v={r.engine ?? "—"} />
                <MetaCell k="model" v={r.model ?? "—"} />
                <MetaCell k="latency" v={r.elapsedMs ? `${r.elapsedMs}ms` : "—"} />
                <MetaCell k="score" v={r.score != null ? `${r.score}/100` : "—"} />
                <MetaCell k="time" v={new Date(r.ts).toLocaleTimeString()} />
              </footer>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function IconBtn({
  label,
  onClick,
  Icon,
  accent,
  active
}: {
  label: string;
  onClick: () => void;
  Icon: typeof Copy;
  accent?: boolean;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className={clsx(
        "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider transition",
        accent
          ? "border-accent/40 bg-accent/[0.1] text-accent hover:bg-accent/[0.15]"
          : active
            ? "border-emerald-400/30 bg-emerald-500/[0.08] text-emerald-200"
            : "border-white/10 bg-white/[0.03] text-white/65 hover:bg-white/[0.06]"
      )}
    >
      <Icon className="h-2.5 w-2.5" />
      {label}
    </button>
  );
}

function MetaCell({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center gap-1.5 overflow-hidden">
      <span className="uppercase tracking-[0.18em] text-white/35">{k}</span>
      <span className="truncate text-white/65">{v}</span>
    </div>
  );
}
