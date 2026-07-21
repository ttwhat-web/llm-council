/**
 * Command Test Console · Operator Voice Console.
 *
 * One-click checks that exercise the REAL code paths the page uses — the
 * actual `parseCommand` parser, the actual `cleanPaste` service, and the
 * actual `makeTask` helper — NOT a separate mock. Each test reports
 * pass/fail, the input that ran, a short result, and a timestamp so the
 * operator can verify behaviour. Nothing here executes shell, filesystem,
 * or desktop actions: parser/clean are pure, and "navigation" tests assert
 * the parse result only (no real navigation).
 */

import { useCallback, useState } from "react";
import clsx from "clsx";
import { CheckCircle2, FlaskConical, Play, XCircle } from "lucide-react";

import { cleanPaste } from "@/services/pasteClean";
import { parseCommand } from "./commandParser";
import { makeTask } from "./voiceTasks";

interface TestResult {
  id: string;
  name: string;
  input: string;
  pass: boolean;
  output: string;
  at: number;
}

interface TestCase {
  id: string;
  name: string;
  /** Returns the input that ran + pass/fail + a short human result. */
  run: () => { input: string; pass: boolean; output: string };
}

const SAMPLE_TRAILING_01 = ["01\tconst a = 1;", "02\tconst b = 2;", "01", "console.log(a + b);"].join("\n");
const SAMPLE_FENCES = ["```ts", "const x = 42;", "```"].join("\n");

