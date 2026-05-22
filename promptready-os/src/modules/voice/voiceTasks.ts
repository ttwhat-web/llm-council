/**
 * Voice task queue + voice captures · local-first persistence.
 *
 * Plain localStorage helpers (no networking, no execution). The queue is
 * the operator's prepared-but-not-run task list; voice captures are the
 * raw transcripts/typed commands kept for the Memory Context panel.
 *
 *   queue    → key "promptready-os.voice.tasks"
 *   captures → key "promptready-os.voice.captures"
 */

import type { VoiceActionType } from "./commandParser";

export type TaskStatus = "pending" | "ready" | "blocked" | "done";

export interface VoiceTask {
  id: string;
  title: string;
  source: string;
  status: TaskStatus;
  createdAt: number;
  actionType: VoiceActionType;
  /** Optional body the operator can copy / save to Brain. */
  body?: string;
}

export interface VoiceCapture {
  id: string;
  text: string;
  at: number;
  /** "speech" = browser SpeechRecognition · "text" = typed. */
  via: "speech" | "text";
}

const TASKS_KEY = "promptready-os.voice.tasks";
const CAPTURES_KEY = "promptready-os.voice.captures";

function rid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

export function loadTasks(): VoiceTask[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(TASKS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as VoiceTask[]) : [];
  } catch {
    return [];
  }
}

export function saveTasks(tasks: VoiceTask[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(TASKS_KEY, JSON.stringify(tasks.slice(0, 200)));
  } catch {
    // ignore quota
  }
}

export function makeTask(input: Omit<VoiceTask, "id" | "createdAt">): VoiceTask {
  return { ...input, id: rid("task"), createdAt: Date.now() };
}

export function loadCaptures(): VoiceCapture[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CAPTURES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as VoiceCapture[]) : [];
  } catch {
    return [];
  }
}

export function saveCaptures(captures: VoiceCapture[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CAPTURES_KEY, JSON.stringify(captures.slice(0, 100)));
  } catch {
    // ignore quota
  }
}

export function makeCapture(text: string, via: VoiceCapture["via"]): VoiceCapture {
  return { id: rid("cap"), text, at: Date.now(), via };
}

// ---------------------------------------------------------------------------
// Smart Paste Autopilot · per-device "auto-clean pastes" preference.
//
//   key → "promptready-os.voice.autoclean"  ("1" = on)
//
// When on, future pastes auto-apply cleanPaste — but the page still shows
// the notice + Undo, never executes, and never auto-pastes elsewhere.
// ---------------------------------------------------------------------------

const AUTOCLEAN_KEY = "promptready-os.voice.autoclean";

export function loadAutoClean(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(AUTOCLEAN_KEY) === "1";
  } catch {
    return false;
  }
}

export function saveAutoClean(on: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(AUTOCLEAN_KEY, on ? "1" : "0");
  } catch {
    // ignore quota
  }
}
