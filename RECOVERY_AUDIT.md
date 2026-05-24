# Recovery Audit · operator-next

Commit inspected: `0859723` (operator-next, Atlas Cinema mode).
Tree before audit: clean. No new features added. Audit-only wire-up.

## 1. Files added recently that exist on disk

```
promptready-os/src/components/atlas-cinema/AtlasCinema.tsx
promptready-os/src/components/atlas-cinema/CinemaCore.tsx
promptready-os/src/components/atlas-cinema/CinemaEdges.tsx
promptready-os/src/components/atlas-cinema/CinemaHud.tsx
promptready-os/src/components/atlas-cinema/CinemaInspector.tsx
promptready-os/src/components/atlas-cinema/CinemaModeSwitch.tsx
promptready-os/src/components/atlas-cinema/CinemaOrbit.tsx
promptready-os/src/components/atlas-cinema/cinemaAdapter.ts
promptready-os/src/styles/atlas-cinema.css
```

No `atlas-graph/` directory exists. There never was one — earlier sprints
proposed it but only Cinema landed. Treat any reference to "Atlas Graph"
as a future feature, not a current one.

## 2. Mount + route audit

| Surface              | Status     | File / mount point                                       | How user reaches it                                       |
|----------------------|------------|----------------------------------------------------------|-----------------------------------------------------------|
| Atlas (Cinema)       | mounted    | `routes.tsx:30,40` → `AtlasPage` → early-return `AtlasCinema` | App index (`/`) and `/atlas`; default canvas mode is cinema |
| Atlas (Blueprint)    | mounted    | `AtlasPage.tsx:282` (`homeMode === "blueprint"`)         | Switch via mode switch · "B" key or pill                  |
| Atlas (Operations)   | mounted    | `AtlasViews.tsx::OperationsView`                         | Switch via mode switch · "O" key or pill                  |
| Atlas (Live)         | mounted    | `AtlasViews.tsx::LiveView`                               | Switch via mode switch · "L" key or pill                  |
| Atlas (Graph)        | planned    | Tab exists in CinemaModeSwitch but no implementation     | Choosing "Graph" currently shows the legacy Atlas surface (intentional fallback) |
| Mission Control      | mounted    | `routes.tsx:31`                                          | Left rail · Work group                                    |
| Market Lab / MIC     | mounted    | `routes.tsx:36`                                          | `/market-lab` · left rail · Brain group                   |
| Intelligence Terminal| mounted    | `routes.tsx:35`                                          | `/terminal` · left rail · Brain group                     |
| Voice Console        | mounted    | `routes.tsx:37`                                          | `/voice` · left rail · Operator group                     |
| Workflows            | mounted    | `routes.tsx:38`                                          | `/workflows` · left rail · Work group                     |
| Memory               | mounted    | `routes.tsx:33`                                          | `/memory` · left rail · Brain group                       |
| Library / Delivery   | mounted    | `routes.tsx:34`                                          | `/library` · left rail · Work group                       |
| Brain · Repos        | mounted    | `routes.tsx:39`                                          | `/brain` · left rail · Brain group                        |
| Agents               | mounted    | `routes.tsx:32`                                          | `/agents` · left rail · Operator group                    |
| Marketplace          | mounted    | `routes.tsx:41`                                          | `/marketplace` · left rail · Operator group               |
| Settings             | mounted    | `routes.tsx:42`                                          | `/settings` · left rail · System group                    |
| Media Dock           | mounted    | `ShellLayout.tsx:226` (global)                           | Floating dock on every page                               |
| Command Palette      | mounted    | `ShellLayout.tsx:229` (global)                           | Cmd/Ctrl+K from any page                                  |
| Workspace Menu       | mounted    | `SettingsPage.tsx:182` (`<WorkspaceMenuCard />`)         | Settings → Workspace section                              |
| Ollama Setup         | mounted    | `SettingsPage.tsx:202` (`<OllamaSetupCard />`)           | Settings → Runtime section                                |
| Button Audit         | mounted    | `SettingsPage.tsx:323` (`<ButtonAuditCard />`)           | Settings → end of page                                    |
| Plans                | mounted    | `SettingsPage.tsx:181` (`<PlansCard />`)                 | Settings → Workspace section                              |
| Email Runtime        | mounted    | `SettingsPage.tsx:294` (`<EmailRuntimeCard />`)          | Settings → Remote section                                 |
| Communications       | mounted    | `SettingsPage.tsx:293` (`<CommunicationsRuntimeCard />`) | Settings → Remote section                                 |
| Telegram Companion   | mounted    | `SettingsPage.tsx:295` (`<TelegramCompanionCard />`)     | Settings → Remote section                                 |
| Telegram Live Bridge | mounted    | `SettingsPage.tsx:296` (`<TelegramLiveCard />`)          | Settings → Remote section                                 |

