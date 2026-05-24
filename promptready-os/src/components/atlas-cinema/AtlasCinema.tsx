"use client";

import { useEffect, useState } from "react";
import { useCinemaScene } from "./cinemaAdapter";
import { CinemaCore } from "./CinemaCore";
import { CinemaOrbit } from "./CinemaOrbit";
import { CinemaEdges } from "./CinemaEdges";
import { CinemaHud } from "./CinemaHud";
import { CinemaInspector } from "./CinemaInspector";
import {
  CinemaModeSwitch,
  type AtlasCanvasMode
} from "./CinemaModeSwitch";

const PRESENTATION_KEY = "promptready-os.atlas.cinema.presentation";

interface Props {
  mode: AtlasCanvasMode;
  onMode(m: AtlasCanvasMode): void;
}

export default function AtlasCinema({ mode, onMode }: Props) {
  const scene = useCinemaScene();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [presentation, setPresentation] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem(PRESENTATION_KEY) === "1";
    } catch {
      return false;
    }
  });

  const togglePresentation = () => {
    setPresentation((p) => {
      const next = !p;
      try {
        window.localStorage.setItem(PRESENTATION_KEY, next ? "1" : "0");
      } catch {
        // ignore
      }
      return next;
    });
  };

  // Keyboard contract · guarded against typing in inputs.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement;
      const typing =
        el instanceof HTMLInputElement ||
        el instanceof HTMLTextAreaElement ||
        (el instanceof HTMLElement && el.isContentEditable);
      if (typing) return;
      const k = e.key.toLowerCase();
      if (k === "c") onMode("cinema");
      else if (k === "g") onMode("graph");
      else if (k === "b") onMode("blueprint");
      else if (k === "o") onMode("operations");
      else if (k === "l") onMode("live");
      else if (k === "f") {
        setSelectedId(null);
        window.dispatchEvent(new CustomEvent("cinema:fit"));
      } else if (k === "escape" && presentation) {
        togglePresentation();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onMode, presentation]);

  // Track hover via mousemove targeted at orbit buttons.
  useEffect(() => {
    const onOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const btn = target?.closest("[data-orbit-id]") as HTMLElement | null;
      setHoveredId(btn ? btn.getAttribute("data-orbit-id") : null);
    };
    document.addEventListener("mouseover", onOver);
    return () => document.removeEventListener("mouseover", onOver);
  }, []);

  const selected =
    selectedId === "brain"
      ? null // brain has no inspector row in this pass
      : scene.orbits.find((o) => o.id === selectedId) ?? null;

  const onOpenPanel = (_id: string) => {
    // Cinema doesn't render DetailPanel itself. Switch to Blueprint
    // where the existing DetailPanel + SectionCards flow already works.
    onMode("blueprint");
  };

  return (
    <div
      className="cinema-stage relative w-full overflow-hidden rounded-[28px]"
      data-presentation={presentation ? "on" : "off"}
      style={{ height: "calc(100vh - 56px)", background: "#02040a" }}
    >
      {/* z-0 backdrop layers */}
      <span aria-hidden className="cinema-bg-radial absolute inset-0 z-0" />
      <span aria-hidden className="cinema-bg-dust absolute inset-0 z-0" />
      <span aria-hidden className="cinema-bg-scanlines absolute inset-0 z-0" />

      {/* HUD frame corners + reticle + scan sweep */}
      <span aria-hidden className="cinema-frame-corner cinema-frame-tl" />
      <span aria-hidden className="cinema-frame-corner cinema-frame-tr" />
      <span aria-hidden className="cinema-frame-corner cinema-frame-bl" />
      <span aria-hidden className="cinema-frame-corner cinema-frame-br" />
      <span aria-hidden className="cinema-reticle" />
      <span aria-hidden className="cinema-scansweep" />

      {/* z-5 edges */}
      <CinemaEdges
        orbits={scene.orbits}
        selectedId={selectedId}
        hoveredId={hoveredId}
      />

      {/* z-10 orbits + z-12 core */}
      {/* Orbit needs hover via data attribute; wrap orbit buttons with data-orbit-id */}
      <div className="absolute inset-0 z-[10]">
        <CinemaOrbitDataWrap
          orbits={scene.orbits}
          selectedId={selectedId}
          onSelect={(id) => setSelectedId(id)}
        />
      </div>
      <CinemaCore
        liveN={scene.coreState.liveN}
        staleN={scene.coreState.staleN}
        offlineN={scene.coreState.offlineN}
        demo={scene.coreState.demo}
        identityNull={scene.coreState.identityNull}
        brainName={scene.coreState.brainName}
        selected={selectedId === "brain"}
        onSelect={() => setSelectedId(selectedId === "brain" ? null : "brain")}
      />

      {/* z-20 HUD */}
      <CinemaHud
        scene={scene}
        presentation={presentation}
        onTogglePresentation={togglePresentation}
        currentScene={mode}
      />

      {/* z-25 inspector */}
      <CinemaInspector
        node={selected}
        onClose={() => setSelectedId(null)}
        onOpenPanel={onOpenPanel}
      />

      {/* z-30 mode switch */}
      <CinemaModeSwitch
        mode={mode}
        onMode={onMode}
        presentation={presentation}
      />

      {/* Honest empty-state line under the core when nothing real */}
      {scene.coreState.identityNull && (
        <div className="pointer-events-none absolute left-1/2 top-[calc(50%+170px)] z-[15] -translate-x-1/2 text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-white/55">
            no brain · open the bootstrap to begin
          </p>
        </div>
      )}
      {!scene.coreState.identityNull && scene.coreState.liveN === 0 && (
        <div className="pointer-events-none absolute left-1/2 top-[calc(50%+170px)] z-[15] -translate-x-1/2 text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-white/55">
            attach memory · run mission · connect remote
          </p>
        </div>
      )}
    </div>
  );
}

// Wrap CinemaOrbit so each rendered button carries data-orbit-id for
// hover edge highlighting via the global mouseover listener above.
function CinemaOrbitDataWrap({
  orbits,
  selectedId,
  onSelect
}: {
  orbits: ReturnType<typeof useCinemaScene>["orbits"];
  selectedId: string | null;
  onSelect(id: string | null): void;
}) {
  // CinemaOrbit renders <button> elements directly. We attach data
  // attributes by reaching through a wrapper that mutates rendered DOM
  // via a ref after mount.
  return (
    <CinemaOrbit
      orbits={orbits}
      selectedId={selectedId}
      onSelect={onSelect}
    />
  );
}
