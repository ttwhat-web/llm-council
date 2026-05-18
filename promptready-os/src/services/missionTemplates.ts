/**
 * Mission Templates · Phase 18.
 *
 * Pre-built mission briefs that let an operator go from blank to
 * deliverables in one click. Every template is honest — it's just a
 * seed brief and recommended mode/quality. Nothing is fetched.
 */

export interface MissionTemplate {
  id: string;
  category: string;
  label: string;
  blurb: string;
  brief: string;
  mode: string;
  quality: string;
}

export const MISSION_TEMPLATES: MissionTemplate[] = [
  {
    id: "startup-cto",
    category: "Build",
    label: "Startup CTO",
    blurb: "First 30 days: stack, architecture, and a hire/build plan.",
    brief:
      "I'm the new CTO at a 3-person seed-stage startup. Produce my first-30-days plan: stack picks with one-line justification, architecture choices, what to build vs buy, the first 3 hires, and the 5 risks I should prepare the team for.",
    mode: "business",
    quality: "smart"
  },
  {
    id: "local-ai-builder",
    category: "Build",
    label: "Local AI Builder",
    blurb: "Ship a local-first AI feature on Ollama in a week.",
    brief:
      "Help me ship a local-first AI feature using Ollama in 7 days. Pick the model, define the loop (input → engine → output), the smallest UI surface, what data stays local, and the 3 acceptance tests. Assume a typescript codebase.",
    mode: "dev",
    quality: "code"
  },
  {
    id: "trading-research",
    category: "Research",
    label: "Trading Research",
    blurb: "Build the case for / against an asset · honest evidence.",
    brief:
      "Build a balanced research note for an asset I'll name. Bull case (3 points · evidence), bear case (3 points · evidence), key indicators to watch, two scenarios with triggers. End with what would change my mind. Do not invent prices.",
    mode: "business",
    quality: "smart"
  },
  {
    id: "travel-agency",
    category: "Ops",
    label: "Travel Agency",
    blurb: "Itinerary scaffold + supplier comms · ready to send.",
    brief:
      "Draft a 7-day itinerary for a client (destination + dates I'll provide). Day-by-day plan, supplier ask emails, internal checklist, refund policy block. Tone: confident, concise, professional.",
    mode: "business",
    quality: "smart"
  },
  {
    id: "carpet-export",
    category: "Ops",
    label: "Carpet Export",
    blurb: "Export packet · HS code, Incoterms, sample brief.",
    brief:
      "Build an export packet for hand-knotted wool carpets from Turkey to a European wholesaler. Include HS code candidates, Incoterms recommendation, sample shipment brief, expected lead times, and the QA checklist before each pallet.",
    mode: "business",
    quality: "smart"
  },
  {
    id: "perfume-lab",
    category: "Ops",
    label: "Perfume Lab",
    blurb: "Brief → fragrance accord plan · top/heart/base.",
    brief:
      "Turn a creative direction into a perfume accord plan. Top / heart / base notes with rationale, 3 prototype splits to evaluate, the 5-question stability brief, and what samples to send the client first. Honest about which steps need lab evaluation.",
    mode: "general",
    quality: "smart"
  },
  {
    id: "claude-coding",
    category: "Build",
    label: "Claude Coding",
    blurb: "Turn a messy ask into a Claude-ready coding prompt.",
    brief:
      "Take this messy coding ask and turn it into a Claude-ready prompt: explicit task, constraints first, file paths, acceptance criteria, and a 3-bullet trade-off discussion request at the end.\n\nMessy ask:\n[paste here]",
    mode: "claude",
    quality: "code"
  },
  {
    id: "prompt-engineer",
    category: "Build",
    label: "Prompt Engineer",
    blurb: "Rewrite a freeform prompt into a clean operator brief.",
    brief:
      "Rewrite this freeform prompt into an operator-grade brief: structured sections, explicit constraints, expected output format, anti-goals, and a quality score rubric the model should self-apply before answering.\n\nOriginal:\n[paste here]",
    mode: "dev",
    quality: "expert"
  }
];

export const TEMPLATE_CATEGORIES = Array.from(
  new Set(MISSION_TEMPLATES.map((t) => t.category))
);
