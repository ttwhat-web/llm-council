# DEMO_CHECKLIST · today's presentation

> Branch: `claude/promptfixer-sidekick-Q1zpg` · Phases 12 → 30 shipped
> Build status (both): clean

## 0 · Pre-flight (run once before you go on stage)

```bash
# Pull the latest
git checkout claude/promptfixer-sidekick-Q1zpg
git pull --ff-only

# Desktop · install + dev shell on port 1420
cd promptready-os
npm install          # ~30s if cache is warm
npm run dev          # http://localhost:1420  (browser preview)
# OR  npm run tauri:dev  (native desktop window — recommended if Rust + Tauri toolchain present)

# Website · install + dev shell on port 3000
cd ../promptfixer-sidekick
npm install
npm run dev          # http://localhost:3000
```

Optional (only if you want the Ollama beat):

```bash
ollama serve
ollama pull gemma2:2b
```

If Tauri build fails (Rust toolchain missing / signing prompts), fall back to `npm run dev` in `promptready-os/` — the browser preview is feature-complete.

---

## 1 · Demo URLs

| Surface | URL |
|---|---|
| Marketing landing | http://localhost:3000/ |
| Download page | http://localhost:3000/download |
| Founders waitlist | http://localhost:3000/founders |
| Roadmap 30 | http://localhost:3000/roadmap |
| 90s demo script | http://localhost:3000/docs/demo-script |
| Pricing | http://localhost:3000/pricing |
| Desktop Atlas (home) | http://localhost:1420/ |
| Mission Control | http://localhost:1420/mission-control |
| Marketplace | http://localhost:1420/marketplace |
| Brain | http://localhost:1420/brain |
| Intelligence Terminal | http://localhost:1420/terminal |
| Library (Operations Archive) | http://localhost:1420/library |
| Workflows (planner) | http://localhost:1420/workflows |
| Settings (Roadmap 30, Runtime Bus, audit, snapshots, etc.) | http://localhost:1420/settings |

---

## 2 · Twelve-beat demo path (~6 min)

1. **Website** → `localhost:3000` · hero CTAs: Download · Founders · Roadmap 30.
2. **`/download`** → six platform cards · source build works today, signed installers labelled `coming soon`. Show the `git clone … && npm run tauri:build` block.
3. **`/roadmap`** → six shipped, four planned · honest counters at the top.
4. **Open desktop** → `localhost:1420` lands on **Atlas**. Brain Graph orbits Brain Core. Mention HUD: brain · sources · missions · receipts · snapshots.
5. **Settings → Demo workspace → Seed demo workspace** · receipts, workflow nodes, terminal pins, memory docs, inbox items populate. Return to Atlas — every cell now shows real numbers + the "demo data · labelled" pill.
6. **Top-right HUD: space switcher** → "+ new brain space" → "Investor Demo" · operator · create + switch. Switch back to the seeded demo to keep the rest of the demo intact.
7. **Atlas Mission System cell** → expand panel → Mission templates → category Build → pick "Startup CTO". Brief populates · Dispatch from Atlas. Watch the execution graph + flight recorder fill, mission-system edge pulses.
8. **Atlas Workflow Layer cell** → seeded canvas Mission → Repo → Approval → Export. Press **Run workflow** → pause at approval. Click **Resume after approval** → run completes, Export downloads a real `.md`.
9. **Settings → Telegram bridge simulator** → type `/run hello operators` → the same handler a real bot will call dispatches a mission, outputs the receipt id.
10. **`/marketplace`** → click **Install** on "Claude Coding". Open Atlas → Workflow Layer to show the new nodes landed on the canvas.
11. **Atlas → Operations mode → Agent Queue** → click **tick** on `research`. Real follow-up mission dispatches against the last receipt.
12. **Settings → Runtime Bus + Roadmap 30** · close on `/founders` ("first 100 operators get Founder Lifetime") + show the Activation field accepting a code.

---

## 3 · Known limitations (say these out loud · they're features of the honesty story)

- Signed installers ship after Apple Developer ID + Windows EV cert land in CI secrets. Source build works today.
- Telegram bot networking lives behind the adapter seam · the simulator exercises the exact handlers a real bot will call.
- Mobile companion: pairing code generation is real; the phone-side app ships in Phase 27.
- Cloud sync, SSO + RBAC, encrypted-snapshot passphrase: planned · clearly labelled in Settings.
- Connector hub: local folder import is the only `ready` connector today.
- Repo intelligence: uses imported files as context · no GitHub fetch yet.
- Ollama is opt-in. Without it, the deterministic engine still produces every deliverable.

---

## 4 · Emergency fallback

| Failure mode | Fix |
|---|---|
| `npm run tauri:dev` errors on Rust toolchain | Use `npm run dev` and demo in the browser at `localhost:1420`. All features identical. |
| Ollama not running | Just skip beat 7's engine toggle. The deterministic engine still ships every deliverable. |
| Port 1420 or 3000 in use | `PORT=… npm run dev` for the website; for desktop edit `vite.config.ts` or kill the conflicting process. |
| localStorage state corrupted on dev machine | Settings → Desktop · trust layer → **Reset workspace**. Re-seed demo. |
| Marketplace install appears to do nothing | The pack contents were already installed. Switch to a fresh brain space first, then install. |
| Workflow Run does nothing | Make sure the canvas has at least one `mission` node. Seed demo workspace if empty. |
| Recovery banner appears mid-demo | Click **discard** · it just means a prior session left state. |

---

## 5 · One-liner pitch (keep in your pocket)

> PromptReady OS is a local-first AI operator console — your brain, your repos, your missions, your workflows on one blueprint canvas. Source-buildable today, signed installers next. Sellable beta as of this branch.

