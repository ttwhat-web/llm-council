# Dormant Modules

Removed from Cmd+K's nav list (they don't fit "one continuous
experience"), but not deleted. Per standing instruction: no dormant
module stays dormant forever without an explicit future. Each entry
below carries a status and a reason; this file is the thing that
prevents a graveyard. Revisit at every Delete Audit.

**Statuses:** `Core` (actively load-bearing today, despite being out of
primary nav) · `Phase 2` (planned after launch, ties to a named
roadmap item) · `Experimental` (real, but its purpose needs re-deciding)
· `Candidate for deletion` (no roadmap tie, recommend removing once
confirmed nothing depends on it).

| Module | Route | Status | Why |
|---|---|---|---|
| **Console** (Mission Control) | `/console` | **Core** | Not actually dormant — the Home composer still dispatches here for any request the Delegation Engine doesn't recognize as a supported business command. Removing it would break that fallback today. |
| **Markets** | `/markets` | Phase 2 | Real chart workspace. Ties to the "Live Intelligence Dock / World Brain" direction — live market awareness surfaced through Operator rather than a standalone chart page. |
| **Workflows** | `/workflows` | Phase 2 | Multi-step mission templates. Ties to a future natural-language automation builder ("every Friday, follow up with non-responders") — but that doesn't exist yet; today it's a template list disconnected from the Action Queue. |
| **Agents** | `/agents` | Phase 2 | Explicitly a placeholder today (its own file says so). Ties to a future multi-agent "AI Workforce" — real only once that's built. |
| **Voice** | `/voice` | Phase 2 | Real browser Web Speech integration, not wired into the Action Queue or Delegation. Ties to a future "Operator, handle my morning" spoken interface. |
| **Terminal** (Intelligence Terminal) | `/terminal` | Phase 2 | Live feeds concept. Ties to World Brain / Live Intelligence Dock — currently has no live data source. |
| **Library** | `/library` | Experimental | A real "Operations Archive" for the old Mission system's deliverables. Needs a decision: is this the same concept as the Action Queue's Timeline (in which case it's redundant and should merge into it), or a genuinely separate archive? Don't keep both indefinitely without deciding. |
| **Brain** (identity page) | `/brain` | Experimental | Backs `store/brain.ts`, which onboarding still calls into (`bootstrap()`) for compatibility. Its founder-facing role just changed this sprint (onboarding no longer asks the "name your brain / pick a mode" questions it used to configure) — what this page is *for* now needs re-deciding, not assumed. |
| **Memory** (Brain Notes vault) | `/memory` | Phase 2 — flagged | Manual notes, unrelated code path from Operator's real memory (Founder Memory + Memory Distillation, which is live and load-bearing). Same word, two different systems — a real naming collision worth resolving (rename or merge) before it confuses anyone, even though the underlying capability (manual notes) may still be worth keeping. |
| **Marketplace** | `/marketplace` | Candidate for deletion | No roadmap tie identified. Recommend removing once confirmed nothing else depends on it. |
| **Launchpad** | `/launchpad` | Candidate for deletion | "External apps" launcher with no roadmap tie identified. Recommend removing once confirmed nothing else depends on it. |
| **Atlas** | `/atlas` | Candidate for deletion | Explicitly superseded already — `HomePage.tsx` carries a live redirect migrating any `/atlas` deep-link back to Home, with a comment calling it "the previous home." The strongest-evidenced deletion candidate here. |

**Rule going forward:** nothing gets added to this list without a
status. At the next Delete Audit (post-launch, based on real usage —
not assumptions, per standing instruction), re-run this table: promote
what got real usage, delete what didn't.
