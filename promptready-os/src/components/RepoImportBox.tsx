"use client";

import { useState } from "react";
import clsx from "clsx";
import { FileText, Github, Plus, Rocket, Sparkles, Code2 } from "lucide-react";
import { useBrainStore } from "@/store/brain";
import { useMissionStore } from "@/store/mission";

/**
 * Repo Import Box · operator-next.
 *
 * HARD HONESTY: this surface does NOT clone, fetch, or index any repo.
 * "Attach repo context" only records an `owner/repo` slug as a configured
 * GitHub memory source — context-only, never read or analyzed. Everywhere
 * the state is spelled out as "repo attached · not indexed".
 *
 * Mission buttons hand a slug-scoped brief to the deterministic mission
 * runner via `dispatch`; nothing leaves the machine on its own.
 */

/** Parse a GitHub URL or `owner/repo` string into a clean `owner/repo` slug. */
function parseSlug(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  const url = value.match(/github\.com[/:]([^/\s]+)\/([^/#?\s]+)/i);
  if (url) return `${url[1]}/${url[2].replace(/\.git$/, "")}`;
  const slug = value.match(/^([^/\s]+)\/([^/#?\s]+)$/);
  if (slug) return `${slug[1]}/${slug[2].replace(/\.git$/, "")}`;
  return null;
}

export function RepoImportBox() {
  const current = useMissionStore((s) => s.current);

  const [raw, setRaw] = useState("");
  const [slug, setSlug] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  const running = Boolean(current);
  const invalid = touched && raw.trim().length > 0 && !slug;

  const onChange = (next: string) => {
    setRaw(next);
    setSlug(parseSlug(next));
  };

  const onAttach = () => {
    if (!slug) return;
    useBrainStore.getState().addMemorySource({
      kind: "github",
      label: slug,
      state: "configured"
    });
    note("repo attached · not indexed");
  };

  const runMissionBrief = (brief: string, mode: string, quality: string) => {
    if (!slug || running) return;
    void useMissionStore.getState().dispatch(brief, mode, quality, slug);
  };

  const note = (msg: string) => {
    setFlash(msg);
    window.setTimeout(() => setFlash((f) => (f === msg ? null : f)), 3000);
  };

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Github className="h-4 w-4 text-accent" />
          <span className="text-[13px] font-semibold text-white">GitHub Repo Import</span>
        </div>
        <span className="rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider text-white/55">
          {slug ? "repo attached · not indexed" : "context-only · no clone"}
        </span>
      </header>

      <p className="text-[11px] text-white/55">
        Paste a repo to attach it as <strong>context-only</strong>. Nothing is cloned,
        fetched, or indexed — the slug just scopes your missions.
      </p>

      <div className="flex flex-col gap-1">
        <input
          type="text"
          value={raw}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => setTouched(true)}
          placeholder="https://github.com/owner/repo  or  owner/repo"
          className={clsx(
            "w-full rounded-lg border bg-white/[0.02] px-2.5 py-1.5 font-mono text-[12px] text-white placeholder:text-white/30 focus:outline-none",
            invalid
              ? "border-rose-400/40 focus:border-rose-400/60"
              : "border-white/10 focus:border-accent/50"
          )}
        />
        {invalid && (
          <span className="font-mono text-[10px] text-rose-300">
            not a valid repo · expected owner/repo
          </span>
        )}
        {slug && (
          <span className="font-mono text-[10px] text-accent">parsed · {slug}</span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={onAttach}
          disabled={!slug}
          title="Records the slug as a configured GitHub memory source · context-only · no clone, no index"
          className={btn(!slug)}
        >
          <Plus className="h-2.5 w-2.5" />
          Attach repo context
        </button>
        <button
          type="button"
          disabled={!slug || running}
          title={running ? "finish current mission first" : "Dispatch a slug-scoped code mission to the local runner"}
          onClick={() =>
            runMissionBrief(
              `Audit and plan work for the repo ${slug}. I'll paste specifics. Produce an architecture summary, top risks, and a prioritized task list.`,
              "claude",
              "code"
            )
          }
          className={btn(!slug || running)}
        >
          <Rocket className="h-2.5 w-2.5" />
          Create code mission
        </button>
        <button
          type="button"
          disabled={!slug || running}
          title={running ? "finish current mission first" : "Build a Claude-ready coding prompt scoped to this repo"}
          onClick={() =>
            runMissionBrief(
              `Turn my request about ${slug} into a Claude-ready coding prompt: explicit task, constraints first, file paths, acceptance criteria.\n\nRequest:\n[paste here]`,
              "claude",
              "code"
            )
          }
          className={btn(!slug || running)}
        >
          <Sparkles className="h-2.5 w-2.5" />
          Claude task
        </button>
        <button
          type="button"
          disabled={!slug || running}
          title={running ? "finish current mission first" : "Build a Cursor task scoped to this repo"}
          onClick={() =>
            runMissionBrief(
              `Produce a Cursor task for ${slug}: scoped change, files to touch, acceptance checks.\n\nRequest:\n[paste here]`,
              "cursor",
              "code"
            )
          }
          className={btn(!slug || running)}
        >
          <Code2 className="h-2.5 w-2.5" />
          Cursor task
        </button>
        <button
          type="button"
          disabled={!slug || running}
          title={running ? "finish current mission first" : "Draft a GitHub issue scoped to this repo"}
          onClick={() =>
            runMissionBrief(
              `Draft a GitHub issue for ${slug}: title, context, expected vs actual, repro/steps, acceptance criteria.\n\nDetails:\n[paste here]`,
              "general",
              "smart"
            )
          }
          className={btn(!slug || running)}
        >
          <FileText className="h-2.5 w-2.5" />
          GitHub issue draft
        </button>
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-white/6 pt-2 font-mono text-[9.5px] uppercase tracking-wider text-white/45">
        <span>{running ? "finish current mission first" : "repo attached · not indexed"}</span>
        {flash && <span className="text-accent">{flash}</span>}
      </footer>
    </section>
  );
}

function btn(disabled: boolean): string {
  return clsx(
    "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider",
    disabled
      ? "cursor-not-allowed border-white/8 bg-white/[0.02] text-white/30"
      : "border-accent/30 bg-accent/[0.06] text-accent hover:bg-accent/[0.12]"
  );
}
