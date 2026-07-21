import {
  Database,
  FileText,
  Folder,
  Github,
  HardDrive,
  Mail,
  type LucideIcon
} from "lucide-react";
import { MemoryNotesClient } from "@/components/MemoryNotesClient";
import { OperatorPageHeader } from "@/components/OperatorPageHeader";

export const metadata = {
  title: "Memory · operator.center",
  description: "Manual notes today. Sources, graph, recalls planned next."
};

interface SourceCard {
  id: string;
  name: string;
  blurb: string;
  Icon: LucideIcon;
  willConnect: string[];
}

const SOURCES: SourceCard[] = [
  {
    id: "obsidian",
    name: "Obsidian Vault",
    blurb: "Local markdown vault. The reference source of truth.",
    Icon: FileText,
    willConnect: [
      "Index `.md` files + frontmatter from a vault path",
      "Cite recalls as `vault://path/Note.md#heading`",
      "Append / insert into notes from a mission output"
    ]
  },
  {
    id: "github",
    name: "GitHub",
    blurb: "Repos, issues, PRs. The team's structural memory.",
    Icon: Github,
    willConnect: [
      "Index READMEs, issues, PR descriptions and recent diffs",
      "Cite recalls as `repo:owner/name/path.ts#L42`",
      "Open PRs / issues / comments from missions through risk-tagged tools"
    ]
  },
  {
    id: "gmail",
    name: "Gmail",
    blurb: "Threads + attachments. Per-label opt-in.",
    Icon: Mail,
    willConnect: [
      "Index threads from labels the operator picks",
      "Recall `who emailed me about migrations last week?` with citations",
      "Draft replies (never auto-send) via the Gmail API"
    ]
  },
  {
    id: "drive",
    name: "Google Drive",
    blurb: "Docs and Sheets, per-folder opt-in.",
    Icon: HardDrive,
    willConnect: [
      "Extract Docs / Sheets content from a folder",
      "Cite recalls as `drive://Folder/Doc#section`",
      "Append to a Doc from a mission output"
    ]
  },
  {
    id: "files",
    name: "Local folders",
    blurb: "Drag-paste files into the Tauri shell.",
    Icon: Folder,
    willConnect: [
      "Index dropped PDFs, screenshots and arbitrary files",
      "Stays in the local vault — never uploaded",
      "Available to every mission as auto-injected context"
    ]
  }
];

export default function MemoryPage() {
  return (
    <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-8 px-4 py-6 md:px-8 md:py-10">
      <OperatorPageHeader
        eyebrow="memory · the operator's brain"
        title="Memory"
        sub="Manual notes are live and local. Cloud connectors (Obsidian / GitHub / Gmail / Drive) ship in a later phase — no fake connection state."
      />

      {/* --------------- Notes (real, local) --------------- */}
      <section className="flex flex-col gap-3.5">
        <div className="flex items-baseline justify-between">
          <h2 className="flex items-center gap-2 text-[12.5px] font-semibold uppercase tracking-[0.2em] text-white/90">
            <span aria-hidden className="h-1 w-1 rounded-full bg-accent shadow-[0_0_6px_1px_rgba(164,144,194,0.6)]" />
            Notes
          </h2>
          <span className="font-mono text-[10px] uppercase tracking-wider text-white/45">
            local · this browser
          </span>
        </div>
        <MemoryNotesClient />
        <p className="text-[11.5px] leading-relaxed text-white/50">
          Attach notes to a mission from the &ldquo;Memory&rdquo; button in Mission
          Control. Attached notes are prepended as a Markdown context block to
          the mission input.
        </p>
      </section>

      {/* --------------- Sources (placeholder) --------------- */}
      <section className="flex flex-col gap-3.5">
        <div className="flex items-baseline justify-between">
          <h2 className="flex items-center gap-2 text-[12.5px] font-semibold uppercase tracking-[0.2em] text-white/90">
            <span aria-hidden className="h-1 w-1 rounded-full bg-white/35" />
            Sources
          </h2>
          <span className="font-mono text-[10px] uppercase tracking-wider text-white/45">
            planned connectors
          </span>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {SOURCES.map((s) => (
            <article
              key={s.id}
              className="lift-on-hover flex flex-col gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 shadow-[inset_0_1px_0_rgba(230,230,250,0.04)]"
            >
              <header className="flex items-start gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.05] ring-1 ring-white/[0.10] shadow-[inset_0_1px_0_rgba(230,230,250,0.06)]">
                  <s.Icon className="h-4 w-4 text-accent" />
                </span>
                <div className="flex flex-1 flex-col leading-tight">
                  <div className="flex items-center gap-2">
                    <h3 className="text-[13px] font-semibold text-white">{s.name}</h3>
                    <NotConnectedPill />
                  </div>
                  <p className="mt-0.5 text-[12px] text-white/55">{s.blurb}</p>
                </div>
              </header>
              <ul className="flex flex-col gap-1 text-[11.5px] text-white/65">
                {s.willConnect.map((bullet) => (
                  <li key={bullet} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-white/30" />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
              <PlannedConnectorButton />
            </article>
          ))}
        </div>
        <aside className="flex items-start gap-3 rounded-2xl border border-white/8 bg-white/[0.012] p-4 text-[12px] text-white/65">
          <Database className="mt-0.5 h-3.5 w-3.5 shrink-0 text-white/45" />
          <div className="flex flex-col gap-1">
            <strong className="text-white/85">
              No external memory is indexed.
            </strong>
            <span className="text-white/55">
              Connectors above are not wired yet. The Notes section above
              works fully and is the operator&apos;s first-class memory until
              cloud sources land.
            </span>
          </div>
        </aside>
      </section>
    </div>
  );
}

function NotConnectedPill() {
  return (
    <span className="inline-flex items-center gap-1 rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-white/55">
      <span className="h-1 w-1 rounded-full bg-white/30" />
      not connected
    </span>
  );
}

function PlannedConnectorButton() {
  return (
    <button
      type="button"
      disabled
      title="Planned connector — not wired yet"
      className="inline-flex w-fit cursor-not-allowed items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] font-medium text-white/55"
    >
      Planned connector
    </button>
  );
}
