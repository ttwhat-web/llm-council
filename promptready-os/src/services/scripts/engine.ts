/**
 * Script Lab · safe mini DSL · TradingView-Pine-lite.
 *
 * Custom tokenizer + Pratt parser + tree-walking evaluator. NO eval,
 * NO new Function, NO module import. Only the registered builtins and
 * source identifiers are reachable; everything else is a parse error.
 *
 * Statements are line-separated. Supported syntax:
 *
 *   let X = expr             // bind name
 *   plot(expr, "label")      // overlay on chart (main or pane, per kind)
 *   hline(NUMBER, "label")   // horizontal line
 *   // comments
 *
 * Expression grammar:
 *   primary  = NUMBER | IDENT | call | "(" expr ")"
 *   call     = IDENT "(" [expr ("," expr)*] ")"
 *   unary    = ("-" | "+") unary | primary
 *   muldiv   = unary (("*" | "/" | "%") unary)*
 *   addsub   = muldiv (("+" | "-") muldiv)*
 *   compare  = addsub (("<" | "<=" | ">" | ">=" | "==" | "!=") addsub)?
 *   expr     = compare
 *
 * Builtins:
 *   sma(source, length)               → Series.line (main)
 *   ema(source, length)               → Series.line (main)
 *   rsi(source, length)               → Series.line (rsi pane)
 *   bb(source, length, mult)          → Series.bands  (main, 3 lines)
 *   plot(series, "label")             → renders per series.pane
 *   hline(value, "label")             → renders per active scope (main)
 *
 * Sources (number[] · same length as candles):
 *   close · open · high · low · volume · hl2 · hlc3 · ohlc4
 *
 * Any other identifier (without `let`) is a runtime error. Strings are
 * only valid as the second argument of plot / hline.
 */

import { sma, ema, rsi, bb, type BollingerBands } from "./indicators";

export type Pane = "main" | "rsi";

export interface PlotLine {
  kind: "line";
  values: number[];
  label: string;
  pane: Pane;
  color: string;
}

export interface PlotBands {
  kind: "bands";
  upper: number[];
  mid: number[];
  lower: number[];
  label: string;
  pane: Pane;
  color: string;
}

export type Plot = PlotLine | PlotBands;

export interface Hline {
  value: number;
  label: string;
  pane: Pane;
  color: string;
}

export interface ScriptResult {
  ok: boolean;
  error?: string;
  errorLine?: number;
  plots: Plot[];
  hlines: Hline[];
  log: string[];
  hadRsi: boolean;
}

