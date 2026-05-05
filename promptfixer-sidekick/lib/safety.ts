import type { SafetyFinding, SafetyReport } from "./types";

interface Rule {
  id: string;
  pattern: RegExp;
  severity: SafetyFinding["severity"];
  reason: string;
  suggestion: string;
}

const RULES: Rule[] = [
  {
    id: "rm-rf-root",
    pattern: /\brm\s+-rf?\s+(\/(?!\w)|~|\$HOME|\*)/i,
    severity: "critical",
    reason: "Recursive deletion of root, home, or wildcard scope.",
    suggestion: "Scope the path explicitly and prefer `trash`/`rm -i`. Add a dry-run with `ls` first."
  },
  {
    id: "rm-rf-generic",
    pattern: /\brm\s+-rf?\b/i,
    severity: "high",
    reason: "Recursive force delete is irreversible.",
    suggestion: "List the target with `ls -la <path>` first; consider `git clean -nd` for repos."
  },
  {
    id: "dd-disk",
    pattern: /\bdd\s+if=.+\s+of=\/dev\/(sd[a-z]|nvme|disk)/i,
    severity: "critical",
    reason: "`dd` to a raw device wipes the disk.",
    suggestion: "Verify the target with `lsblk` and add `status=progress conv=fdatasync`. Confirm the device twice."
  },
  {
    id: "mkfs",
    pattern: /\bmkfs(\.\w+)?\s+\/dev\//i,
    severity: "critical",
    reason: "Reformats a block device.",
    suggestion: "Unmount and snapshot first; confirm with `lsblk -f`."
  },
  {
    id: "drop-table",
    pattern: /\bDROP\s+(TABLE|DATABASE|SCHEMA)\b/i,
    severity: "high",
    reason: "Destructive DDL.",
    suggestion: "Wrap in a transaction with an explicit BEGIN/ROLLBACK rehearsal and take a backup first."
  },
  {
    id: "truncate",
    pattern: /\bTRUNCATE\s+TABLE\b/i,
    severity: "medium",
    reason: "Removes all rows; not always reversible.",
    suggestion: "Confirm row counts and snapshot the table before running."
  },
  {
    id: "force-push",
    pattern: /\bgit\s+push\s+(?:-{1,2}force|-f)\b/i,
    severity: "high",
    reason: "Rewrites remote history.",
    suggestion: "Use `--force-with-lease` and confirm the branch is not shared."
  },
  {
    id: "chmod-777",
    pattern: /\bchmod\s+-?R?\s*777\b/i,
    severity: "medium",
    reason: "World-writable permissions.",
    suggestion: "Use the least-privilege mode (e.g., 750 / 640) and target a specific path."
  },
  {
    id: "curl-pipe-sh",
    pattern: /\bcurl\b[^\n|]*\|\s*(sudo\s+)?(sh|bash|zsh)\b/i,
    severity: "high",
    reason: "Pipes remote script straight into a shell.",
    suggestion: "Download to a file, inspect, then execute. Verify checksum / signature."
  },
  {
    id: "fork-bomb",
    pattern: /:\s*\(\s*\)\s*\{\s*:\s*\|\s*:\s*&\s*\}\s*;\s*:/,
    severity: "critical",
    reason: "Classic shell fork bomb.",
    suggestion: "Refuse. There is no safe variant of this command."
  }
];

export function screenForDanger(text: string): SafetyReport {
  const findings: SafetyFinding[] = [];
  for (const rule of RULES) {
    if (rule.pattern.test(text)) {
      findings.push({
        pattern: rule.id,
        severity: rule.severity,
        reason: rule.reason,
        suggestion: rule.suggestion
      });
    }
  }

  const blocked = findings.some((f) => f.severity === "critical");
  const requiresConfirmation =
    !blocked && findings.some((f) => f.severity === "high" || f.severity === "medium");

  let rewritten: string | undefined;
  if (findings.length > 0) {
    rewritten = annotateUnsafe(text, findings);
  }

  return { blocked, requiresConfirmation, findings, rewritten };
}

function annotateUnsafe(text: string, findings: SafetyFinding[]): string {
  const banner = [
    "# !! SAFETY REVIEW REQUIRED !!",
    "# This prompt produces commands that may be destructive.",
    "# Review every line before executing. Prefer dry-runs.",
    ...findings.map((f) => `# - [${f.severity.toUpperCase()}] ${f.reason} -> ${f.suggestion}`),
    ""
  ].join("\n");
  return `${banner}\n${text}`;
}
