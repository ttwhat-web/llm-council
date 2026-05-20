/**
 * Paste cleaner · Sprint K.2.
 *
 * Conservative cleanup of text/code pasted from AI tools or terminals.
 * It strips copy artifacts WITHOUT changing meaning: markdown code
 * fences, leading line-number gutters (the "01 / 02 …" prefixes), stray
 * lone "01"/"00" lines, "Copy code" buttons, leading shell prompts, and a
 * trailing lone "EOF". It never executes anything and never reorders or
 * rewrites real content.
 */

export interface CleanResult {
  cleaned: string;
  changes: string[];
}

export function cleanPaste(input: string): CleanResult {
  const changes: string[] = [];
  let lines = input.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");

  // 1 · markdown code fences (``` or ```lang) on their own line
  const beforeFences = lines.length;
  lines = lines.filter((l) => !/^\s*`{3,}[\w-]*\s*$/.test(l));
  if (lines.length !== beforeFences) changes.push(`removed ${beforeFences - lines.length} markdown fence line(s)`);

  // 2 · "Copy code" / "Copy" artifact lines
  const beforeCopy = lines.length;
  lines = lines.filter((l) => !/^\s*(copy code|copy)\s*$/i.test(l));
  if (lines.length !== beforeCopy) changes.push("removed copy-button artifact(s)");

  // 3 · leading line-number gutter (e.g. "01  code", "  12\tcode", "3: code")
  //     Only strip when it's a consistent gutter across most non-empty lines.
  const nonEmpty = lines.filter((l) => l.trim() !== "");
  const gutter = /^\s*\d{1,4}[\t :|]\s?/;
  const gutterCount = nonEmpty.filter((l) => gutter.test(l)).length;
  if (nonEmpty.length >= 3 && gutterCount >= Math.ceil(nonEmpty.length * 0.6)) {
    lines = lines.map((l) => l.replace(gutter, ""));
    changes.push("stripped line-number gutter");
  }

  // 4 · stray lone "01" / "00" artifact lines
  const beforeZeros = lines.length;
  lines = lines.filter((l) => !/^\s*0[01]\s*$/.test(l));
  if (lines.length !== beforeZeros) changes.push(`removed ${beforeZeros - lines.length} stray "01/00" line(s)`);

  // 5 · leading shell prompts ("$ ", "% ", "> ")
  let promptHits = 0;
  lines = lines.map((l) => {
    const m = l.replace(/^\s*[$%>]\s+/, "");
    if (m !== l) promptHits++;
    return m;
  });
  if (promptHits > 0) changes.push(`removed ${promptHits} shell prompt prefix(es)`);

  // 6 · trailing lone "EOF" marker
  while (lines.length > 0 && /^\s*EOF\s*$/.test(lines[lines.length - 1])) {
    lines.pop();
    changes.push('removed trailing "EOF" marker');
  }

  // 7 · trailing whitespace per line + collapse 3+ blank lines to one
  lines = lines.map((l) => l.replace(/[ \t]+$/, ""));
  const collapsed: string[] = [];
  let blanks = 0;
  for (const l of lines) {
    if (l.trim() === "") {
      blanks++;
      if (blanks >= 2) continue;
    } else {
      blanks = 0;
    }
    collapsed.push(l);
  }

  let cleaned = collapsed.join("\n").replace(/^\n+/, "").replace(/\n+$/, "\n");
  cleaned = cleaned.replace(/\n+$/, "");

  if (changes.length === 0) changes.push("no artifacts found · text already clean");

  return { cleaned, changes };
}
