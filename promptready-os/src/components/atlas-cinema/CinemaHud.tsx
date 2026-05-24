"use client";

import clsx from "clsx";
import type { CinemaScene } from "./cinemaAdapter";

interface Props {
  scene: CinemaScene;
  presentation: boolean;
  onTogglePresentation(): void;
  currentScene: string;
}

export function CinemaHud({
  scene,
  presentation,
  onTogglePresentation,
  currentScene
}: Props) {
  return (
    <div
      className={clsx("cinema-hud pointer-events-none", presentation && "cinema-hud-hidden")}
      aria-hidden={presentation}
    >
      {/* top strip */}
      <div className="absolute left-2 right-2 top-2 z-[20] flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md bg-black/30 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-white/55 backdrop-blur-md">
        <span className="text-accent">ATLAS · CINEMA</span>
        <span>· live {scene.coreState.liveN}</span>
        <span>· stale {scene.coreState.staleN}</span>
        <span>· offline {scene.coreState.offlineN}</span>
        <span>· mission {scene.hudTop.activeMission ? "Y" : "N"}</span>
        <span>· telegram {scene.hudTop.telegram}</span>
        <span>· ollama {scene.hudTop.ollama}</span>
        <span>· markets {scene.hudTop.markets}</span>
      </div>

      {/* left rail */}
      <div className="absolute left-3 top-12 z-[20] flex w-[140px] flex-col gap-1 rounded-md bg-black/25 px-2 py-1.5 font-mono text-[9.5px] uppercase tracking-wider text-white/55 opacity-70">
        <span>memory · {scene.hudLeft.memory}</span>
        <span>sources · {scene.hudLeft.sources}</span>
        <span>missions today · {scene.hudLeft.missionsToday}</span>
        <span>receipts · {scene.hudLeft.receipts}</span>
        <span>agents · {scene.hudLeft.agents}</span>
        <span>workflows · {scene.hudLeft.workflows}</span>
      </div>

      {/* bottom strip */}
      <div className="absolute bottom-2 left-2 right-2 z-[20] flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-md bg-black/30 px-3 py-1 font-mono text-[9px] uppercase tracking-wider text-white/45 backdrop-blur-md">
        <span>
          <span className="text-white/70">keys</span> · g b o l c · f
        </span>
        <span>scene · {currentScene}</span>
        <span
          className="rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5 text-white/35"
          title="gesture · planned"
        >
          gesture unavailable · mouse mode active · webcam planned
        </span>
        <button
          type="button"
          onClick={onTogglePresentation}
          className={clsx(
            "pointer-events-auto rounded border px-1.5 py-0.5 transition",
            presentation
              ? "border-accent/40 bg-accent/[0.1] text-accent"
              : "border-white/10 bg-white/[0.03] text-white/65 hover:bg-white/[0.06]"
          )}
        >
          presentation · {presentation ? "on" : "off"}
        </button>
      </div>
    </div>
  );
}
