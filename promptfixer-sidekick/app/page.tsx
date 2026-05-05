import Link from "next/link";
import { PromptFixer } from "@/components/PromptFixer";
import { MODE_LIST } from "@/lib/modes";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-6 py-10">
      <header className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-accent/15 ring-1 ring-accent/30 shadow-glow">
              <span className="font-mono text-sm text-accent">PF</span>
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-white">
                PromptFixer Sidekick
              </h1>
              <p className="text-xs text-white/50">
                Local-first prompt optimiser with a Gemma supervisor pass.
              </p>
            </div>
          </div>
          <Link
            href="/floating"
            className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-white/80 transition hover:bg-white/[0.08]"
          >
            Open floating window →
          </Link>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="glass min-h-[640px] rounded-3xl">
          <PromptFixer variant="web" />
        </div>

        <aside className="flex flex-col gap-4">
          <div className="glass rounded-3xl p-5">
            <div className="text-[11px] font-medium uppercase tracking-wider text-white/45">
              How it works
            </div>
            <ol className="mt-3 space-y-2 text-sm text-white/75">
              <li>1. Paste anything — messy text, errors, half-thoughts.</li>
              <li>2. Cleaner strips noise; engine builds the five required sections.</li>
              <li>3. Gemma supervisor (local) tightens wording. Never invents facts.</li>
              <li>4. Terminal Mode runs a safety screen before output.</li>
            </ol>
          </div>

          <div className="glass rounded-3xl p-5">
            <div className="text-[11px] font-medium uppercase tracking-wider text-white/45">
              Modes
            </div>
            <ul className="mt-3 space-y-2 text-xs text-white/70">
              {MODE_LIST.map((m) => (
                <li key={m.id}>
                  <span className="text-white/90">{m.label}</span>
                  <span className="text-white/45"> — {m.blurb}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="glass rounded-3xl p-5">
            <div className="text-[11px] font-medium uppercase tracking-wider text-white/45">
              Local AI
            </div>
            <p className="mt-3 text-xs text-white/70">
              Run <code className="rounded bg-white/5 px-1 py-0.5 font-mono">ollama serve</code>{" "}
              and pull the supervisor model:
            </p>
            <pre className="mt-2 overflow-x-auto rounded-xl bg-black/40 px-3 py-2 font-mono text-[11px] text-white/80">
              ollama pull gemma2:2b
            </pre>
            <p className="mt-2 text-[11px] text-white/45">
              The toggle is safe to leave on — if Ollama is unreachable the deterministic engine
              ships the prompt anyway.
            </p>
          </div>
        </aside>
      </section>
    </main>
  );
}
