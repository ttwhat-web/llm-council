# INSTALL_STATUS — Operator.Center (Sprint D)

Per-item install + runtime status. States: **installed · working · partial · blocked**.
Honest baseline: the browser preview can run local-first features + CORS-friendly
public providers; CORS / key / OAuth providers need the Tauri runtime.

## Build / run commands

```bash
# Desktop app (Vite + Tauri front-end)
cd promptready-os
npm install
npm run dev          # browser preview on http://localhost:1420
npm run build        # tsc -b && vite build  (verifies types + bundle)
npm run tauri:dev    # full desktop runtime (if tauri CLI installed)

# Marketing site
cd ../promptfixer-sidekick
npm install
npm run build
```

## Items

| Item | State | Notes | Command / path |
|---|---|---|---|
| **Ollama** | partial → working | Working once a local Ollama daemon runs; Model Lab probes `/api/tags`, lists models, offers pull helpers. | `curl -fsSL https://ollama.com/install.sh \| sh` · `ollama serve` · `ollama pull gemma2:2b` → Settings → Intelligence → Model Lab |
| **Telegram** | partial | `telegramLive.ts` send/poll exist; needs token + chat id; CORS blocks browser → needs Tauri. Field-test checklist shows real per-step status. | set `VITE_TELEGRAM_BOT_TOKEN` + `VITE_TELEGRAM_ALLOWED_CHAT_ID`, run desktop → Settings → Remote → Telegram Live |
| **CoinGecko** | working | Real public crypto prices (no key, CORS-friendly). | Intelligence Terminal → Markets → Crypto |
| **News (Hacker News)** | working | Real public headlines via Algolia (no key, CORS-friendly). | Intelligence Terminal → Research → News Feed |
| **Marketplace** | installed/working | Local install of workflows, templates, watchlists, repo presets, brain notes. | Marketplace → Install a pack |
| **Replay** | installed/working | Read-only replay (copy / export .md / follow-up) + v2 lineage stats. No rerun. | Library → expand a receipt |
| **Presence** | installed/working | Real rollup incl. markets/news/email adapter status; ollama flips ready only after a successful probe. | Atlas HUD strip · Settings → Runtime Bus |
| **Passport** | working | Export + (new) import-with-preview (no overwrite). | Settings → Brain → Brain Passport |

## Blocked (need Tauri runtime or keys)
- Telegram send/poll (CORS) · NewsAPI / CryptoPanic (CORS+key) · TwelveData / FMP / Etherscan (key) · Gmail / IMAP / Outlook (OAuth, design only).
