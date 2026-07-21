# BLOOMBERG_TERMINAL_REPO_AUDIT

## Decision (Sprint UX-FIX · Option 1)
**NOT IMPORTED · NOT USED · ORIGINAL IMPLEMENTATION.** The Market Lab /
Terminal Pro density and layout are our own work in the Operator.Center
design language. No code, branding, trade dress, or assets from the repo
below are present or used. This is the explicit, final position.

## Repo in question
`https://github.com/bloomberg-terminal/bloomberg-terminal-free.git`

## Is it present in this repo?
**NO — NOT imported.** Verified by searching the whole tree:
- Not in `package.json` / lockfile dependencies.
- Not a git submodule (no `.gitmodules`).
- No cloned/copied source under `promptready-os/` or `promptfixer-sidekick/`.
- No code references.
- The only matches for "bloomberg" in our code are:
  1. a comment in `IntelligenceTerminalPage.tsx` ("Bloomberg-density …"),
  2. a UI accent theme labelled "Bloomberg" in `store/theme.ts` (an amber
     palette — a label only, no Bloomberg assets).

So nothing from that repo is integrated. We do not pretend otherwise.

## License status
**Unverified.** Network access is sandboxed in this environment, so the
repo's actual `LICENSE` could not be fetched and confirmed. Until the license
is verified by a human, treat the repo as **do-not-copy**.

Note also: "Bloomberg" and the Bloomberg Terminal trade dress (its specific
amber-on-black look, keyboard, function codes) are **trademarks**. A
third-party repo named "bloomberg-terminal-free" does not grant any rights to
the Bloomberg brand regardless of its code license.

## What could be reused (inspiration only)
- General **information-density** ideas: compact monospace rows, tape/ticker
  layouts, multi-panel grids, a right-side status rail. These are generic UI
  patterns, not protected.
- Public-data wiring patterns (already implemented ourselves: CoinGecko +
  Hacker News with honest health states).

## What must NOT be reused
- Any source code, unless/until its license is verified to permit reuse and is
  compatible with this project — and even then, copied code must carry its
  license/attribution.
- The Bloomberg **name, logo, function codes, or 1:1 color/trade-dress**
  (amber-on-black "Bloomberg" look). No brand imitation or lookalike.

## Recommended integration plan
1. **Do not clone or vendor** the repo into this project now.
2. Build our own dense "Operator Intelligence Terminal" UX from scratch
   (this sprint, Section C) using only:
   - our existing adapter registry + provider health,
   - real CoinGecko / Hacker News fetches,
   - generic terminal-density patterns,
   - our own Operator.Center palette (NOT Bloomberg amber-on-black 1:1).
3. If, later, specific code from that repo is genuinely useful: first verify
   its `LICENSE`, confirm compatibility, isolate it behind an adapter, and
   add attribution — as a deliberate, reviewed step, never a blind copy.
4. Consider relabelling the "Bloomberg" accent theme to a neutral name
   (e.g. "Terminal Amber") to avoid brand association. (Left unchanged for now
   to avoid breaking persisted user theme selections; flagged as a follow-up.)

## Verdict
Not imported. No license/brand risk has been taken on. Proceed with an
original dense terminal UX; keep Bloomberg strictly as distant inspiration.
