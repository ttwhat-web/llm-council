/**
 * Deterministic input cleaner. Strips clipboard noise, normalises whitespace,
 * and surfaces the changes it made so the UI can show them.
 */

export interface CleanResult {
  cleaned: string;
  removed: string[];
}

const ZERO_WIDTH = /[​-‍﻿]/g;
const SMART_QUOTES: Array<[RegExp, string]> = [
  [/[‘’‚‛]/g, "'"],
  [/[“”„‟]/g, '"'],
  [/[–—]/g, "-"],
  [/…/g, "..."],
  [/ /g, " "]
];

const NOISE_LINES = [
  /^\s*Copy code\s*$/i,
  /^\s*\d+\s*\/\s*\d+\s*$/,
  /^\s*Sent from my (iPhone|iPad|Android).*/i,
  /^\s*-{3,}\s*Original Message\s*-{3,}\s*$/i,
  /^\s*On .+ wrote:\s*$/i
];

export function cleanInput(raw: string): CleanResult {
  const removed: string[] = [];
  if (!raw) return { cleaned: "", removed };

  let text = raw.replace(/\r\n/g, "\n");

  if (ZERO_WIDTH.test(text)) {
    text = text.replace(ZERO_WIDTH, "");
    removed.push("zero-width characters");
  }

  for (const [pattern, replacement] of SMART_QUOTES) {
    if (pattern.test(text)) {
      text = text.replace(pattern, replacement);
    }
  }

  const before = text.split("\n").length;
  const filtered = text
    .split("\n")
    .filter((line) => !NOISE_LINES.some((p) => p.test(line)));
  const after = filtered.length;
  if (after < before) removed.push(`${before - after} boilerplate line(s)`);
  text = filtered.join("\n");

  // Collapse runs of >2 blank lines, trim trailing whitespace per line.
  text = text
    .split("\n")
    .map((l) => l.replace(/[ \t]+$/g, ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  // Strip leading filler like "hey can u" / "pls" / "asap".
  const fillerPrefixes = [
    /^(hey+|hi+|yo+|sup|please|pls|plz|kindly)[,:!\s]+/i,
    /^(can|could|would) (you|u) (please |pls |plz )?/i
  ];
  for (const p of fillerPrefixes) {
    if (p.test(text)) {
      text = text.replace(p, "");
      removed.push("conversational filler");
      break;
    }
  }

  // Normalise repeated punctuation (!!!, ???, ...).
  text = text.replace(/([!?])\1{2,}/g, "$1");

  return { cleaned: text, removed };
}
