import Link from "next/link";
import { PromptFixer } from "@/components/PromptFixer";
import { Pricing } from "@/components/Pricing";

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
                PromptFixer turns rough ideas into execution-ready prompts.
              </p>
            </div>
          </div>
          <Link
            href="/floating"
            className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-white/80 transition hover:bg-white/[0.08]"
          >
            Power user? Open floating →
          </Link>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="glass min-h-[720px] rounded-3xl">
          <PromptFixer variant="web" />
        </div>

        <aside className="flex flex-col gap-4">
          <div className="glass rounded-3xl p-5">
            <Pricing />
          </div>

          <div className="glass rounded-3xl p-5">
            <div className="text-[11px] font-medium uppercase tracking-wider text-white/45">
              How it works
            </div>
            <ol className="mt-3 space-y-2 text-xs text-white/70">
              <li>1. Pick a quality (Fast / Smart / Expert / Code / Local).</li>
              <li>2. Paste your input. We clean, structure, and supervise it.</li>
              <li>3. Tweak with one click — Shorter, Stronger, Convert to Cursor, …</li>
              <li>4. Copy. History is saved locally so you can come back to it.</li>
            </ol>
            <p className="mt-3 text-[11px] text-white/45">
              Web & iPhone users run cloud-only. Mac power users can flip{" "}
              <span className="text-white/80">Local</span> to run on Ollama —
              unlimited and private. The server never hosts heavy models.
            </p>
          </div>
        </aside>
      </section>
    </main>
  );
}
