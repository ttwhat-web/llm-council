"use client";

import clsx from "clsx";

interface Props {
  liveN: number;
  staleN: number;
  offlineN: number;
  demo: boolean;
  identityNull: boolean;
  brainName: string | null;
  selected: boolean;
  onSelect(): void;
}

export function CinemaCore({
  liveN,
  staleN,
  offlineN,
  demo,
  identityNull,
  brainName,
  selected,
  onSelect
}: Props) {
  const empty = identityNull;
  const diameter = empty ? 280 : 240;
  const anyLive = liveN > 0;
  const statusLine = empty
    ? "no brain · open the bootstrap to begin"
    : `${liveN} live · ${staleN} stale · ${offlineN} offline${demo ? " · demo" : ""}`;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label="Atlas core"
      className={clsx(
        "cinema-core absolute left-1/2 top-1/2 z-[12] flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full transition",
        selected && "cinema-core-selected"
      )}
      style={{ width: diameter, height: diameter }}
    >
      {/* outer ambient ring */}
      <span
        aria-hidden
        className="cinema-core-outer absolute inset-0 rounded-full"
        style={{ border: "1.5px solid rgba(124,155,255,0.35)" }}
      />
      {/* mid breath ring */}
      <span
        aria-hidden
        className={clsx(
          "absolute rounded-full",
          empty ? "cinema-breath-slow" : "cinema-breath"
        )}
        style={{
          width: empty ? 200 : 180,
          height: empty ? 200 : 180,
          border: "1.5px solid rgba(124,155,255,0.55)"
        }}
      />
      {/* inner core sphere */}
      <span
        aria-hidden
        className="cinema-core-inner absolute rounded-full"
        style={{
          width: 72,
          height: 72,
          background:
            "radial-gradient(circle, var(--pr-color-accent, #7c9bff) 0%, #02040a 70%)",
          boxShadow: anyLive
            ? "0 0 32px 4px rgba(124,155,255,0.45)"
            : "0 0 20px 2px rgba(124,155,255,0.22)"
        }}
      />
      {/* label + status */}
      <span className="relative z-[1] flex flex-col items-center gap-1">
        <span className="font-mono text-[11px] uppercase tracking-[0.28em] text-white/85 drop-shadow-[0_0_6px_rgba(124,155,255,0.35)]">
          {brainName ?? "ATLAS"}
        </span>
        <span className="font-mono text-[9px] uppercase tracking-wider text-white/55">
          {statusLine}
        </span>
      </span>
    </button>
  );
}