const TESTS: TestCase[] = [
  {
    id: "grocery",
    name: "create grocery list",
    run: () => {
      const p = parseCommand("create grocery list");
      const pass = !p.blocked && p.payload?.kind === "note" && p.title === "Grocery shopping";
      const task = makeTask({ title: p.title, source: "test", status: "ready", actionType: p.actionType });
      return { input: "create grocery list", pass, output: `task "${task.title}" · ${p.actionType}` };
    }
  },
  {
    id: "clean-01",
    name: "clean pasted code · trailing 01",
    run: () => {
      const r = cleanPaste(SAMPLE_TRAILING_01);
      // artifact gone = no stray lone "01" line + no leading gutter survives
      const hasStray01 = r.cleaned.split("\n").some((l) => /^\s*01\s*$/.test(l));
      const hasGutter = /^\s*01\t/.test(r.cleaned);
      const pass = !hasStray01 && !hasGutter;
      return {
        input: JSON.stringify(SAMPLE_TRAILING_01),
        pass,
        output: pass ? `artifacts removed · ${r.cleaned.length} chars` : `artifact remains: ${r.cleaned}`
      };
    }
  },
  {
    id: "fences",
    name: "remove markdown fences",
    run: () => {
      const r = cleanPaste(SAMPLE_FENCES);
      const hasFence = /```/.test(r.cleaned);
      const pass = !hasFence && r.cleaned.includes("const x = 42;");
      return {
        input: JSON.stringify(SAMPLE_FENCES),
        pass,
        output: pass ? `fences gone · "${r.cleaned}"` : `fence remains: ${r.cleaned}`
      };
    }
  },
  {
    id: "claude-task",
    name: "create Claude task",
    run: () => {
      const p = parseCommand("create claude task refactor the parser");
      const pass = p.payload?.kind === "mission" && p.payload.mode === "claude";
      return {
        input: "create claude task refactor the parser",
        pass,
        output: pass ? `mission · claude · "${p.title}"` : `unexpected: ${p.actionType}`
      };
    }
  },
  {
    id: "market-lab",
    name: "open Market Lab",
    run: () => {
      const p = parseCommand("open market lab");
      const pass = p.payload?.kind === "navigation" && p.payload.to === "/market-lab";
      return {
        input: "open market lab",
        pass,
        output: pass ? `navigation → /market-lab (not executed)` : `unexpected: ${p.actionType}`
      };
    }
  },
  {
    id: "receipt",
    name: "summarize latest receipt",
    run: () => {
      const p = parseCommand("summarize latest receipt");
      const pass = p.payload?.kind === "summarize-receipt" && p.actionType === "note";
      return {
        input: "summarize latest receipt",
        pass,
        output: pass ? `note · summarize-receipt (real fields only)` : `unexpected: ${p.actionType}`
      };
    }
  },
  {
    id: "note",
    name: "save note",
    run: () => {
      const p = parseCommand("save note buy domain renewal");
      const pass =
        p.payload?.kind === "note" && p.payload.body.includes("buy domain renewal") && !p.blocked;
      return {
        input: "save note buy domain renewal",
        pass,
        output: pass ? `note · "${p.title}"` : `unexpected: ${p.actionType}`
      };
    }
  },
  {
    id: "mission",
    name: "create mission",
    run: () => {
      const p = parseCommand("create mission audit the landing page");
      const pass = p.payload?.kind === "mission" && p.payload.mode === "general";
      return {
        input: "create mission audit the landing page",
        pass,
        output: pass ? `mission · general · "${p.title}"` : `unexpected: ${p.actionType}`
      };
    }
  }
];

function rid(): string {
  return `res-${Math.random().toString(36).slice(2, 9)}`;
}

export function TestConsole() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [running, setRunning] = useState(false);

  const runOne = useCallback((tc: TestCase): TestResult => {
    let r: { input: string; pass: boolean; output: string };
    try {
      r = tc.run();
    } catch (err) {
      r = { input: tc.name, pass: false, output: err instanceof Error ? err.message : "threw" };
    }
    return { id: rid(), name: tc.name, input: r.input, pass: r.pass, output: r.output, at: Date.now() };
  }, []);

  const runTest = useCallback(
    (tc: TestCase) => {
      const res = runOne(tc);
      setResults((prev) => [res, ...prev].slice(0, 60));
    },
    [runOne]
  );

  const runAll = useCallback(async () => {
    setRunning(true);
    const collected: TestResult[] = [];
    for (const tc of TESTS) {
      collected.push(runOne(tc));
      // sequential, yielding to the event loop so the UI can paint each row
      // eslint-disable-next-line no-await-in-loop
      await new Promise((r) => setTimeout(r, 40));
      setResults([...collected].reverse().concat([]).slice(0, 60));
    }
    setResults([...collected].reverse().slice(0, 60));
    setRunning(false);
  }, [runOne]);

  const passCount = results.length === 0 ? 0 : results.filter((r) => r.pass).length;

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-white">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <FlaskConical className="h-4 w-4 text-accent" />
          <span className="text-[13px] font-semibold">Test Console</span>
          <span className="font-mono text-[9px] uppercase tracking-wider text-white/40">
            real parser · real cleanPaste · no mocks
          </span>
        </div>
        <div className="flex items-center gap-2">
          {results.length > 0 && (
            <span className="font-mono text-[9px] uppercase tracking-wider text-white/50">
              {passCount}/{results.length} pass
            </span>
          )}
          <button
            type="button"
            onClick={() => void runAll()}
            disabled={running}
            className="inline-flex items-center gap-1.5 rounded-md border border-accent/40 bg-accent/[0.1] px-2.5 py-1 font-mono text-[9px] uppercase tracking-wider text-accent transition hover:bg-accent/[0.15] disabled:opacity-40"
          >
            <Play className="h-3 w-3" /> {running ? "running…" : "run all"}
          </button>
        </div>
      </header>

      <div className="flex flex-wrap gap-1.5">
        {TESTS.map((tc) => (
          <button
            key={tc.id}
            type="button"
            onClick={() => runTest(tc)}
            className="rounded border border-white/10 bg-white/[0.03] px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-white/60 transition hover:bg-white/[0.06]"
          >
            {tc.name}
          </button>
        ))}
      </div>

      {results.length === 0 ? (
        <p className="rounded-xl border border-dashed border-white/10 bg-white/[0.01] px-3 py-3 text-center font-mono text-[10px] uppercase tracking-wider text-white/40">
          no results yet · run a test to exercise the real code paths
        </p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {results.map((r) => (
            <li
              key={r.id}
              className={clsx(
                "flex flex-col gap-1 rounded-lg border p-2.5",
                r.pass
                  ? "border-emerald-400/25 bg-emerald-500/[0.05]"
                  : "border-rose-400/30 bg-rose-500/[0.06]"
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-1.5">
                  {r.pass ? (
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-300" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5 shrink-0 text-rose-300" />
                  )}
                  <span className="truncate text-[11.5px] font-medium text-white/90">{r.name}</span>
                </div>
                <span className="shrink-0 font-mono text-[8.5px] uppercase tracking-wider text-white/35">
                  {new Date(r.at).toLocaleTimeString()}
                </span>
              </div>
              <span className="truncate font-mono text-[9.5px] text-white/45" title={r.input}>
                in · {r.input}
              </span>
              <span
                className={clsx(
                  "truncate text-[10.5px]",
                  r.pass ? "text-emerald-200/85" : "text-rose-200/85"
                )}
                title={r.output}
              >
                out · {r.output}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
