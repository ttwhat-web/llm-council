/**
 * Marketplace · Phase 23.
 *
 * Local-only pack registry. A pack is a small JSON object that
 * installs into the current brain by mutating real stores (workflow
 * canvas · mission templates · terminal pins · memory seeds · repo
 * context). Nothing is fetched · packs ship in the bundle and the
 * user can also import a `.pack.json` file from disk.
 *
 * Export packs the current brain's matching slices into a portable
 * .pack.json the operator can share with another machine.
 */

import { useAtlasStore, type WorkflowNode, type WorkflowEdge, type WorkflowNodeKind } from "@/store/atlas";
import { useBrainStore } from "@/store/brain";

export type PackKind =
  | "brain"
  | "workflow"
  | "template"
  | "repo"
  | "agent"
  | "atlas-layout"
  | "memory-vault";

export interface PackTemplate {
  label: string;
  brief: string;
  mode: string;
  quality: string;
}

export interface PackNote {
  name: string;
  body: string;
}

export interface PackContents {
  workflowNodes?: Array<{ kind: WorkflowNodeKind; label: string; x: number; y: number }>;
  workflowEdges?: Array<{ from: number; to: number }>; // indexes into workflowNodes
  missionTemplates?: PackTemplate[];
  repoLabels?: string[];
  pinnedTerminal?: Record<string, string[]>;
  /** Brain notes seeded into the Memory layer on install (Sprint B). */
  notes?: PackNote[];
}

export interface Pack {
  id: string;
  kind: PackKind;
  name: string;
  blurb: string;
  author: string;
  version: string;
  installed?: boolean;
  contents: PackContents;
}

