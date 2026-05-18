import Link from "next/link";
import {
  Apple,
  Cpu,
  Github,
  HardDrive,
  Lock,
  Monitor,
  Terminal as TerminalIcon
} from "lucide-react";
import { MarketingShell } from "@/components/MarketingShell";

export const metadata = {
  title: "Download · PromptReady OS",
  description:
    "Download PromptReady OS · local-first AI operator console. macOS, Windows, Linux, Docker, or build from source."
};

/**
 * /download · Phase 19.
 *
 * Honest install paths. Source build works today. Signed installers
 * are labelled "coming soon" because they genuinely are. Quickstart,
 * Ollama setup, requirements, build-from-source, known limitations
 * and a security note all on one page so the operator can self-install.
 */

interface PlatformCard {
  os: string;
  arch?: string;
  Icon: typeof Apple;
  status: "available" | "coming-soon" | "source";
  hint: string;
  href?: string;
}

const PLATFORMS: PlatformCard[] = [
  {
    os: "macOS",
    arch: "Apple Silicon (M1+)",
    Icon: Apple,
    status: "coming-soon",
    hint: "Signed .dmg in QA. For now: build from source · `npm run tauri:build`."
  },
  {
    os: "macOS",
    arch: "Intel",
    Icon: Apple,
    status: "coming-soon",
    hint: "Universal binary planned. Same Tauri build as Apple Silicon."
  },
  {
    os: "Windows",
    arch: "x86_64",
    Icon: Monitor,
    status: "coming-soon",
    hint: "MSI installer in build · WiX signing pending."
  },
  {
    os: "Linux",
    arch: "AppImage · deb",
    Icon: Monitor,
    status: "coming-soon",
    hint: "AppImage / .deb planned · build from source today."
  },
  {
    os: "Docker",
    arch: "self-host runtime",
    Icon: HardDrive,
    status: "coming-soon",
    hint: "`operator/center:latest` image planned for the Operator tier."
  },
  {
    os: "Source",
    arch: "build from GitHub",
    Icon: Github,
    status: "source",
    hint: "Clone · `cd promptready-os && npm install && npm run tauri:dev`.",
    href: "https://github.com/ttwhat-web/llm-council"
  }
];

export default function DownloadPage() {
  return (
    <MarketingShell>
      <section className="flex flex-col gap-6">
        <header className="flex flex-col gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-accent">
            download · promptready os
          </span>
          <h1 className="text-3xl font-semibold leading-[1.05] tracking-tight text-white md:text-5xl">
            Run it on your machine.
          </h1>
          <p className="max-w-[62ch] text-[14px] leading-relaxed text-white/65">
            PromptReady OS is the downloadable desktop app. Source build
            works today; signed installers are landing. No account or API
            key required to open it.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {PLATFORMS.map((p) => (
            <PlatformTile key={`${p.os}-${p.arch}`} card={p} />
          ))}
        </div>

        <Quickstart />
        <RequirementsAndOllama />
        <BuildFromSource />
        <KnownLimitations />
        <SecurityNote />

        <footer className="mt-3 flex flex-wrap items-center gap-3">
          <Link
            href="/docs"
            className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[12px] font-medium text-white/85 hover:bg-white/[0.06]"
          >
            Docs
          </Link>
          <Link
            href="/docs/demo-script"
            className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[12px] font-medium text-white/85 hover:bg-white/[0.06]"
          >
            90-second demo script
          </Link>
          <Link
            href="/founders"
            className="inline-flex items-center gap-1 rounded-md bg-accent/85 px-3 py-1.5 text-[12px] font-semibold text-white shadow-glow hover:bg-accent"
          >
            Join founder waitlist
          </Link>
        </footer>
      </section>
    </MarketingShell>
  );
}

function PlatformTile({ card }: { card: PlatformCard }) {
  const body = (
    <article className="flex h-full flex-col gap-2 rounded-2xl border border-white/10 bg-white/[0.02] p-4 transition hover:border-accent/30 hover:bg-white/[0.04]">
      <header className="flex items-center gap-2">
        <card.Icon className="h-4 w-4 text-accent" />
        <span className="text-[13px] font-semibold text-white">{card.os}</span>
        {card.arch && (
          <span className="rounded border border-white/10 bg-white/[0.04] px-1 py-px font-mono text-[9px] uppercase tracking-wider text-white/55">
            {card.arch}
          </span>
        )}
        <span
          className={`ml-auto rounded-md border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] ${
            card.status === "available"
              ? "border-emerald-400/40 bg-emerald-500/[0.08] text-emerald-200"
              : card.status === "source"
                ? "border-accent/30 bg-accent/[0.06] text-accent"
                : "border-white/10 bg-white/[0.04] text-white/55"
          }`}
        >
          {card.status === "available"
            ? "ready"
            : card.status === "source"
              ? "source only"
              : "coming soon"}
        </span>
      </header>
      <p className="text-[11.5px] text-white/55">{card.hint}</p>
    </article>
  );
  if (card.href) {
    return (
      <a href={card.href} target="_blank" rel="noreferrer" className="block">
        {body}
      </a>
    );
  }
  return body;
}

