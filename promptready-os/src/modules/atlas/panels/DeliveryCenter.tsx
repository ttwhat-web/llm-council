"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import { Copy, Download, Pin, PinOff, Rocket, X } from "lucide-react";
import { useMissionStore } from "@/store/mission";
import { useAtlasStore } from "@/store/atlas";
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
        m.deliverables.map((d) => ({ ...d, missionId: m.id, ts: m.startedAt }))
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
        <ul className="flex max-h-[280px] flex-col gap-1 overflow-auto pr-1">
          {filtered.map((r) => (
            <li
              key={`${r.missionId}-${r.id}`}
              className="rounded-md border border-white/8 bg-white/[0.012] px-2 py-1.5"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-[12px] font-semibold text-white">
                    {r.label}
                  </span>
                  <span className="text-[10px] text-white/45">{r.blurb}</span>
                </div>
                <span className="shrink-0 rounded border border-white/10 bg-white/[0.03] px-1 py-px font-mono text-[9px] uppercase tracking-wider text-white/55">
                  {r.format}
                </span>
              </div>
              <div className="mt-1 flex items-center justify-end gap-1">
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