export const STARTER_PACKS: Pack[] = [
  {
    id: "startup-cto",
    kind: "brain",
    name: "Startup CTO",
    blurb: "Day-30 plan + architecture review + hire-or-build canvas.",
    author: "Operator.Center",
    version: "0.1.0",
    contents: {
      workflowNodes: [
        { kind: "mission", label: "Day-30 plan", x: 30, y: 30 },
        { kind: "mission", label: "Architecture review", x: 200, y: 30 },
        { kind: "approval", label: "Founder OK", x: 360, y: 80 },
        { kind: "export", label: "Ship plan", x: 480, y: 80 }
      ],
      workflowEdges: [
        { from: 0, to: 1 },
        { from: 1, to: 2 },
        { from: 2, to: 3 }
      ],
      missionTemplates: [
        {
          label: "First 30 days",
          brief:
            "I'm the new CTO. Produce my first-30-days plan: stack picks, architecture, hire vs build, top 5 risks.",
          mode: "business",
          quality: "smart"
        }
      ]
    }
  },
  {
    id: "claude-coding",
    kind: "template",
    name: "Claude Coding",
    blurb: "Messy ask → Claude-ready prompt + repo audit + deploy notes.",
    author: "Operator.Center",
    version: "0.2.0",
    contents: {
      missionTemplates: [
        {
          label: "Claude coding prompt",
          brief:
            "Turn this messy coding ask into a Claude-ready prompt: explicit task, constraints first, file paths, acceptance criteria, 3-bullet trade-off discussion at the end.\n\nMessy ask:\n[paste here]",
          mode: "claude",
          quality: "code"
        },
        {
          label: "Repo audit",
          brief:
            "Audit the attached repo context: architecture summary, top 5 risks, dead code / duplication, test gaps, and a prioritized cleanup list. End with the single highest-leverage change.",
          mode: "claude",
          quality: "code"
        }
      ],
      notes: [
        {
          name: "Claude Coding · deploy checklist",
          body: "# Deploy checklist\n\n- Tests green locally\n- Typecheck + lint clean\n- Changelog / PR body written\n- Migrations reviewed\n- Rollback plan noted\n- Tag + release notes"
        }
      ]
    }
  },
  {
    id: "travel-os",
    kind: "brain",
    name: "Travel OS",
    blurb: "Lead board + travel workflows + CRM notes + ops dashboard.",
    author: "Operator.Center",
    version: "0.2.0",
    contents: {
      pinnedTerminal: {
        watchlists: ["Lead board", "Active trips"]
      },
      workflowNodes: [
        { kind: "mission", label: "Qualify lead", x: 30, y: 30 },
        { kind: "mission", label: "Draft itinerary", x: 210, y: 30 },
        { kind: "approval", label: "Client OK", x: 380, y: 80 },
        { kind: "export", label: "Send packet", x: 510, y: 80 }
      ],
      workflowEdges: [
        { from: 0, to: 1 },
        { from: 1, to: 2 },
        { from: 2, to: 3 }
      ],
      missionTemplates: [
        {
          label: "Travel itinerary",
          brief:
            "Draft a 7-day itinerary for a client (destination + dates I will provide). Day-by-day plan, supplier ask emails, internal checklist, refund policy block.",
          mode: "business",
          quality: "smart"
        },
        {
          label: "Lead follow-up",
          brief:
            "Write a warm follow-up to a travel lead who went quiet. Reference their stated dates/destination, offer two concrete next steps, keep it under 120 words.",
          mode: "business",
          quality: "fast"
        }
      ],
      notes: [
        {
          name: "Travel OS · refund policy",
          body: "# Refund policy\n\n- 30+ days before departure: full refund minus supplier fees.\n- 14–29 days: 50% refund.\n- <14 days: non-refundable; offer date change where supplier allows.\n- Document every exception in the client note."
        },
        {
          name: "Travel OS · lead intake",
          body: "# Lead intake checklist\n\n- Destination + flexible/fixed dates\n- Party size + ages\n- Budget band\n- Must-haves vs nice-to-haves\n- Source (referral / ad / repeat)"
        }
      ]
    }
  },
  {
    id: "crypto-research",
    kind: "brain",
    name: "Crypto Research",
    blurb: "Balanced bull/bear research note + scenarios + triggers.",
    author: "Operator.Center",
    version: "0.1.0",
    contents: {
      pinnedTerminal: {
        crypto: ["BTC", "ETH", "SOL"]
      },
      missionTemplates: [
        {
          label: "Crypto research note",
          brief:
            "Build a balanced research note for an asset I'll name. Bull case (3 evidence points), bear case (3 evidence points), indicators to watch, 2 scenarios with triggers. End with what would change my mind.",
          mode: "business",
          quality: "smart"
        }
      ]
    }
  },
  {
    id: "perfume-lab",
    kind: "brain",
    name: "Perfume Lab",
    blurb: "Batch workflow + inventory + split calculator + community notes.",
    author: "Operator.Center",
    version: "0.2.0",
    contents: {
      pinnedTerminal: {
        watchlists: ["Inventory", "Open batches"]
      },
      missionTemplates: [
        {
          label: "Perfume accord plan",
          brief:
            "Turn a creative direction into a perfume accord plan. Top / heart / base notes with rationale, 3 prototype splits, 5-question stability brief.",
          mode: "general",
          quality: "smart"
        },
        {
          label: "Batch split calculator",
          brief:
            "I'll give a target batch size and an accord in percentages. Produce a per-ingredient weight table, a dilution plan, and a maceration/aging checklist.",
          mode: "general",
          quality: "smart"
        }
      ]
    }
  },
  {
    id: "carpet-export",
    kind: "brain",
    name: "Carpet Export",
    blurb: "Shipment workflow + invoice templates + customer notes + logistics.",
    author: "Operator.Center",
    version: "0.2.0",
    contents: {
      pinnedTerminal: {
        watchlists: ["Open shipments", "Pricing sheet"],
        fx: ["USD/TRY", "EUR/TRY"]
      },
      workflowNodes: [
        { kind: "mission", label: "Quote + sample", x: 30, y: 30 },
        { kind: "mission", label: "Invoice + Incoterms", x: 210, y: 30 },
        { kind: "approval", label: "Logistics OK", x: 380, y: 80 },
        { kind: "export", label: "Ship + docs", x: 510, y: 80 }
      ],
      workflowEdges: [
        { from: 0, to: 1 },
        { from: 1, to: 2 },
        { from: 2, to: 3 }
      ],
      missionTemplates: [
        {
          label: "Export packet",
          brief:
            "Build an export packet for hand-knotted wool carpets from Turkey to a European wholesaler. HS code, Incoterms, sample brief, lead times, QA checklist.",
          mode: "business",
          quality: "smart"
        },
        {
          label: "Customer reply",
          brief:
            "Reply to a wholesale customer asking about lead times and pricing on a carpet order. Be specific, give a firm timeline range, list what you need from them to confirm.",
          mode: "business",
          quality: "fast"
        }
      ]
    }
  },
  {
    id: "ai-founder",
    kind: "brain",
    name: "AI Founder",
    blurb: "Repo intelligence + roadmap + go-to-market pack.",
    author: "Operator.Center",
    version: "0.1.0",
    contents: {
      workflowNodes: [
        { kind: "repo", label: "Repo context", x: 30, y: 30 },
        { kind: "mission", label: "Audit", x: 200, y: 30 },
        { kind: "mission", label: "Roadmap", x: 360, y: 30 },
        { kind: "export", label: "Ship plan", x: 520, y: 80 }
      ],
      workflowEdges: [
        { from: 0, to: 1 },
        { from: 1, to: 2 },
        { from: 2, to: 3 }
      ]
    }
  },
  {
    id: "prompt-engineer",
    kind: "template",
    name: "Prompt Engineer",
    blurb: "Freeform prompt → operator-grade brief.",
    author: "Operator.Center",
    version: "0.1.0",
    contents: {
      missionTemplates: [
        {
          label: "Operator brief",
          brief:
            "Rewrite this freeform prompt into an operator-grade brief: structured sections, explicit constraints, expected output format, anti-goals, and a quality score rubric the model should self-apply.\n\nOriginal:\n[paste here]",
          mode: "dev",
          quality: "expert"
        }
      ]
    }
  },
  {
    id: "agency-pack",
    kind: "brain",
    name: "Agency Pack",
    blurb: "Client intake → proposal → delivery workflow + status notes.",
    author: "Operator.Center",
    version: "0.1.0",
    contents: {
      pinnedTerminal: {
        watchlists: ["Active clients", "Pipeline"]
      },
      workflowNodes: [
        { kind: "mission", label: "Client intake", x: 30, y: 30 },
        { kind: "mission", label: "Proposal draft", x: 210, y: 30 },
        { kind: "approval", label: "Scope OK", x: 380, y: 80 },
        { kind: "mission", label: "Delivery plan", x: 510, y: 30 },
        { kind: "export", label: "Send", x: 660, y: 80 }
      ],
      workflowEdges: [
        { from: 0, to: 1 },
        { from: 1, to: 2 },
        { from: 2, to: 3 },
        { from: 3, to: 4 }
      ],
      missionTemplates: [
        {
          label: "Client proposal",
          brief:
            "Turn a discovery call summary into a client proposal: scope, deliverables, timeline, milestones, pricing options (good/better/best), and assumptions. End with a clear next step.",
          mode: "business",
          quality: "smart"
        },
        {
          label: "Weekly status",
          brief:
            "Write a concise weekly client status update: shipped this week, in progress, blocked (with the ask), next week's plan. Keep it skimmable.",
          mode: "business",
          quality: "fast"
        }
      ],
      notes: [
        {
          name: "Agency · pricing tiers",
          body: "# Pricing tiers\n\n- Good: fixed scope, async only.\n- Better: + weekly call, 2 revision rounds.\n- Best: + retainer, priority turnaround.\n- Always anchor on outcomes, not hours."
        }
      ]
    }
  },
  {
    id: "export-ops-pack",
    kind: "brain",
    name: "Export Ops Pack",
    blurb: "Order → invoice → shipment → docs runtime for export businesses.",
    author: "Operator.Center",
    version: "0.1.0",
    contents: {
      pinnedTerminal: {
        watchlists: ["Open orders", "Shipments in transit"],
        fx: ["USD/TRY", "EUR/USD"]
      },
      workflowNodes: [
        { kind: "mission", label: "Order intake", x: 30, y: 30 },
        { kind: "mission", label: "Proforma invoice", x: 210, y: 30 },
        { kind: "approval", label: "Payment OK", x: 380, y: 80 },
        { kind: "mission", label: "Shipping docs", x: 510, y: 30 },
        { kind: "export", label: "Dispatch", x: 660, y: 80 }
      ],
      workflowEdges: [
        { from: 0, to: 1 },
        { from: 1, to: 2 },
        { from: 2, to: 3 },
        { from: 3, to: 4 }
      ],
      missionTemplates: [
        {
          label: "Proforma invoice",
          brief:
            "Generate a proforma invoice draft from an order summary I provide: line items, Incoterms, currency, payment terms, validity, and bank/contact block placeholders.",
          mode: "business",
          quality: "smart"
        },
        {
          label: "Shipment update",
          brief:
            "Write a shipment status update for a customer: current stage, ETA range, tracking placeholder, and what (if anything) you need from them. Calm and precise.",
          mode: "business",
          quality: "fast"
        }
      ]
    }
  }
];

