"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import type { CinemaOrbitData, OrbitTone } from "./cinemaAdapter";

interface Props {
  orbits: CinemaOrbitData[];
  selectedId: string | null;
  onSelect(id: string | null): void;
}

const TONE_CHIP: Record<OrbitTone, string> = {
  live: "border-emerald-400/30 bg-emerald-500/[0.08] text-emerald-200",
  active: "border-accent/40 bg-accent/[0.1] text-accent",
  pending: "border-amber-400/35 bg-amber-500/[0.08] text-amber-200",
  stale: "border-amber-400/25 bg-amber-500/[0.05] text-amber-200/70",
  offline: "border-white/10 bg-white/[0.03] text-white/55",
  planned: "border-white/8 bg-white/[0.02] text-white/45"
};

const TONE_RING: Record<OrbitTone, string> = {
  live: "ring-emerald-400/30 shadow-[0_0_18px_-4px_rgba(52,211,153,0.45)]",
  active: "ring-accent/40 shadow-glow",
  pending: "ring-amber-400/30",
  stale: "ring-amber-400/20",
  offline: "ring-white/8",
  planned: "ring-white/6"
};

function useOrbitRadius(): number {
  const compute = () =>
    Math.min(
      380,
      Math.max(220, Math.floor(Math.min(window.innerWidth, window.innerHeight) * 0.32))
    );
  const [r, setR] = useState(() => (typeof window === "undefined" ? 300 : compute()));
  useEffect(() => {
    let rafId = 0;
    const onResize = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => setR(compute()));
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafId);
    };
  }, []);
  return r;
}

export function CinemaOrbit({ orbits, selectedId, onSelect }: Props) {
  const radius = useOrbitRadius();
  const positions = useMemo(() => {
    return orbits.map((_, i) => {
      const angle = (i / orbits.length) * Math.PI * 2 - Math.PI / 2;
      return {
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius
      };
    });
  }, [orbits.length, radius]);

  return (
    <>
      {/* visible orbit ring */}
      <span
        aria-hidden
        className="cinema-orbit-ring absolute left-1/2 top-1/2 z-[8] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          width: radius * 2,
          height: radius * 2,
          border: "1px dashed rgba(255,255,255,0.10)"
        }}
      />
      {orbits.map((o, i) => {
        const p = positions[i];
        const selected = o.id === selectedId;
        return (
          <button
            type="button"
            key={o.id}
            data-orbit-id={o.id}
            onClick={() => onSelect(selected ? null : o.id)}
            className={clsx(
              "cinema-orbit absolute z-[10] flex flex-col gap-1 rounded-2xl border border-white/15 bg-[rgba(10,12,18,0.65)] p-2 text-left backdrop-blur-md transition hover:scale-105",
              selected && `ring-2 scale-110 ${TONE_RING[o.tone]}`
            )}
            style={{
              width: 120,
              left: "50%",
              top: "50%",
              transform: `translate(calc(-50% + ${p.x}px), calc(-50% + ${p.y}px))`,
              opacity: o.tone === "offline" || o.tone === "planned" ? 0.6 : 1
            }}
            aria-label={`${o.label} · ${o.tone}`}
          >
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/55">
              {o.label}
            </span>
            <span className="font-mono text-[12.5px] tabular-nums text-white/90">
              {o.value}
            </span>
            <span
              className={clsx(
                "self-start rounded border px-1 py-px font-mono text-[8.5px] uppercase tracking-wider",
                TONE_CHIP[o.tone]
              )}
            >
              {o.tone}
            </span>
          </button>
        );
      })}
    </>
  );
}

export { useOrbitRadius };
