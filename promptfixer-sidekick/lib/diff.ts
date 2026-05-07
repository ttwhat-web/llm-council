/**
 * Lightweight line diff used by the DiffView output panel.
 *
 * Set-based rather than LCS — for our purpose (showing what survived from
 * the user's raw input vs. what the engine added) line membership is what
 * matters, not order. Cheap, allocation-free for the common case, and
 * produces the two arrays the UI renders side-by-side.
 */

export type DiffOp = "common" | "removed" | "added";

export interface DiffLine {
  text: string;
  op: DiffOp;
}

export interface DiffResult {
  left: DiffLine[];
  right: DiffLine[];
  /** Counts useful for badges. */
  removedLines: number;
  addedLines: number;
  commonLines: number;
}

/**
 * Diff `before` against `after` line-by-line.
 *
 * The "left" stream walks `before`: lines also present in `after` are tagged
 * `common`; lines absent from `after` are `removed`.
 * The "right" stream walks `after`: lines also present in `before` are
 * `common`; lines absent from `before` are `added`.
 *
 * Empty / whitespace-only lines are tagged `common` to avoid noise.
 */
export function diffLines(before: string, after: string): DiffResult {
  const left = (before || "").replace(/\r\n/g, "\n").split("\n");
  const right = (after || "").replace(/\r\n/g, "\n").split("\n");

  const beforeKeys = new Set(left.map(keyOf));
  const afterKeys = new Set(right.map(keyOf));

  let removed = 0;
  let added = 0;
  let common = 0;

  const leftOut: DiffLine[] = left.map((text) => {
    const k = keyOf(text);
    if (k === "" || afterKeys.has(k)) {
      if (k !== "") common++;
      return { text, op: "common" };
    }
    removed++;
    return { text, op: "removed" };
  });

  const rightOut: DiffLine[] = right.map((text) => {
    const k = keyOf(text);
    if (k === "" || beforeKeys.has(k)) {
      return { text, op: "common" };
    }
    added++;
    return { text, op: "added" };
  });

  return {
    left: leftOut,
    right: rightOut,
    removedLines: removed,
    addedLines: added,
    commonLines: common
  };
}

function keyOf(line: string): string {
  return line.trim().toLowerCase();
}
