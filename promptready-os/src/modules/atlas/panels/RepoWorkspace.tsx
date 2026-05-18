"use client";

import { useState } from "react";
import { Github, Loader2, Plus, Rocket, X } from "lucide-react";
import { useBrainStore, type MemorySource } from "@/store/brain";
import { useMissionStore } from "@/store/mission";
import {
  REPO_ACTIONS,
  collectRepoDocs,
  dispatchRepoAction,
  type RepoAction
} from "@/services/repoIntelligence";

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
  const repoDocs = collectRepoDocs();

  const [url, setUrl] = useState("");
  const [branch, setBranch] = useState("");
  const [note, setNote] = useState("");
  const [busyAction, setBusyAction] = useState<{ url: string; kind: string } | null>(null);
  const [lastResult, setLastResult] = useState<string | null>(null);

  const onAction = async (repo: MemorySource, action: RepoAction) => {
    setBusyAction({ url: repo.label, kind: action.kind });
    setLastResult(null);
    const r = await dispatchRepoAction(action, repo.label);
    setBusyAction(null);
    setLastResult(r.message);
    if (r.ok) {
      window.setTimeout(() => onClose(), 600);
    } else {
      window.setTimeout(() => setLastResult(null), 4000);
    }
  };

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

      {repos.length > 0 && (
        <div className="rounded-md border border-accent/25 bg-accent/[0.04] p-2">
          <div className="mb-1 flex items-center justify-between">
            <span className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-accent">
              repo intelligence
            </span>
            <span className="font-mono text-[9px] uppercase tracking-wider text-white/45">
              {repoDocs.length} repo file{repoDocs.length === 1 ? "" : "s"} imported
            </span>
          </div>
          <p className="mb-1.5 text-[10.5px] text-white/55">
            Templated missions that include any imported README, package.json,
            prisma schema, env.example, or route/component files as real
            context. Nothing is fetched from GitHub.
          </p>
          {repos.map((repo) => (
            <div key={`actions-${repo.id}`} className="mb-2 last:mb-0">
              <div className="mb-1 truncate font-mono text-[10.5px] text-white/80">
                {repo.label}
              </div>
              <div className="flex flex-wrap gap-1">
                {REPO_ACTIONS.map((action) => {
                  const busy =
                    busyAction?.url === repo.label && busyAction.kind === action.kind;
                  return (
                    <button
                      key={action.kind}
                      type="button"
                      onClick={() => onAction(repo, action)}
                      disabled={!!busyAction}
                      title={action.blurb}
                      className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.03] px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-white/75 hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {busy ? (
                        <Loader2 className="h-2.5 w-2.5 animate-spin text-accent" />
                      ) : (
                        <Rocket className="h-2.5 w-2.5 text-accent" />
                      )}
                      {action.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          {lastResult && (
            <p className="mt-1 rounded-md border border-accent/30 bg-accent/[0.08] px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-accent">
              {lastResult}
            </p>
          )}
          {repoDocs.length === 0 && (
            <p className="text-[10px] text-white/45">
              Import README · package.json · prisma · env.example via the
              Memory Vault Files tab to enrich these actions.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function labelFor(url: string, branch: string) {
  const slug = url.replace(/^https?:\/\//, "").replace(/\.git$/, "");
  return branch.trim() ? `${slug} · ${branch.trim()}` : slug;
}
