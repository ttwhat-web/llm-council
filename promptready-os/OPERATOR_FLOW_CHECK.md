# OPERATOR_FLOW_CHECK — Operator.Center (Sprint D)

End-to-end operator path, with honest pass/fail and where each step is verified.
Verified by code review + type-clean build; live network steps (Telegram, public
providers) require the running app (network is sandboxed in CI).

## Path

```
Create Brain → Import repo → Run mission → Generate receipt → Replay
→ Export passport → Telegram push → Marketplace install → Morning brief
```

## Results

| # | Step | State | How verified | Failure / caveat |
|---|---|---|---|---|
| 1 | Create Brain | PASS | BrainBootstrap writes identity to `useBrainStore`; gates the whole app. | — |
| 2 | Import repo | PASS | Mission Control Repo Context adds a `github` memory source; appears in Atlas Repo runtime. | Manual context only — no live indexer (honest "planned"). |
| 3 | Run mission | PASS | `useMissionStore.dispatch` runs deterministic engine (or Ollama if selected); appends receipt. | Ollama path needs local daemon. |
| 4 | Generate receipt | PASS | Receipt persisted to history with events + deliverables. | — |
| 5 | Replay | PASS | Library → expand → Replay header copy/export/follow-up; v2 lineage stats (memory/repos/chain/follow-ups). Read-only, no rerun. | — |
| 6 | Export passport | PASS | Brain Passport exports `atlas-passport-*.brain`; import preview validates + does not overwrite. | Passport is a summary; full restore = `.brainpack` snapshot. |
| 7 | Telegram push | PARTIAL | Field-test checklist reflects real token/chat/send/poll state. | Needs token + Tauri runtime (CORS); browser preview shows "manual/offline". |
| 8 | Marketplace install | PASS | Installs workflows/templates/watchlists/notes into real stores; install log + audit. | — |
| 9 | Morning brief | PASS | Operator Bulletin shows real Operator row + Health; external rows show honest adapter state. | External feeds offline/adapter-ready until wired. |

## Recorded failures / blockers in the happy path
- **Telegram push (step 7)** is the only step not fully verifiable without the desktop runtime + a real bot token (browser CORS). All other steps complete locally.
- Ollama-routed missions (step 3 variant) require a running local daemon; deterministic engine always works offline.

## Conclusion
The core operator loop (1→6, 8, 9) is **runnable today** locally. Step 7 is gated on the Tauri runtime. No store migration or new routes were required.
