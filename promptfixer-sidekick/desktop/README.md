# Desktop layer

The floating, always-on-top assistant ships as a Tauri shell that loads
`/floating` from the Next.js app.

## Why Tauri (not Electron)

- ~10–20× smaller binaries.
- Native `webkit2gtk` / `WKWebView` / `WebView2` — no Chromium runtime to maintain.
- First-class global shortcut, system tray, transparent + decoration-less windows.

## Develop

In one terminal:

```bash
ollama serve                       # start the local model runtime
ollama pull gemma4                 # smart supervisor (Local quality default)
ollama pull qwen2.5-coder:7b       # code / terminal / AS400
ollama pull gemma2:2b              # fast fallback / low-resource
# ollama pull hermes3              # experimental agent (optional)
```

You don't need every model — pull whatever fits your hardware. PromptFixer
falls through `OLLAMA_FALLBACKS` and then the deterministic engine if a
profile model is missing. See the root README for the full profile table.

In another:

```bash
npm install
npm run tauri:dev
```

`tauri:dev` boots `next dev` (port 3030), then opens the floating window pointed
at `http://localhost:3030/floating`.

## Global Shortcut

`Cmd/Ctrl + Shift + P` toggles the window. The shortcut is registered in
`src-tauri/src/main.rs`. If the combo is already claimed by another app, the
shortcut silently fails — open the window from the tray icon instead.

## Build a release binary

```bash
npm run tauri:build
```

Artifacts land in `desktop/src-tauri/target/release/bundle/`.