All surfaces are mounted. Nothing is unreachable.

## 3. Atlas-specific verification

1. `AtlasCinema` imported? **Yes** · `AtlasPage.tsx:36`.
2. Default mode is `cinema`? **Yes** · `loadCanvasMode()` returns `"cinema"` when the
   localStorage key is missing or invalid (`AtlasPage.tsx:47-58`).
3. Does old localStorage override cinema? **Possible if a previous session wrote
   `"graph"` / `"blueprint"` / `"operations"` / `"live"` to the key.** These are
   valid modes so the loader honors them — by design. To force-reset, see the
   new **Reset** button below.
4. `AtlasCinema` rendered when mode === `"cinema"`? **Yes** · `AtlasPage.tsx:239-241`
   (early return — old Atlas JSX never executes in cinema mode).
5. Way to switch back to cinema? **Yes** ·
   - "Cinema" button in the Atlas header (`AtlasPage.tsx:251-258`)
   - Press `C` from anywhere in Atlas
   - The new floating Mode Switch pill at the bottom of the Cinema scene
6. Old Atlas hidden in cinema mode? **Yes** · the early return bypasses the entire
   blueprint/operations/live JSX tree.
7. Route correct? **Yes** · both `/` (index) and `/atlas` mount `AtlasPage`.

## 4. Fixes applied this pass

Only **additive UX** changes — no rewrites, no new files except this report.

* `CinemaModeSwitch.tsx`
  - Added a small divider after the 5 mode buttons.
  - Added a debug chip `mode:<value>` so the user can immediately see what
    localStorage holds.
  - Added a **Reset** button that clears `promptready-os.atlas.canvas` and
    sets the mode back to `cinema`. No other data is touched.

No other file required a fix:
* `loadCanvasMode()` already validates the stored value against `VALID_CANVAS_MODES`
  and falls through to `"cinema"` for missing / invalid keys. The migration
  requested in Step 4 of the spec is already in effect — no code change needed.
* `globals.css` already imports `atlas-cinema.css` (line 2).
* All other surfaces above are mounted via the existing files.

## 5. Build result

* `promptready-os` · `tsc -b && vite build` → **clean** · 1684 modules · CSS 55.11 kB · JS 990.94 kB.
* `promptfixer-sidekick` · `next build` → **clean** · all routes prerender.
* Tauri not exercised in this pass (per spec).

## 6. Reset / debug instructions for the user

If after pulling these changes Atlas still does not show the Cinema scene:

1. Open Atlas. Look at the floating pill at the bottom-center of the page.
2. Read the small `mode:<value>` chip — that is the value currently in
   `localStorage.promptready-os.atlas.canvas`.
3. Click **Reset** in the same pill. The key is cleared and Cinema renders.
4. If the pill itself is missing, open DevTools and run:
   `localStorage.removeItem("promptready-os.atlas.canvas"); location.reload();`

## 7. Remaining planned items (carried, not implemented)

* Atlas **Graph** canvas mode · pill exists but renders the legacy Atlas surface
  for now. No React Flow installed. Honest fallback.
* MediaPipe gesture layer · stub only, no webcam.
* Native speech bridge · `SPEECH_BRIDGE_PLAN.md` documents the macOS WKWebView gap.
* Tauri DMG bundling · `.app` only (per `TAURI_BUILD_REPORT.md`).
