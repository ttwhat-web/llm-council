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
                Cloud AI by default. Optional local Ollama for unlimited Mac use.
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
        <div className="glass min-h-[680px] rounded-3xl">
          <PromptFixer variant="web" />
        </div>

        <aside className="flex flex-col gap-4">
          <div className="glass rounded-3xl p-5">
            <div className="text-[11px] font-medium uppercase tracking-wider text-white/45">
              Three ways to run
            </div>
            <ul className="mt-3 space-y-3 text-xs text-white/70">
              <li>
                <span className="text-white/90">Free / Web — </span>
                Instant cloud AI. Nothing to install. Daily limit applies.
              </li>
              <li>
                <span className="text-white/90">Pro / Cloud — </span>
                Same path with higher limits and flagship models.
              </li>
              <li>
                <span className="text-white/90">Local Ollama (Mac) — </span>
                Unlimited local mode. Install Ollama once; data never leaves
                your machine.
              </li>
            </ul>
            <p className="mt-3 text-[11px] text-white/45">
              iPhone & web users → cloud. Mac power users → optional local.
              Server never hosts heavy models.
            </p>
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
              Optional: Local Ollama (Mac)
            </div>
            <p className="mt-3 text-xs text-white/70">
              For unlimited / private use, install{" "}
              <a
                href="https://ollama.com"
                target="_blank"
                rel="noreferrer"
                className="text-accent hover:underline"
              >
                Ollama
              </a>{" "}
              and pull a model:
            </p>
            <pre className="mt-2 overflow-x-auto rounded-xl bg-black/40 px-3 py-2 font-mono text-[11px] text-white/80">
              ollama pull gemma2:2b
            </pre>
            <p className="mt-2 text-[11px] text-white/45">
              Then set <code className="rounded bg-white/5 px-1 py-0.5 font-mono">OLLAMA_BASE_URL=http://127.0.0.1:11434</code>{" "}
              in your local <code className="rounded bg-white/5 px-1 py-0.5 font-mono">.env.local</code> and pick{" "}
              <span className="text-white/85">Local Ollama</span> from the engine selector.
            </p>
          </div>
        </aside>
      </section>
    </main>
  );
}