export interface Candle {
  t: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// ---------------------------------------------------------------------------
// Tokens
// ---------------------------------------------------------------------------

type TokenKind =
  | "num" | "str" | "ident" | "lparen" | "rparen" | "comma" | "assign"
  | "plus" | "minus" | "star" | "slash" | "percent"
  | "lt" | "le" | "gt" | "ge" | "eq" | "ne"
  | "let" | "newline" | "eof";

interface Token {
  kind: TokenKind;
  value?: string;
  num?: number;
  line: number;
}

function tokenize(src: string): Token[] {
  const out: Token[] = [];
  let i = 0;
  let line = 1;
  const len = src.length;
  while (i < len) {
    const c = src[i];
    if (c === "\n") {
      out.push({ kind: "newline", line });
      line++;
      i++;
      continue;
    }
    if (c === " " || c === "\t" || c === "\r") {
      i++;
      continue;
    }
    if (c === "/" && src[i + 1] === "/") {
      while (i < len && src[i] !== "\n") i++;
      continue;
    }
    if (c === "(") { out.push({ kind: "lparen", line }); i++; continue; }
    if (c === ")") { out.push({ kind: "rparen", line }); i++; continue; }
    if (c === ",") { out.push({ kind: "comma", line }); i++; continue; }
    if (c === "+") { out.push({ kind: "plus", line }); i++; continue; }
    if (c === "-") { out.push({ kind: "minus", line }); i++; continue; }
    if (c === "*") { out.push({ kind: "star", line }); i++; continue; }
    if (c === "/") { out.push({ kind: "slash", line }); i++; continue; }
    if (c === "%") { out.push({ kind: "percent", line }); i++; continue; }
    if (c === "<") {
      if (src[i + 1] === "=") { out.push({ kind: "le", line }); i += 2; continue; }
      out.push({ kind: "lt", line }); i++; continue;
    }
    if (c === ">") {
      if (src[i + 1] === "=") { out.push({ kind: "ge", line }); i += 2; continue; }
      out.push({ kind: "gt", line }); i++; continue;
    }
    if (c === "=") {
      if (src[i + 1] === "=") { out.push({ kind: "eq", line }); i += 2; continue; }
      out.push({ kind: "assign", line }); i++; continue;
    }
    if (c === "!" && src[i + 1] === "=") {
      out.push({ kind: "ne", line }); i += 2; continue;
    }
    if (c === '"' || c === "'") {
      const quote = c;
      let j = i + 1;
      let s = "";
      while (j < len && src[j] !== quote) {
        if (src[j] === "\n") throw new ParseError("unterminated string", line);
        s += src[j];
        j++;
      }
      if (j >= len) throw new ParseError("unterminated string", line);
      out.push({ kind: "str", value: s, line });
      i = j + 1;
      continue;
    }
    if ((c >= "0" && c <= "9") || (c === "." && src[i + 1] >= "0" && src[i + 1] <= "9")) {
      let j = i;
      while (j < len && ((src[j] >= "0" && src[j] <= "9") || src[j] === ".")) j++;
      const lex = src.slice(i, j);
      const n = Number(lex);
      if (!Number.isFinite(n)) throw new ParseError(`bad number '${lex}'`, line);
      out.push({ kind: "num", num: n, line });
      i = j;
      continue;
    }
    if ((c >= "a" && c <= "z") || (c >= "A" && c <= "Z") || c === "_") {
      let j = i;
      while (
        j < len &&
        ((src[j] >= "a" && src[j] <= "z") ||
          (src[j] >= "A" && src[j] <= "Z") ||
          (src[j] >= "0" && src[j] <= "9") ||
          src[j] === "_")
      )
        j++;
      const id = src.slice(i, j);
      if (id === "let") out.push({ kind: "let", line });
      else out.push({ kind: "ident", value: id, line });
      i = j;
      continue;
    }
    throw new ParseError(`unexpected character '${c}'`, line);
  }
  out.push({ kind: "eof", line });
  return out;
}

// ---------------------------------------------------------------------------
// Parser · produces an AST
// ---------------------------------------------------------------------------

type Node =
  | { kind: "num"; v: number; line: number }
  | { kind: "str"; v: string; line: number }
  | { kind: "ident"; name: string; line: number }
  | { kind: "call"; name: string; args: Node[]; line: number }
  | { kind: "binop"; op: string; left: Node; right: Node; line: number }
  | { kind: "unop"; op: string; arg: Node; line: number };

type Stmt =
  | { kind: "let"; name: string; expr: Node; line: number }
  | { kind: "expr"; expr: Node; line: number };

class ParseError extends Error {
  line: number;
  constructor(msg: string, line: number) {
    super(msg);
    this.line = line;
  }
}

function parse(tokens: Token[]): Stmt[] {
  let pos = 0;
  const peek = () => tokens[pos];
  const eat = (k: TokenKind): Token => {
    if (tokens[pos].kind !== k) {
      throw new ParseError(`expected ${k}, got ${tokens[pos].kind}`, tokens[pos].line);
    }
    return tokens[pos++];
  };
  const consumeNewlines = () => {
    while (peek().kind === "newline") pos++;
  };

  const parsePrimary = (): Node => {
    const t = peek();
    if (t.kind === "num") { pos++; return { kind: "num", v: t.num!, line: t.line }; }
    if (t.kind === "str") { pos++; return { kind: "str", v: t.value!, line: t.line }; }
    if (t.kind === "ident") {
      pos++;
      if (peek().kind === "lparen") {
        pos++;
        const args: Node[] = [];
        if (peek().kind !== "rparen") {
          args.push(parseExpr());
          while (peek().kind === "comma") {
            pos++;
            args.push(parseExpr());
          }
        }
        eat("rparen");
        return { kind: "call", name: t.value!, args, line: t.line };
      }
      return { kind: "ident", name: t.value!, line: t.line };
    }
    if (t.kind === "lparen") {
      pos++;
      const e = parseExpr();
      eat("rparen");
      return e;
    }
    throw new ParseError(`unexpected token ${t.kind}`, t.line);
  };

  const parseUnary = (): Node => {
    const t = peek();
    if (t.kind === "minus" || t.kind === "plus") {
      pos++;
      const arg = parseUnary();
      return { kind: "unop", op: t.kind === "minus" ? "-" : "+", arg, line: t.line };
    }
    return parsePrimary();
  };

  const parseMul = (): Node => {
    let left = parseUnary();
    while (peek().kind === "star" || peek().kind === "slash" || peek().kind === "percent") {
      const t = peek();
      pos++;
      const right = parseUnary();
      const op = t.kind === "star" ? "*" : t.kind === "slash" ? "/" : "%";
      left = { kind: "binop", op, left, right, line: t.line };
    }
    return left;
  };

  const parseAdd = (): Node => {
    let left = parseMul();
    while (peek().kind === "plus" || peek().kind === "minus") {
      const t = peek();
      pos++;
      const right = parseMul();
      left = { kind: "binop", op: t.kind === "plus" ? "+" : "-", left, right, line: t.line };
    }
    return left;
  };

  const parseCmp = (): Node => {
    const left = parseAdd();
    const t = peek();
    if (t.kind === "lt" || t.kind === "le" || t.kind === "gt" || t.kind === "ge" || t.kind === "eq" || t.kind === "ne") {
      pos++;
      const right = parseAdd();
      const op = ({ lt: "<", le: "<=", gt: ">", ge: ">=", eq: "==", ne: "!=" } as const)[t.kind];
      return { kind: "binop", op, left, right, line: t.line };
    }
    return left;
  };

  const parseExpr = (): Node => parseCmp();

  const parseStmt = (): Stmt => {
    const t = peek();
    if (t.kind === "let") {
      pos++;
      const name = eat("ident").value!;
      eat("assign");
      const e = parseExpr();
      return { kind: "let", name, expr: e, line: t.line };
    }
    const e = parseExpr();
    return { kind: "expr", expr: e, line: t.line };
  };

  const stmts: Stmt[] = [];
  consumeNewlines();
  while (peek().kind !== "eof") {
    const s = parseStmt();
    stmts.push(s);
    if (peek().kind === "newline") consumeNewlines();
    else if (peek().kind !== "eof") throw new ParseError(`expected newline, got ${peek().kind}`, peek().line);
  }
  return stmts;
}

// ---------------------------------------------------------------------------
// Evaluator
// ---------------------------------------------------------------------------

type Value =
  | { kind: "number"; v: number }
  | { kind: "string"; v: string }
  | { kind: "line"; values: number[]; pane: Pane }
  | { kind: "bands"; upper: number[]; mid: number[]; lower: number[]; pane: Pane };

class RuntimeError extends Error {
  line: number;
  constructor(msg: string, line: number) {
    super(msg);
    this.line = line;
  }
}

function asNumber(v: Value, line: number): number {
  if (v.kind === "number") return v.v;
  throw new RuntimeError("expected a number", line);
}

function asInt(v: Value, line: number, name: string): number {
  const n = asNumber(v, line);
  if (!Number.isFinite(n) || n <= 0 || Math.floor(n) !== n) {
    throw new RuntimeError(`${name}: length must be a positive integer`, line);
  }
  return n;
}

function asSeries(v: Value, line: number): number[] {
  if (v.kind === "line") return v.values;
  throw new RuntimeError("expected a series (close/open/sma(...)/ema(...) etc.)", line);
}

function asString(v: Value, line: number): string {
  if (v.kind === "string") return v.v;
  throw new RuntimeError("expected a string label", line);
}

const COLORS_OVERLAY = [
  "rgb(124,155,255)", "rgb(245,196,120)", "rgb(196,150,236)",
  "rgb(120,222,200)", "rgb(255,156,180)"
];

export function runScript(source: string, candles: Candle[]): ScriptResult {
  const log: string[] = [];
  const plots: Plot[] = [];
  const hlines: Hline[] = [];
  let hadRsi = false;
  let colorIdx = 0;

  if (!candles || candles.length === 0) {
    return {
      ok: false,
      error: "script requires candles",
      plots: [],
      hlines: [],
      log: [],
      hadRsi: false
    };
  }

  // Build source series.
  const close = candles.map((c) => c.close);
  const open = candles.map((c) => c.open);
  const high = candles.map((c) => c.high);
  const low = candles.map((c) => c.low);
  const volume = candles.map((c) => c.volume);
  const hl2 = candles.map((c) => (c.high + c.low) / 2);
  const hlc3 = candles.map((c) => (c.high + c.low + c.close) / 3);
  const ohlc4 = candles.map((c) => (c.open + c.high + c.low + c.close) / 4);

  const sourceEnv: Record<string, number[]> = { close, open, high, low, volume, hl2, hlc3, ohlc4 };
  const scope: Record<string, Value> = {};

  const evalNode = (n: Node): Value => {
    switch (n.kind) {
      case "num":
        return { kind: "number", v: n.v };
      case "str":
        return { kind: "string", v: n.v };
      case "ident": {
        if (n.name in sourceEnv) return { kind: "line", values: sourceEnv[n.name], pane: "main" };
        if (n.name in scope) return scope[n.name];
        throw new RuntimeError(`unknown identifier '${n.name}'`, n.line);
      }
      case "unop": {
        const v = asNumber(evalNode(n.arg), n.line);
        return { kind: "number", v: n.op === "-" ? -v : v };
      }
      case "binop": {
        const l = evalNode(n.left);
        const r = evalNode(n.right);
        if (l.kind !== "number" || r.kind !== "number") {
          throw new RuntimeError("binary operators support numbers only (use series via builtins)", n.line);
        }
        const a = l.v, b = r.v;
        switch (n.op) {
          case "+": return { kind: "number", v: a + b };
          case "-": return { kind: "number", v: a - b };
          case "*": return { kind: "number", v: a * b };
          case "/": return { kind: "number", v: a / b };
          case "%": return { kind: "number", v: a % b };
          case "<": return { kind: "number", v: a < b ? 1 : 0 };
          case "<=": return { kind: "number", v: a <= b ? 1 : 0 };
          case ">": return { kind: "number", v: a > b ? 1 : 0 };
          case ">=": return { kind: "number", v: a >= b ? 1 : 0 };
          case "==": return { kind: "number", v: a === b ? 1 : 0 };
          case "!=": return { kind: "number", v: a !== b ? 1 : 0 };
        }
        throw new RuntimeError(`unknown operator '${n.op}'`, n.line);
      }
      case "call": {
        const args = n.args.map(evalNode);
        switch (n.name) {
          case "sma": {
            if (args.length !== 2) throw new RuntimeError("sma(source, length)", n.line);
            return { kind: "line", values: sma(asSeries(args[0], n.line), asInt(args[1], n.line, "sma")), pane: "main" };
          }
          case "ema": {
            if (args.length !== 2) throw new RuntimeError("ema(source, length)", n.line);
            return { kind: "line", values: ema(asSeries(args[0], n.line), asInt(args[1], n.line, "ema")), pane: "main" };
          }
          case "rsi": {
            if (args.length !== 2) throw new RuntimeError("rsi(source, length)", n.line);
            hadRsi = true;
            return { kind: "line", values: rsi(asSeries(args[0], n.line), asInt(args[1], n.line, "rsi")), pane: "rsi" };
          }
          case "bb": {
            if (args.length !== 3) throw new RuntimeError("bb(source, length, mult)", n.line);
            const b: BollingerBands = bb(asSeries(args[0], n.line), asInt(args[1], n.line, "bb"), asNumber(args[2], n.line));
            return { kind: "bands", upper: b.upper, mid: b.mid, lower: b.lower, pane: "main" };
          }
          case "plot": {
            if (args.length < 2) throw new RuntimeError("plot(series, \"label\")", n.line);
            const label = asString(args[1], n.line);
            const series = args[0];
            const color = COLORS_OVERLAY[colorIdx++ % COLORS_OVERLAY.length];
            if (series.kind === "line") {
              plots.push({ kind: "line", values: series.values, label, pane: series.pane, color });
              if (series.pane === "rsi") hadRsi = true;
            } else if (series.kind === "bands") {
              plots.push({
                kind: "bands",
                upper: series.upper,
                mid: series.mid,
                lower: series.lower,
                label,
                pane: series.pane,
                color
              });
            } else {
              throw new RuntimeError("plot: first argument must be a series", n.line);
            }
            log.push(`plot · ${label}`);
            return { kind: "number", v: 0 };
          }
          case "hline": {
            if (args.length < 2) throw new RuntimeError("hline(value, \"label\")", n.line);
            const value = asNumber(args[0], n.line);
            const label = asString(args[1], n.line);
            // Smart pane: 0..100 → likely RSI thresholds.
            const pane: Pane = value >= 0 && value <= 100 && hadRsi ? "rsi" : "main";
            const color = "rgba(255,255,255,0.35)";
            hlines.push({ value, label, pane, color });
            log.push(`hline ${value} · ${label}${pane === "rsi" ? " (rsi)" : ""}`);
            return { kind: "number", v: 0 };
          }
          default:
            throw new RuntimeError(`unknown function '${n.name}'`, n.line);
        }
      }
    }
  };

  try {
    const tokens = tokenize(source);
    const stmts = parse(tokens);
    for (const s of stmts) {
      if (s.kind === "let") {
        scope[s.name] = evalNode(s.expr);
      } else {
        evalNode(s.expr);
      }
    }
    return { ok: true, plots, hlines, log, hadRsi };
  } catch (e) {
    if (e instanceof ParseError) {
      return { ok: false, error: `parse · ${e.message}`, errorLine: e.line, plots: [], hlines: [], log, hadRsi };
    }
    if (e instanceof RuntimeError) {
      return { ok: false, error: `runtime · ${e.message}`, errorLine: e.line, plots: [], hlines: [], log, hadRsi };
    }
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: `error · ${msg}`, plots: [], hlines: [], log, hadRsi };
  }
}