/** Install a pack into the current brain by mutating real stores. */
export function installPack(pack: Pack): {
  workflowNodesAdded: number;
  workflowEdgesAdded: number;
  templatesAdded: number;
  reposAdded: number;
  pinsAdded: number;
  notesAdded: number;
} {
  let workflowNodesAdded = 0;
  let workflowEdgesAdded = 0;
  let reposAdded = 0;
  let pinsAdded = 0;
  let notesAdded = 0;

  // Workflow nodes + edges
  if (pack.contents.workflowNodes && pack.contents.workflowNodes.length > 0) {
    const newNodes: WorkflowNode[] = pack.contents.workflowNodes.map((n) => ({
      ...n,
      id: `n-${pack.id}-${Math.random().toString(36).slice(2, 6)}`
    }));
    workflowNodesAdded = newNodes.length;
    let newEdges: WorkflowEdge[] = [];
    if (pack.contents.workflowEdges) {
      newEdges = pack.contents.workflowEdges
        .filter((e) => e.from < newNodes.length && e.to < newNodes.length)
        .map((e) => ({ from: newNodes[e.from].id, to: newNodes[e.to].id }));
      workflowEdgesAdded = newEdges.length;
    }
    useAtlasStore.setState((s) => ({
      workflowNodes: [...s.workflowNodes, ...newNodes],
      workflowEdges: [...s.workflowEdges, ...newEdges]
    }));
  }

  // Repo labels → brain memory sources
  if (pack.contents.repoLabels) {
    for (const label of pack.contents.repoLabels) {
      const exists = useBrainStore
        .getState()
        .memorySources.some((s) => s.kind === "github" && s.label === label);
      if (!exists) {
        useBrainStore.getState().addMemorySource({
          kind: "github",
          label,
          state: "configured"
        });
        reposAdded++;
      }
    }
  }

  // Terminal pins
  if (pack.contents.pinnedTerminal && typeof window !== "undefined") {
    try {
      const KEY = "promptready-os.intel-terminal";
      const raw = window.localStorage.getItem(KEY);
      const current = raw ? (JSON.parse(raw) as Record<string, Array<{ id: string; text: string; tab: string }>>) : {};
      for (const [tab, texts] of Object.entries(pack.contents.pinnedTerminal)) {
        const arr = current[tab] ?? [];
        for (const text of texts) {
          if (!arr.some((c) => c.text === text)) {
            arr.push({ id: `p-${Math.random().toString(36).slice(2, 6)}`, text, tab });
            pinsAdded++;
          }
        }
        current[tab] = arr;
      }
      window.localStorage.setItem(KEY, JSON.stringify(current));
    } catch {
      // ignore
    }
  }

  // Brain notes → real memory docs in the Memory layer.
  if (pack.contents.notes && pack.contents.notes.length > 0) {
    const existing = new Set(useAtlasStore.getState().memoryDocs.map((d) => d.name));
    const fresh = pack.contents.notes.filter((n) => !existing.has(n.name));
    if (fresh.length > 0) {
      useAtlasStore.getState().addMemoryDocs(
        fresh.map((n) => ({
          name: n.name,
          ext: "md",
          size: n.body.length,
          body: n.body
        }))
      );
      notesAdded = fresh.length;
    }
  }

  // Mission templates: stored locally in the packs install log so the
  // operator can re-bind them later. The user can also paste the
  // template's brief into Mission System directly.
  const templatesAdded = pack.contents.missionTemplates?.length ?? 0;
  if (templatesAdded > 0) {
    recordInstalledPack(pack);
  } else if (workflowNodesAdded + reposAdded + pinsAdded + notesAdded > 0) {
    recordInstalledPack(pack);
  }

  return {
    workflowNodesAdded,
    workflowEdgesAdded,
    templatesAdded,
    reposAdded,
    pinsAdded,
    notesAdded
  };
}

