# BETA_TEST_CHECKLIST — Operator Core

Testable manual flow for the beta `.app`. No marketing — just steps +
expected results. Build/run first:

```bash
cd promptready-os
npm install
npm run dev                 # browser preview (http://localhost:1420)
# desktop beta artifact (macOS):
npm run tauri:build:app     # → src-tauri/target/release/bundle/macos/Operator Core.app
open "src-tauri/target/release/bundle/macos/Operator Core.app"
```

Legend: [ ] = to test. Note browser-preview caveats where listed.

## 1 · Open app
- [ ] App window opens (Operator Core), left nav rail visible, no blank screen.
- [ ] No console errors on load (DevTools → Console).

## 2 · Atlas (home `/`)
- [ ] Atlas grid renders; Brain Core center; primary cells visible.
- [ ] HUD shows real counters (missions/receipts/repos/health) + presence strip.
- [ ] If no brain yet: bootstrap overlay appears; create or load demo brain.

## 3 · Market Lab / MIC (`/market-lab`)
- [ ] Top bar clocks tick (NY/London/Tokyo/Istanbul); provider health shows counts.
- [ ] Crypto watchlist + heatmap show REAL CoinGecko prices/24h% (browser: works; let it load ~2s).
- [ ] Stocks / FX / Commodities / Polymarket are clearly **adapter-ready** (no numbers, muted pills).
- [ ] Risk regime is labeled "from crypto 24h % only" (not a fake index).
- [ ] News room shows real Hacker News headlines; create-mission + save-to-brain work.
- [ ] TV wall toggle: panels show real data or "adapter-ready"; never "live" when offline.
- [ ] No fake prices/odds/headlines anywhere.

## 4 · Voice / Jarvis Console (`/voice`)
- [ ] Voice orb shows "Atlas listening" (idle).
- [ ] Push-to-talk: if browser supports SpeechRecognition it transcribes ("browser speech API"); otherwise it's disabled with a clear message and text still works.
- [ ] Click a command chip (e.g. "create grocery list") → a task appears in the queue + Safe-Action preview on the right.
- [ ] Type "open market lab" → navigates to `/market-lab`.
- [ ] "summarize latest receipt" → note built from the real last receipt (no invented content).

## 5 · Paste cleaner (Voice → Paste Intelligence)
Paste this and click Clean:
```
01  const x = 1
02  console.log(x)
```
EOF
```
- [ ] Cleaned output drops the `01/02` line numbers, the ``` fence, and the trailing `EOF`.
- [ ] Change list explains what was removed; meaning unchanged.
- [ ] Also test: leading `$ ` shell prompts removed; stray lone `01`/`00` lines removed.
- [ ] Copy / Save to brain / Create mission from cleaned all work; nothing executes.

## 6 · Mission dispatch (`/mission-control` or Atlas dispatch)
- [ ] Dispatch a brief → stages stream → receipt appears with deliverables.
- [ ] Deterministic engine works with no network/keys. (Ollama only if running locally.)

## 7 · Replay (`/library`)
- [ ] Expand a receipt → Replay header shows lineage stats (memory/repos/chain/follow-ups).
- [ ] Copy replay / export .md work (read-only; no rerun).

## 8 · Live Wall (Intelligence Terminal → "Live Wall" or press `w`)
- [ ] Market Pulse chart renders from real samples; "collecting live samples" until ≥2.
- [ ] AI Newsfeed rotates real headlines; category chips switch feeds.
- [ ] Press `b` → Broadcast Mode enlarges headline + chart; shows "not financial advice · no live TV stream · data wall only".
- [ ] Press `t` → back to Terminal. Data sources legend visible.

## 9 · Packaging (Settings → Operator → packaging card)
- [ ] Card shows: primary beta artifact = Operator Core.app · command `npm run tauri:build:app` · DMG optional/blocked · signing/notarization/updater missing.
- [ ] `npm run tauri:build:app` produces the `.app` (unsigned). Gatekeeper warns → right-click → Open, or `xattr -dr com.apple.quarantine "Operator Core.app"`.

## 10 · Known limitations (expected, not bugs)
- DMG/installer blocked by `bundle_dmg.sh` Finder styling; `.app` is the beta artifact.
- App unsigned / not notarized.
- Telegram send/poll + keyed providers (TwelveData/FMP/NewsAPI/CryptoPanic/Etherscan) need the desktop runtime + env keys; browser preview shows them offline/adapter-ready.
- GUI launches from Finder don't inherit shell env — launch from terminal to pass connector env vars (secure keychain store planned).
- Email/WhatsApp = adapter design only (no OAuth, no sync).
- Voice desktop control = planned/locked (no shell, no filesystem writes).
- Stocks/FX/commodities/Polymarket/most market maps = adapter-ready (no live source yet).

## Quick route sweep
Open each and confirm it renders without error:
- [ ] `/`  [ ] `/market-lab`  [ ] `/voice`  [ ] `/terminal`  [ ] `/settings`
- [ ] `/memory`  [ ] `/library`  [ ] `/brain`  [ ] `/marketplace`  [ ] `/agents`  [ ] `/workflows`
