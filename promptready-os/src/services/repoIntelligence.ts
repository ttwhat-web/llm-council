/**
 * Repo Intelligence v1 · Phase 17.
 *
 * Pre-baked mission briefs that turn an attached GitHub repo (manual
 * context, no cloning) into actionable analyses. If the operator has
 * imported repo-shaped docs into Memory Vault (README, package.json,
 * prisma schema, .env.example, route/component listings), the action
 * automatically includes their content as real context.
 *
 * Nothing is fetched from GitHub. Everything runs against what the
 * brain already has on disk.
 */

import { useAtlasStore, type MemoryDoc } from "@/store/atlas";
import { useMissionStore } from "@/store/mission";

export type RepoActionKind =
  | "analyze"
  | "roadmap"
  | "dead-code"
  | "deploy"
  | "architecture";

export interface RepoAction {
  kind: RepoActionKind;
  label: string;
  blurb: string;
  build(repoUrl: string, attachments: string): string;
}

function attachmentBlock(repoUrl: string, attachments: string): string {
  return `Repo: ${repoUrl}\n\n${attachments || "(no repo files imported · brief is based on the URL + any prior brain notes)"}`;
}

export const REPO_ACTIONS: RepoAction[] = [
  {
    kind: "analyze",
    label: "Analyze repo",
    blurb: "Explain stack, conventions, architecture from imported files.",
    build: (repoUrl, attachments) =>
      `Analyze this repo end-to-end. Identify the stack, the major modules, the conventions, and any obvious risks. Quote evidence from the attached files where possible.\n\n${attachmentBlock(repoUrl, attachments)}\n\nReturn:\n- Stack summary (one line)\n- Module map (bullets)\n- Conventions (3-5 bullets)\n- Risks (3 bullets)`
  },
  {
    kind: "roadmap",
    label: "Generate roadmap",
    blurb: "Three-horizon roadmap (Now · Next · Later) from the codebase.",
    build: (repoUrl, attachments) =>
      `Read the repo and propose a three-horizon roadmap.\n\n${attachmentBlock(repoUrl, attachments)}\n\nReturn:\n## Now\n- ...\n\n## Next\n- ...\n\n## Later\n- ...\n\nFor each item, write a single shippable outcome. Skip anything that isn't grounded in the files you saw.`
  },
  {
    kind: "dead-code",
    label: "Dead code scan",
    blurb: "Suspected unused modules, dead routes, abandoned features.",
    build: (repoUrl, attachments) =>
      `Scan the attached files for dead code candidates. Flag files / routes / components that are likely unused or abandoned. Be conservative — only call out what the evidence supports.\n\n${attachmentBlock(repoUrl, attachments)}\n\nReturn a table:\n| Path | Reason | Confidence |\n|------|--------|------------|\nFollow with a short "deletion order" suggestion.`
  },
  {
    kind: "deploy",
    label: "Deploy plan",
    blurb: "Concrete deployment plan derived from package.json + env.example.",
    build: (repoUrl, attachments) =>
      `Produce a deployment plan for this repo. Use package.json scripts and env.example as ground truth. Don't invent env vars.\n\n${attachmentBlock(repoUrl, attachments)}\n\nReturn:\n1. Required env vars (from .env.example)\n2. Build command + output dir\n3. Recommended host + reason (1-line)\n4. Smoke-test checklist (5 items)\n5. Rollback plan`
  },
  {
    kind: "architecture",
    label: "Architecture map",
    blurb: "Component / route / data-model ASCII map of the system.",
    build: (repoUrl, attachments) =>
      `Draw an ASCII architecture map of this codebase. Show the top-level modules, where data flows, and any external services declared in env.example.\n\n${attachmentBlock(repoUrl, attachments)}\n\nReturn:\n\`\`\`\n<ASCII map here>\n\`\`\`\n\nFollow with a short "decision log" that records the three structural choices the architect should validate.`
  }
];

const REPO_FILE_HINTS = [
  /readme(\.md)?$/i,
  /package\.json$/i,
  /prisma\/schema\.prisma$/i,
  /\.env\.example$/i,
  /routes?\.(t|j)sx?$/i,
  /components?\.(t|j)sx?$/i,
  /tsconfig\.json$/i,
  /vite\.config\.(t|j)s$/i,
  /next\.config\.(t|j)s$/i,
  /Dockerfile$/i
];

/** Heuristic: any imported doc whose name matches a repo-shape pattern. */
export function collectRepoDocs(): MemoryDoc[] {
  return useAtlasStore
    .getState()
    .memoryDocs.filter((d) =>
      REPO_FILE_HINTS.some((re) => re.test(d.name) || re.test(d.path ?? ""))
    )
    .slice(0, 8);
}

function attachmentsFromDocs(docs: MemoryDoc[]): string {
  if (docs.length === 0) return "";
  return docs
    .map((d) => `[file: ${d.name}]\n${d.body.slice(0, 4000)}`)
    .join("\n\n---\n\n");
}

export interface RepoMissionResult {
  receiptId?: string;
  ok: boolean;
  matchedDocs: number;
  message: string;
}

/** Dispatch a repo action as a real mission. */
export async function dispatchRepoAction(
  action: RepoAction,
  repoUrl: string
): Promise<RepoMissionResult> {
  const docs = collectRepoDocs();
  const attachments = attachmentsFromDocs(docs);
  const brief = action.build(repoUrl, attachments);
  const ms = useMissionStore.getState();
  if (ms.current) {
    return {
      ok: false,
      matchedDocs: docs.length,
      message: `Cannot dispatch · ${ms.current.id} is already in flight.`
    };
  }
  const r = await ms.dispatch(brief, "dev", "fast", repoUrl);
  if (!r) {
    return { ok: false, matchedDocs: docs.length, message: "Dispatch failed." };
  }
  return {
    ok: true,
    receiptId: r.id,
    matchedDocs: docs.length,
    message: `Dispatched ${r.id} · ${docs.length} repo file(s) attached as context.`
  };
}