const INSTALLED_KEY = "promptready-os.installed-packs";

export interface InstalledPackRecord {
  id: string;
  name: string;
  installedAt: number;
}

export function recordInstalledPack(pack: Pack) {
  if (typeof window === "undefined") return;
  try {
    const cur = listInstalledPacks();
    const filtered = cur.filter((p) => p.id !== pack.id);
    const next: InstalledPackRecord[] = [
      { id: pack.id, name: pack.name, installedAt: Date.now() },
      ...filtered
    ].slice(0, 100);
    window.localStorage.setItem(INSTALLED_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}

export function listInstalledPacks(): InstalledPackRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(INSTALLED_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as InstalledPackRecord[];
  } catch {
    return [];
  }
}

export function exportPack(pack: Pack): { filename: string } {
  const blob = new Blob([JSON.stringify(pack, null, 2)], {
    type: "application/json"
  });
  const url = URL.createObjectURL(blob);
  const filename = `${pack.id}.pack.json`;
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  return { filename };
}

export async function importPackFromFile(file: File): Promise<Pack | null> {
  try {
    const text = await file.text();
    const parsed = JSON.parse(text) as Pack;
    if (!parsed || typeof parsed !== "object" || !parsed.contents) return null;
    return parsed;
  } catch {
    return null;
  }
}
