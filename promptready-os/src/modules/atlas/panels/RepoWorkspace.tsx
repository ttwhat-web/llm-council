"use client";

import { useState } from "react";
import { Github, Plus, Rocket, X } from "lucide-react";
import { useBrainStore, type MemorySource } from "@/store/brain";
import { useMissionStore } from "@/store/mission";

/**
 * Repo workspace · used inside the Atlas Repo Layer detail.
 *
 * Lets the operator attach repos as Brain memory sources, detach them,
 * and "Create mission from repo" — a one-tap dispatch with the repo
 * URL pre-baked into the brief.
 */

export function RepoWorkspace({ onClose }: { onClose: () => void }) {
  const sources = useBrainStore((s) => s.memorySources);
  const addMemorySource = useBrainStore((s) => s.addMemorySource);
  const removeMemorySource = useBrainStore((s) => s.removeMemorySource);
  const dispatch = useMissionStore((s) => s.dispatch);

  const repos = sources.filter((s) => s.kind === "github");

  const [url, setUrl] = useState("");
  const [branch, setBranch] = useState("");
  const [note, setNote] = useState("");

  const onAttach = () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    const label = labelFor(trimmed, branch);
    if (repos.some((r) => r.label === label)) return;
    addMemorySource({ kind: "github", label, state: "configured" });
    setUrl("");
    setBranch("");
    setNote("");
  };

  const onCreateMission = (r: MemorySource) => {
    void dispatch(
      `Review repo context: ${r.label}\n\nThe repo is manual context — not indexed yet. Suggest the next concrete operator action, given the repo name and intent.${note ? `\n\nNote: ${note}` : ""}`,
      "dev",
      "fast",
      r.label
    );
    onClose();
  };

  return (
    <div className="flex flex-col gap-2">
      <header className="flex items-center justify-between">
        <span className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-accent">
          repo workspace
        </span>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-0.5 text-white/55 hover:bg-white/[0.06] hover:text-white"
        >
          <X className="h-3 w-3" />
        </button>
      </header>

      <div className="flex flex-col gap-1.5 rounded-md border border-white/8 bg-white/[0.012] p-2">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://github.com/owner/repo"
          className="no-drag rounded-md border border-white/8 bg-white/[0.025] px-2 py-1.5 text-[12px] text-white placeholder:text-white/30 focus:border-accent/40 focus:outline-none"
        />
        <div className="grid grid-cols-2 gap-1.5">
          <input
            type="text"
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            placeholder="branch (optional)"
            className="no-drag rounded-md border border-white/8 bg-white/[0.025] px-2 py-1.5 text-[11px] text-white placeholder:text-white/30 focus:border-accent/40 focus:outline-none"
          />
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="note (optional)"
            className="no-drag rounded-md border border-white/8 bg-white/[0.025] px-2 py-1.5 text-[11px] text-white placeholder:text-white/30 focus:border-accent/40 focus:outline-none"
          />
        </div>
        <button
          type="button"
          onClick={onAttach}
          disabled={!url.trim()}
          className="no-drag inline-flex items-center justify-center gap-1 rounded-md bg-accent/85 px-2 py-1 text-[11.5px] font-semibold text-white shadow-glow transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Plus className="h-3 w-3" /> Attach
        </button>
      </div>

      <div>
        <div className="mb-1 font-mono text-[9.5px] uppercase tracking-wider text-white/40">
          attached · manual context · not indexed yet
        </div>
        {repos.length === 0 ? (
          <p className="rounded-md border border-dashed border-white/10 bg-white/[0.008] px-2 py-2 text-[11px] text-white/55">
            No repos attached yet. Add one above.
          </p>
        ) : (
          <ul className="flex flex-col gap-1">
            {repos.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between gap-2 rounded-md border border-white/8 bg-white/[0.012] px-2 py-1.5"
              >
                <div className="flex min-w-0 items-center gap-1.5">
                  <Github className="h-3 w-3 shrink-0 text-accent" />
                  <span className="truncate font-mono text-[11px] text-white">{r.label}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onCreateMission(r)}
                    title="Create mission from this repo"
                    className="inline-flex items-center gap-1 rounded-md bg-accent/85 px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider text-white shadow-glow hover:bg-accent"
                  >
                    <Rocket className="h-2.5 w-2.5" /> mission
                  </button>
                  <button
                    type="button"
                    onClick={() => removeMemorySource(r.id)}
                    className="rounded p-0.5 text-white/40 hover:bg-white/[0.06] hover:text-white/80"
                    aria-label="Detach"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function labelFor(url: string, branch: string) {
  const slug = url.replace(/^https?:\/\//, "").replace(/\.git$/, "");
  return branch.trim() ? `${slug} · ${branch.trim()}` : slug;
}
