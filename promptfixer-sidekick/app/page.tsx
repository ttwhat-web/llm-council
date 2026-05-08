import Link from "next/link";
import { PromptFixer } from "@/components/PromptFixer";
import { Pricing } from "@/components/Pricing";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1440px] flex-col gap-6 px-4 py-6 md:px-6 md:py-8">
      {/* Top page nav — minimal. The Command Center surface owns its own brand header. */}
      <nav className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-white/40">
          <span className="font-mono text-accent">PF</span>
          <span>PromptFixer · Command Center</span>
        </div>
        <Link
          href="/floating"
          className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-medium text-white/75 transition hover:bg-white/[0.08]"
        >
          Open floating →
        </Link>
      </nav>

      {/* Mission Control surface — full width so the 3-col grid breathes. */}
      <div className="glass min-h-[720px] rounded-3xl">
        <PromptFixer variant="web" />
      </div>

      {/* Plans + how-it-works land below the operations surface, not beside it. */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="glass rounded-3xl p-5">
          <Pricing />
        </div>

        <div className="glass rounded-3xl p-5">
          <div className="text-[11px] font-medium uppercase tracking-wider text-white/45">
            Operations console
          </div>
          <ol className="mt-3 space-y-2 text-xs text-white/70">
            <li>1. Pick a quality (Fast / Smart / Expert / Code / Local).</li>
            <li>
              2. Paste your input. The pipeline cleans, routes, supervises and
              scores.
            </li>
            <li>
              3. Tweak with one click — Shorter, Stronger, Convert to Cursor, …
            </li>
            <li>
              4. Copy. The Mission Archive is saved locally so you can come
              back to it.
            </li>
          </ol>
          <p className="mt-3 text-[11px] text-white/45">
            Web & iPhone users run cloud-only. Mac power users can flip{" "}
            <span className="text-white/80">Local</span> to run on Ollama —
            unlimited and private. The server never hosts heavy models.
          </p>
        </div>
      </section>
    </main>
  );
}
