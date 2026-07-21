# Broken Button Repair

UX repair pass only. No new dependencies, no package metadata changes, no push.

| area | button/control | before | after | status |
| --- | --- | --- | --- | --- |
| Market Lab | `orderflow` layout preset | Could reopen a dense layout that contributed to horizontal expansion. | Visible but disabled with reason: caused horizontal expansion. Stable right rail still shows order book, time & sales, depth, and heatmap. | disabled |
| Market Lab | `macro` layout preset | Could add extra grid content while macro providers are adapter-ready. | Visible but disabled with reason: needs provider/sizing repair. | disabled |
| Market Lab | `wall` layout preset | Dense wall layout was not viewport-safe. | Visible but disabled with reason: not layout-safe. | disabled |
| Market Lab | saved dense layout from localStorage / hot reload state | Old `orderflow`, `macro`, or `wall` values could come back on load, and a hot session could still mark a disabled preset selected. | Unsupported saved/in-memory layouts normalize to single-chart layout before render and before persistence. | fixed |
| Market Lab | watchlist symbols | Worked, but buttons did not expose clear title/aria status. | Buttons now say `Select <symbol> · WORKS`. Unsupported assets still show no-source state. | fixed |
| Market Lab | chart canvas interactions | Could stretch/overflow while canvas dimensions updated. | Canvas wrappers are clamped to `max-width:100%`, `min-width:0`, and hidden horizontal overflow. | fixed |
| Apps / App Dock | Add custom web app URL | Button was disabled when empty, but long text could overflow in the dock. | Still disabled when empty with reason; text can wrap within the panel. | fixed |
| Apps / App Dock | Clear recent apps | Button was disabled when no recents. | Kept disabled with clear reason; panel width is clamped. | fixed |
| Apps / App Dock | Gmail / WhatsApp / Telegram / YouTube / TradingView | External launch behavior was real, but page layout was too small and card-like. | External launchers retained; Apps page restored as a wider launcher/dashboard workspace. | fixed |
| Shell | Header status rail | Could compete with route content/header width on smaller screens. | Hidden until wide screens; main content owns width and route area hides horizontal overflow. | fixed |

Notes:
- No fake embedded web-app behavior was added.
- No working dashboard widgets were deleted.
- Market Lab TV/wall behavior is not exposed as a working route control.