function Quickstart() {
  return (
    <section className="flex flex-col gap-2 rounded-2xl border border-white/8 bg-white/[0.02] p-4">
      <header className="flex items-center gap-2">
        <TerminalIcon className="h-3.5 w-3.5 text-accent" />
        <span className="text-[13px] font-semibold text-white">Quick start</span>
      </header>
      <ol className="flex list-decimal flex-col gap-1 pl-5 text-[12.5px] text-white/75">
        <li>Clone the repo: <code className="font-mono text-accent">git clone https://github.com/ttwhat-web/llm-council</code></li>
        <li>Open the desktop app folder: <code className="font-mono text-accent">cd llm-council/promptready-os</code></li>
        <li>Install deps: <code className="font-mono text-accent">npm install</code></li>
        <li>Run the Tauri dev shell: <code className="font-mono text-accent">npm run tauri:dev</code> (or web preview with <code className="font-mono text-accent">npm run dev</code>)</li>
        <li>Bootstrap a brain on first launch · pick demo or roll your own.</li>
        <li>Dispatch a mission · receipts persist to localStorage.</li>
      </ol>
    </section>
  );
}

function RequirementsAndOllama() {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      <section className="flex flex-col gap-2 rounded-2xl border border-white/8 bg-white/[0.02] p-4">
        <header className="flex items-center gap-2">
          <HardDrive className="h-3.5 w-3.5 text-accent" />
          <span className="text-[13px] font-semibold text-white">Requirements</span>
        </header>
        <ul className="flex flex-col gap-1 text-[12px] text-white/75">
          <li>· Node.js 18.17+</li>
          <li>· npm 9+ or pnpm 8+</li>
          <li>· Rust toolchain (for Tauri build only)</li>
          <li>· macOS 12+ / Windows 10+ / a recent Linux distro</li>
          <li>· ~200 MB disk · ~250 MB RAM at idle</li>
          <li>· No API key required to open the app</li>
        </ul>
      </section>

      <section className="flex flex-col gap-2 rounded-2xl border border-white/8 bg-white/[0.02] p-4">
        <header className="flex items-center gap-2">
          <Cpu className="h-3.5 w-3.5 text-accent" />
          <span className="text-[13px] font-semibold text-white">Ollama (optional)</span>
        </header>
        <ol className="flex list-decimal flex-col gap-1 pl-5 text-[12px] text-white/75">
          <li>Install: <code className="font-mono text-accent">curl -fsSL https://ollama.com/install.sh | sh</code></li>
          <li>Start: <code className="font-mono text-accent">ollama serve</code></li>
          <li>Pull a starter model: <code className="font-mono text-accent">ollama pull gemma2:2b</code></li>
          <li>PromptReady OS auto-detects · pick &ldquo;ollama&rdquo; in DispatchPanel.</li>
        </ol>
        <p className="text-[10.5px] text-white/45">
          Optional · the deterministic engine ships in the box and works
          offline forever.
        </p>
      </section>
    </div>
  );
}

function BuildFromSource() {
  return (
    <section className="flex flex-col gap-2 rounded-2xl border border-white/8 bg-white/[0.02] p-4">
      <header className="flex items-center gap-2">
        <Github className="h-3.5 w-3.5 text-accent" />
        <span className="text-[13px] font-semibold text-white">Build from source</span>
      </header>
      <pre className="overflow-auto rounded-md border border-white/8 bg-black/40 p-3 font-mono text-[11px] text-white/85">
        {`git clone https://github.com/ttwhat-web/llm-council
cd llm-council/promptready-os
npm install
npm run build         # web bundle (Vite)
npm run tauri:build   # native installer for your platform`}
      </pre>
      <p className="text-[10.5px] text-white/45">
        `tauri:build` produces a platform-specific binary in
        <code className="font-mono text-white/65"> src-tauri/target/release/bundle</code>.
        Signing is the operator&rsquo;s responsibility until the public
        installers ship.
      </p>
    </section>
  );
}

function KnownLimitations() {
  return (
    <section className="flex flex-col gap-2 rounded-2xl border border-amber-400/25 bg-amber-500/[0.04] p-4">
      <header className="flex items-center gap-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-amber-200">
          known limitations · honest
        </span>
      </header>
      <ul className="grid grid-cols-1 gap-1 text-[12px] text-white/75 md:grid-cols-2">
        <li>· No signed public installers yet · source build only</li>
        <li>· Mobile companion is planned · capture/approve over QR pairing</li>
        <li>· Telegram bridge is adapter-ready · networking ships with desktop runtime</li>
        <li>· Agent runtime cycles state but does not execute autonomously</li>
        <li>· Cloud routing is planned · BYOK fields wired but inert</li>
        <li>· Repo indexer reads imported files only · no GitHub fetch yet</li>
        <li>· Workspace lives in browser localStorage until Tauri keychain</li>
        <li>· No voice transcript inbox yet</li>
      </ul>
    </section>
  );
}

function SecurityNote() {
  return (
    <section className="flex flex-col gap-2 rounded-2xl border border-white/8 bg-white/[0.02] p-4">
      <header className="flex items-center gap-2">
        <Lock className="h-3.5 w-3.5 text-accent" />
        <span className="text-[13px] font-semibold text-white">Security posture</span>
      </header>
      <ul className="flex flex-col gap-1 text-[12px] text-white/75">
        <li>· No telemetry by default · opt-in anonymous counters only</li>
        <li>· No outbound calls except: (a) optional Ollama on localhost, (b) operator-initiated downloads</li>
        <li>· BYOK keys never written to disk in this preview · keychain integration ships with desktop</li>
        <li>· Brain snapshots exported as plaintext JSON · encrypt at rest yourself if needed</li>
        <li>· Source build · review every dependency before tauri:build</li>
      </ul>
      <Link
        href="/security"
        className="self-start font-mono text-[10px] uppercase tracking-wider text-accent hover:underline"
      >
        full security posture →
      </Link>
    </section>
  );
}
