"use client";

import { useEffect, useRef, useState } from "react";
import {
  Briefcase,
  Brain,
  FlaskConical,
  Layers,
  Plus,
  ShieldCheck,
  Users,
  X
} from "lucide-react";
import {
  useSpacesStore,
  SPACE_KIND_LABEL,
  type SpaceKind
} from "@/store/spaces";

/**
 * Space switcher · Phase 21.
 *
 * Top-right HUD chip that opens a dropdown of saved brain spaces.
 * Switching packs the current live state into the previous space and
 * unpacks the target's payload into brain + mission + atlas stores.
 */

const KIND_ICON: Record<SpaceKind, typeof Brain> = {
  personal: Brain,
  startup: Briefcase,
  client: Users,
  research: Layers,
  lab: FlaskConical
};

export function SpaceSwitcher() {
  const spaces = useSpacesStore((s) => s.spaces);
  const activeId = useSpacesStore((s) => s.activeId);
  const createSpace = useSpacesStore((s) => s.createSpace);
  const switchTo = useSpacesStore((s) => s.switchTo);
  const cloneSpace = useSpacesStore((s) => s.cloneSpace);
  const archiveSpace = useSpacesStore((s) => s.archiveSpace);
  const removeSpace = useSpacesStore((s) => s.removeSpace);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newKind, setNewKind] = useState<SpaceKind>("personal");
  const ref = useRef<HTMLDivElement>(null);

  const active = spaces.find((s) => s.id === activeId);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const onCreate = () => {
    const name = newName.trim() || "New brain";
    const sp = createSpace(name, newKind);
    switchTo(sp.id);
    setCreating(false);
    setNewName("");
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Brain spaces"
        className="no-drag inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-white/70 transition hover:bg-white/[0.06]"
      >
        <Layers className="h-3 w-3 text-accent" />
        {active ? active.name : "space · default"}
      </button>

      {open && (
        <div className="absolute right-0 z-40 mt-1.5 w-[300px] overflow-hidden rounded-2xl border border-white/10 bg-graphite-900/95 shadow-glass backdrop-blur">
          <header className="flex items-center justify-between border-b border-white/8 px-3 py-1.5">
            <span className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-accent">
              brain spaces
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded p-0.5 text-white/55 hover:bg-white/[0.06] hover:text-white"
            >
              <X className="h-3 w-3" />
            </button>
          </header>

          {spaces.length === 0 ? (
            <p className="px-3 py-3 text-[11.5px] text-white/55">
              No saved spaces yet. Your current brain is the default · create
              a named space to switch between contexts.
            </p>
          ) : (
            <ul className="max-h-[260px] overflow-auto divide-y divide-white/6">
              {spaces.map((s) => {
                const Icon = KIND_ICON[s.kind];
                const isActive = s.id === activeId;
                return (
                  <li
                    key={s.id}
                    className={
                      isActive
                        ? "flex flex-col gap-1 bg-accent/[0.06] px-3 py-2"
                        : "flex flex-col gap-1 px-3 py-2 hover:bg-white/[0.03]"
                    }
                  >
                    <button
                      type="button"
                      onClick={() => switchTo(s.id)}
                      className="flex items-center justify-between gap-2 text-left"
                    >
                      <div className="flex items-center gap-1.5">
                        <Icon className={isActive ? "h-3.5 w-3.5 text-accent" : "h-3.5 w-3.5 text-white/65"} />
                        <span className={isActive ? "text-[12px] font-semibold text-white" : "text-[12px] text-white/85"}>
                          {s.name}
                        </span>
                      </div>
                      <span className="font-mono text-[9px] uppercase tracking-wider text-white/45">
                        {SPACE_KIND_LABEL[s.kind]}
                      </span>
                    </button>
                    <div className="flex items-center gap-1 font-mono text-[9px] uppercase tracking-wider text-white/40">
                      <span>{s.members.length} member{s.members.length === 1 ? "" : "s"}</span>
                      <span>·</span>
                      <button
                        type="button"
                        onClick={() => cloneSpace(s.id, `${s.name} (clone)`)}
                        className="rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5 hover:bg-white/[0.06]"
                      >
                        clone
                      </button>
                      <button
                        type="button"
                        onClick={() => archiveSpace(s.id)}
                        className="rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5 hover:bg-white/[0.06]"
                      >
                        archive
                      </button>
                      {!isActive && (
                        <button
                          type="button"
                          onClick={() => removeSpace(s.id)}
                          className="rounded border border-rose-400/25 bg-rose-500/[0.06] px-1.5 py-0.5 text-rose-200 hover:bg-rose-500/[0.12]"
                        >
                          remove
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {creating ? (
            <div className="flex flex-col gap-1.5 border-t border-white/8 px-3 py-2">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="brain name"
                autoFocus
                className="rounded-md border border-white/8 bg-white/[0.025] px-2 py-1.5 text-[12px] text-white placeholder:text-white/30 focus:border-accent/40 focus:outline-none"
              />
              <select
                value={newKind}
                onChange={(e) => setNewKind(e.target.value as SpaceKind)}
                className="rounded-md border border-white/8 bg-white/[0.025] px-2 py-1.5 text-[12px] text-white focus:border-accent/40 focus:outline-none"
              >
                {(Object.keys(SPACE_KIND_LABEL) as SpaceKind[]).map((k) => (
                  <option key={k} value={k}>
                    {SPACE_KIND_LABEL[k]}
                  </option>
                ))}
              </select>
              <div className="flex items-center justify-end gap-1">
                <button
                  type="button"
                  onClick={() => setCreating(false)}
                  className="rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider text-white/65 hover:bg-white/[0.06]"
                >
                  cancel
                </button>
                <button
                  type="button"
                  onClick={onCreate}
                  className="rounded bg-accent/85 px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-wider text-white shadow-glow hover:bg-accent"
                >
                  create + switch
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="flex w-full items-center gap-1.5 border-t border-white/8 px-3 py-2 text-left font-mono text-[10px] uppercase tracking-wider text-accent hover:bg-white/[0.03]"
            >
              <Plus className="h-3 w-3" /> new brain space
            </button>
          )}

          <footer className="border-t border-white/8 px-3 py-1.5 font-mono text-[9.5px] uppercase tracking-wider text-white/40">
            <ShieldCheck className="mr-1 inline h-3 w-3 text-emerald-300/85" />
            switching packs/unpacks state locally · nothing leaves disk
          </footer>
        </div>
      )}
    </div>
  );
}
