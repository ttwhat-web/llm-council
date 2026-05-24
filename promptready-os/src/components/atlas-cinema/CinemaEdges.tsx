"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import type { CinemaOrbitData, OrbitTone } from "./cinemaAdapter";
import { useOrbitRadius } from "./CinemaOrbit";

interface Props {
  orbits: CinemaOrbitData[];
  selectedId: string | null;
  hoveredId: string | null;
}

const TONE_CLASS: Record<OrbitTone, string> = {
  live: "cinema-edge-live cinema-edge-flow",
  active: "cinema-edge-active cinema-edge-flow",
  pending: "cinema-edge-pending",
  stale: "cinema-edge-stale",
  offline: "cinema-edge-offline",
  planned: "cinema-edge-default"
};

function useViewport(): { w: number; h: number } {
  const compute = () =>
    typeof window === "undefined"
      ? { w: 1440, h: 900 }
      : { w: window.innerWidth, h: window.innerHeight };
  const [v, setV] = useState(compute);
  useEffect(() => {
    let rafId = 0;
    const onResize = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => setV(compute()));
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafId);
    };
  }, []);
  return v;
}

export function CinemaEdges({ orbits, selectedId, hoveredId }: Props) {
  const radius = useOrbitRadius();
  const { w, h } = useViewport();
  // SVG covers the full scene; the centre is the scene centre (50%, 50%).
  const cx = w / 2;
  const cy = (h - 56) / 2; // scene height = 100vh - 56px (matching AtlasCinema)

  const lines = useMemo(() => {
    return orbits.map((o, i) => {
      const angle = (i / orbits.length) * Math.PI * 2 - Math.PI / 2;
      const x = cx + Math.cos(angle) * radius;
      const y = cy + Math.sin(angle) * radius;
      return { id: o.id, tone: o.tone, x, y };
    });
  }, [orbits, cx, cy, radius]);

  return (
    <svg
      className="cinema-edges pointer-events-none absolute inset-0 z-[5] h-full w-full"
      viewBox={`0 0 ${w} ${Math.max(1, h - 56)}`}
      preserveAspectRatio="none"
      aria-hidden
    >
      {lines.map((l) => {
        const highlight = l.id === selectedId || l.id === hoveredId;
        return (
          <line
            key={l.id}
            x1={cx}
            y1={cy}
            x2={l.x}
            y2={l.y}
            className={clsx(TONE_CLASS[l.tone], highlight && "cinema-edge-selected")}
            strokeLinecap="round"
          />
        );
      })}
    </svg>
  );
}
