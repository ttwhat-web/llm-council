# SPEECH_BRIDGE_PLAN — native voice for the desktop app

## Why
Browser `SpeechRecognition` / `webkitSpeechRecognition` is **not available
in macOS WKWebView** (the Tauri webview). So inside the packaged
`Operator Core.app`, push-to-talk transcription does not work — only the
**text command mode** does. We will NOT fake voice. This document is the
roadmap for a real native bridge; it is **planned, not implemented** in
this sprint (kept out until it can be done safely and reviewed).

## Status: PLANNED · not implemented
- Web/browser preview: real browser SpeechRecognition when present.
- Desktop app: text mode only today; native bridge planned per below.
- Voice Diagnostics surfaces "native speech available: no · planned" and,
  in the desktop app, "browser speech unavailable in desktop app; native
  bridge planned".

## Target architecture (macOS first)
Use Apple's on-device **Speech framework** (`SFSpeechRecognizer`) +
`AVAudioEngine`, exposed to the frontend through Tauri commands/events.

### Rust / Tauri commands (src-tauri)
- `speech_available() -> { available: bool, onDevice: bool, reason }`
  - reports whether a recognizer exists for the locale and on-device mode.
- `speech_request_permission() -> { authorized: bool, state }`
  - calls `SFSpeechRecognizer.requestAuthorization` + `AVAudioSession`
    microphone permission. Never starts capture without it.
- `speech_start()` / `speech_stop()`
  - start/stop an `AVAudioEngine` tap → `SFSpeechAudioBufferRecognitionRequest`.
  - prefer `requiresOnDeviceRecognition = true` (no audio leaves the machine).
- Emit a Tauri **event** `speech://transcript` with
  `{ text, isFinal, confidence }` as partial/final results arrive.
- Hard stop: tearing down the engine + request on `speech_stop()` and on
  window close; a visible "MIC ACTIVE" state stays bound to engine running.

Implementation notes:
- Wrap the Objective-C/Swift Speech APIs via a small Swift helper compiled
  into the Tauri binary, or the `objc2` crates. Gate everything behind
  `#[cfg(target_os = "macos")]`.
- Add `NSSpeechRecognitionUsageDescription` + `NSMicrophoneUsageDescription`
  to the bundle Info.plist (tauri.conf bundle macOS plist) before shipping.

### Frontend bridge (services/runtimeBridge.ts — when built)
- `nativeSpeechStatus()` → invokes `speech_available` (Tauri only).
- `nativeSpeechStart/Stop()` → invoke commands; subscribe to
  `speech://transcript` via `@tauri-apps/api/event` listen().
- `useSpeech` gains a native path: if `isTauri()` and native available →
  use the bridge; else browser SpeechRecognition; else text mode. The UI
  (orb, MIC banner, confidence bar) is unchanged — it just gets a real
  transcript source on desktop.

### Fallback chain (honest)
1. Desktop + native available → native Speech framework.
2. Browser with SpeechRecognition → browser engine.
3. Neither → **text mode** (always works). Diagnostics say which path is live.

## Windows / Linux (later)
- Windows: `Windows.Media.SpeechRecognition` (WinRT) via a native command.
- Linux: Vosk / whisper.cpp local model adapter (no cloud).
- Until then: text mode + diagnostics report "native speech: no".

## Safety rules (carry over · non-negotiable)
- On-device recognition preferred; no audio uploaded by us.
- Mic only while the user holds/toggles talk; large MIC ACTIVE indicator.
- No background/wake listening (wake mode stays planned/locked).
- Permission requested explicitly; denied state shown clearly.
- No fake transcript/confidence ever.

## Acceptance criteria (when implemented)
- `speech_available` truthfully reflects recognizer + permission.
- Holding talk streams real partial transcripts to the orb; release stops
  and tears down the engine.
- Voice Diagnostics flips "native speech available" to yes and the path
  indicator to "native".
- Text mode remains the guaranteed fallback on every platform.
