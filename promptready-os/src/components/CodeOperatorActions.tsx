"use client";

import { useState } from "react";
import { Code2, ExternalLink, Github, Sparkles } from "lucide-react";

/**
 * Code Operator · per-deliverable Send-To actions.
 *
 * Honest export: each action COPIES the deliverable content to clipboard
 * and OPENS the destination in a new tab. There is no direct Claude /
 * Cursor / GitHub API integration · the button title spells that out.
 *
 * Used everywhere a deliverable is rendered:
 *   · Mission Control · DeliverableCard
 *   · Library · receipt expand
 *   · Atlas Delivery Center
 */

export interface SendToTarget {
  label: string;
  Icon: typeof Code2;
  /** Open this URL after copy · null = copy only. */
  href: string | null;
  /** Honest one-liner shown in title attribute. */
  hint: string;
}

const CLAUDE: SendToTarget = {
  label: "Send to Claude",
  Icon: Sparkles,
  href: "https://claude.ai/new",
  hint: "Copies the prompt and opens claude.ai in a new tab · no API integration · paste to send"
};
const CHATGPT: SendToTarget = {
  label: "Send to ChatGPT",
  Icon: Sparkles,
  href: "https://chatgpt.com/",
  hint: "Copies the prompt and opens chatgpt.com · paste to send · no API integration"
};
const CURSOR: SendToTarget = {
  label: "Send to Cursor",
  Icon: Code2,
  href: "https://cursor.com/",
  hint: "Copies the task · open Cursor and paste into the chat or composer · no direct integration yet"
};
const GITHUB: SendToTarget = {
  label: "Open GitHub Issue Draft",
  Icon: Github,
  href: "https://github.com/issues/new",
  hint: "Copies the issue body · opens GitHub new-issue page · paste into the new-issue form"
};

/** Map a deliverable label to the matching Send-To targets. */
export function targetsFor(label: string, repoUrl?: string | null): SendToTarget[] {
  const l = label.toLowerCase();
  if (l.includes("claude")) return [CLAUDE];
  if (l.includes("chatgpt") || l.includes("chat gpt")) return [CHATGPT];
  if (l.includes("cursor")) return [CURSOR];
  if (l.includes("github issue")) {
    const href = repoUrl ? repoNewIssueUrl(repoUrl) : null;
    if (href) return [{ ...GITHUB, href, hint: `${GITHUB.hint} (${href})` }];
    return [GITHUB];
  }
  if (l.includes("linear")) {
    return [
      {
        label: "Open Linear",
        Icon: ExternalLink,
        href: "https://linear.app/",
        hint: "Copies the issue body · opens Linear in a new tab · paste into a new issue"
      }
    ];
  }
  return [];
}

/** Best-effort: convert a repo URL or `owner/repo` to a new-issue URL. */
function repoNewIssueUrl(repo: string): string | null {
  const m = repo.match(/github\.com[/:]([^/]+)\/([^/#?\s]+)/i);
  if (m) return `https://github.com/${m[1]}/${m[2].replace(/\.git$/, "")}/issues/new`;
  const slug = repo.match(/^([^/]+)\/([^/#?\s]+)$/);
  if (slug) return `https://github.com/${slug[1]}/${slug[2].replace(/\.git$/, "")}/issues/new`;
  return null;
}

interface Props {
  label: string;
  content: string;
  repoUrl?: string | null;
  size?: "sm" | "md";
}

export function CodeOperatorActions({ label, content, repoUrl, size = "sm" }: Props) {
  const targets = targetsFor(label, repoUrl);
  const [flash, setFlash] = useState<string | null>(null);

  if (targets.length === 0) return null;

  const onSendTo = async (t: SendToTarget) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(content);
      } catch {
        // ignore copy failure · still attempt the open
      }
    }
    if (t.href && typeof window !== "undefined") {
      window.open(t.href, "_blank", "noopener,noreferrer");
    }
    setFlash(`copied · ${t.label.toLowerCase()}`);
    window.setTimeout(() => setFlash(null), 2500);
  };

  return (
    <div className="flex flex-wrap items-center gap-1">
      {targets.map((t) => (
        <button
          key={t.label}
          type="button"
          onClick={() => onSendTo(t)}
          title={t.hint}
          className={
            size === "md"
              ? "inline-flex items-center gap-1 rounded-md border border-accent/30 bg-accent/[0.06] px-2 py-1 text-[11px] font-medium text-accent hover:bg-accent/[0.12]"
              : "inline-flex items-center gap-1 rounded border border-accent/30 bg-accent/[0.06] px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider text-accent hover:bg-accent/[0.12]"
          }
        >
          <t.Icon className={size === "md" ? "h-3 w-3" : "h-2.5 w-2.5"} />
          {t.label}
        </button>
      ))}
      {flash && (
        <span className="font-mono text-[9.5px] uppercase tracking-wider text-accent">
          {flash}
        </span>
      )}
    </div>
  );
}
