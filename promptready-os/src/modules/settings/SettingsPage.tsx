"use client";

import { useRef, useState, type ChangeEvent } from "react";
import {
  AlertTriangle,
  Apple,
  Archive,
  BookOpen,
  Brain as BrainIcon,
  Copy,
  Cpu,
  Download,
  Eye,
  EyeOff,
  HardDrive,
  Key,
  Loader2,
  Monitor,
  Palette,
  Phone,
  QrCode,
  RefreshCcw,
  Send,
  ShieldCheck,
  Sparkles,
  Terminal as TerminalIcon,
  Trash2,
  Upload
} from "lucide-react";
import { SurfaceHeader } from "@/components/primitives/SurfaceHeader";
import { AutoConfigure } from "@/components/AutoConfigure";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { SetupWizard } from "@/components/SetupWizard";
import { DemoWorkspaceCard } from "@/components/DemoWorkspaceCard";
import { ReleaseCenter } from "@/components/ReleaseCenter";
import { TelemetryDashboard } from "@/components/TelemetryDashboard";
import { AuditLogCard } from "@/components/AuditLogCard";
import { ComplianceCard } from "@/components/ComplianceCard";
import { RuntimeBus } from "@/components/RuntimeBus";
import { OperatorModeCard } from "@/components/OperatorModeCard";
import { RoadmapPanel } from "@/components/RoadmapPanel";
import { BrainScoreCard } from "@/components/BrainScoreCard";
import { OperatorSafeModeCard } from "@/components/OperatorSafeModeCard";
import { TelegramLiveCard } from "@/components/TelegramLiveCard";
import { RuntimeShieldCard } from "@/components/RuntimeShieldCard";
import { OperatorIdCard } from "@/components/OperatorIdCard";
import { BrainPassportCard } from "@/components/BrainPassportCard";
import { MorningBriefCard } from "@/components/MorningBriefCard";
import { PresentationModeCard } from "@/components/PresentationModeCard";
import { Foldable } from "@/components/Foldable";
import { RemoteTeaser } from "@/components/RemoteTeaser";
import { PerfectSetupGuide } from "@/components/PerfectSetupGuide";
import { ModelLabCard } from "@/components/ModelLabCard";
import { ModelCostsCard } from "@/components/ModelCostsCard";
import { OperatorBulletinCard } from "@/components/OperatorBulletinCard";
import { EmailRuntimeCard } from "@/components/EmailRuntimeCard";
import { LaunchReadinessCard } from "@/components/LaunchReadinessCard";
import { ProviderDiagnostics } from "@/components/ProviderDiagnostics";
import { FounderBetaCard } from "@/components/FounderBetaCard";
import { FieldTestModeCard } from "@/components/FieldTestModeCard";
import {
  CloudSyncCard,
  MobileCompanionRoadmapCard,
  ConnectorHubCard,
  EnterpriseServerCard
} from "@/components/PlannedSurfacesCard";
import { useAtlasStore } from "@/store/atlas";
import { useBrainStore } from "@/store/brain";
import { useMissionStore } from "@/store/mission";
import {
  downloadSnapshot,
  restoreSnapshotFromFile,
  restoreSnapshotById
} from "@/services/snapshot";
import { downloadDiagnostics } from "@/services/diagnostics";
import { executeCommand, COMMAND_HELP } from "@/services/commandConsole";
import {
  measureBrainHealth,
  optimizeBrain,
  type OptimizeReport
} from "@/services/brainHealth";
import {
  getBridgeStatus,
  sendNotification,
  receiveInbound,
  clearBridge,
  BRIDGE_SETUP_NOTES
} from "@/services/telegramBridge";

/**
 * Settings · Phase 13.
 *
 * Sections:
 *   · Auto-configure workspace (one-tap honest setup).
 *   · Appearance (theme palette grid).
 *   · BYOK provider keys (session-only memory today).
 *   · Local engine (Ollama probe label).
 *   · Safety screen toggle.
 *   · Telemetry toggle (off by default).
 *   · Mobile Companion (planned secure pairing — not built yet).
 */

interface ProviderKeyRowProps {
  label: string;
  placeholder: string;
}

function ProviderKeyRow({ label, placeholder }: ProviderKeyRowProps) {
  const [value, setValue] = useState("");
  const [show, setShow] = useState(false);
  return (
    <div className="flex flex-col gap-1">
      <span className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-white/40">
        {label}
      </span>
      <div className="flex items-center gap-1.5">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          className="no-drag flex-1 rounded-md border border-white/8 bg-white/[0.025] px-2 py-1.5 text-[12px] text-white placeholder:text-white/30 focus:border-accent/40 focus:outline-none"
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.03] px-2 py-1.5 text-[10.5px] text-white/65 hover:bg-white/[0.06]"
        >
          {show ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
          {show ? "Hide" : "Show"}
        </button>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [telemetry, setTelemetry] = useState(false);
  const [safetyScreen, setSafetyScreen] = useState(true);

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-5 px-5 py-5 md:px-7 md:py-7">
      <SurfaceHeader
        eyebrow="settings · operator preferences"
        title="Settings"
        sub="Auto-setup, appearance, BYOK keys, safety, telemetry, mobile companion. Keys you paste stay in memory for this session only — keychain lands with the desktop runtime."
      />

      <PerfectSetupGuide />

      <Foldable
        title="Roadmap"
        hint="phases · current focus"
        persistKey="roadmap"
      >
        <RoadmapPanel />
      </Foldable>

      <SettingsSection letter="P" label="Presentation" hint="Demo · Safe Mode · Founder" />
      <PresentationModeCard />
      <OperatorSafeModeCard />
      <Foldable title="Morning Brief" hint="yesterday · today" persistKey="morning-brief">
        <MorningBriefCard />
      </Foldable>
      <Foldable title="Demo Workspace" hint="seeded brain · labelled" persistKey="demo-workspace">
        <DemoWorkspaceCard />
      </Foldable>
      <Foldable title="Operator ID" hint="DNA · founder badge" persistKey="operator-id">
        <OperatorIdCard />
      </Foldable>

      <SettingsSection letter="S" label="System" hint="Runtime · Policies · Remote" />
      <SetupWizard />
      <RuntimeBus />
      <Foldable title="Operator Mode" hint="solo · team · agency · enterprise" persistKey="operator-mode">
        <OperatorModeCard />
      </Foldable>
      <Foldable title="Release Center" hint="version · changelog" persistKey="release-center">
        <ReleaseCenter />
      </Foldable>
      <Foldable title="Telemetry Dashboard" hint="local counts only" persistKey="telemetry-dashboard">
        <TelemetryDashboard />
      </Foldable>
      <Foldable title="Auto-configure" hint="one-tap honest setup" persistKey="auto-configure">
        <AutoConfigure />
      </Foldable>

      <SettingsSection letter="I" label="Intelligence" hint="Brief · Costs · Models · Providers" />
      <OperatorBulletinCard />
      <ProviderDiagnostics />
      <ModelCostsCard />
      <ModelLabCard />

      <section className="flex flex-col gap-3 rounded-2xl border border-white/8 bg-white/[0.02] p-4">
        <header className="flex items-center gap-2">
          <Palette className="h-3.5 w-3.5 text-accent" />
          <span className="text-[13px] font-semibold text-white">Appearance</span>
        </header>
        <p className="text-[11px] text-white/55">
          Five palettes. Choice persists locally and applies to backgrounds,
          accent glows, nav states, buttons, and graph nodes.
        </p>
        <ThemeSwitcher variant="inline" />
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <article className="flex flex-col gap-3 rounded-2xl border border-white/8 bg-white/[0.02] p-4">
          <header className="flex items-center gap-2">
            <Key className="h-3.5 w-3.5 text-accent" />
            <span className="text-[13px] font-semibold text-white">BYOK · provider keys</span>
          </header>
          <p className="text-[11px] text-white/55">
            Bring your own keys. Routing flips to your account when keys are
            present. Local engines always work without keys.
          </p>
          <ProviderKeyRow label="Anthropic" placeholder="sk-ant-…" />
          <ProviderKeyRow label="OpenAI" placeholder="sk-…" />
          <ProviderKeyRow label="Google" placeholder="AIza…" />
          <p className="flex items-start gap-1.5 rounded-md border border-amber-400/25 bg-amber-500/[0.05] p-2 text-[10.5px] text-amber-200/80">
            <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
            Keys stay in this preview's memory only.
          </p>
        </article>

        <article className="flex flex-col gap-3 rounded-2xl border border-white/8 bg-white/[0.02] p-4">
          <header className="flex items-center gap-2">
            <Cpu className="h-3.5 w-3.5 text-accent" />
            <span className="text-[13px] font-semibold text-white">Local engine</span>
          </header>
          <p className="text-[11px] text-white/55">
            Operator Core prefers a local Ollama instance when reachable.
            The probe runs on first mission or from Auto-configure above.
          </p>
          <div className="rounded-md border border-white/8 bg-white/[0.015] p-3 font-mono text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-white/45">ollama host</span>
              <span className="text-white">http://localhost:11434</span>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-white/45">status</span>
              <span className="text-white/55">probe via Auto-configure</span>
            </div>
          </div>
        </article>

        <article className="flex flex-col gap-3 rounded-2xl border border-white/8 bg-white/[0.02] p-4">
          <header className="flex items-center gap-2">
            <ShieldCheck className="h-3.5 w-3.5 text-accent" />
            <span className="text-[13px] font-semibold text-white">Safety screen</span>
          </header>
          <p className="text-[11px] text-white/55">
            Before any terminal command runs, the screen previews + asks for
            confirmation. Recommended on.
          </p>
          <Toggle
            value={safetyScreen}
            onToggle={() => setSafetyScreen((v) => !v)}
            label={safetyScreen ? "Armed" : "Disarmed"}
          />
        </article>

        <article className="flex flex-col gap-3 rounded-2xl border border-white/8 bg-white/[0.02] p-4">
          <header className="flex items-center gap-2">
            <TerminalIcon className="h-3.5 w-3.5 text-accent" />
            <span className="text-[13px] font-semibold text-white">Telemetry</span>
          </header>
          <p className="text-[11px] text-white/55">
            Off by default. When on, anonymous usage counts are sent —
            never brief content or deliverables.
          </p>
          <Toggle
            value={telemetry}
            onToggle={() => setTelemetry((v) => !v)}
            label={telemetry ? "Sharing anonymous counts" : "Off"}
          />
        </article>
      </section>

      <SettingsSection letter="R" label="Remote" hint="Phone · Telegram · Email" />
      <RemoteTeaser />
      <EmailRuntimeCard />
      <TelegramCompanionCard />
      <TelegramLiveCard />
      <RuntimeShieldCard />
      <Foldable title="Mobile Companion" hint="planned · secure pairing" persistKey="mobile-companion">
        <MobileCompanionCard />
      </Foldable>
      <Foldable title="Compliance" hint="local · BYOK · no telemetry" persistKey="compliance">
        <ComplianceCard />
      </Foldable>

      <SettingsSection letter="B" label="Brain" hint="Health · Snapshots · Restore" />
      <BrainHealthCard />
      <BrainScoreCard />
      <BrainPassportCard />
      <SnapshotsCard />
      <Foldable title="Audit Log" hint="local event ledger" persistKey="audit-log">
        <AuditLogCard />
      </Foldable>
      <Foldable title="Desktop Trust" hint="storage · path · reset" persistKey="desktop-trust">
        <DesktopTrustCard />
      </Foldable>
      <Foldable title="Diagnostics" hint="export markdown" persistKey="diagnostics">
        <DiagnosticsCard />
      </Foldable>

      <SettingsSection letter="O" label="Operator" hint="Launch · Founder · Field Test" />
      <LaunchReadinessCard />
      <FounderBetaCard />
      <FieldTestModeCard />
      <Foldable title="Packaging" hint="macOS · Windows · Linux" persistKey="packaging">
        <PackagingCard />
      </Foldable>
      <Foldable title="Connector Hub" hint="planned" persistKey="connector-hub">
        <ConnectorHubCard />
      </Foldable>
      <Foldable title="Cloud Sync" hint="planned · opt-in" persistKey="cloud-sync">
        <CloudSyncCard />
      </Foldable>
      <Foldable title="Mobile Companion · roadmap" hint="planned" persistKey="mobile-roadmap">
        <MobileCompanionRoadmapCard />
      </Foldable>
      <Foldable title="Enterprise Server" hint="planned" persistKey="enterprise-server">
        <EnterpriseServerCard />
      </Foldable>
    </div>
  );
}

function Toggle({
  value,
  onToggle,
  label
}: {
  value: boolean;
  onToggle: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="no-drag inline-flex items-center gap-2 self-start rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-[11.5px] text-white/85 hover:bg-white/[0.06]"
    >
      <span
        className={
          value
            ? "h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_1px_rgba(52,211,153,0.65)]"
            : "h-2.5 w-2.5 rounded-full bg-white/25"
        }
      />
      {label}
    </button>
  );
}

function MobileCompanionCard() {
  const code = useAtlasStore((s) => s.pairingCode);
  const generate = useAtlasStore((s) => s.generatePairingCode);
  const clear = useAtlasStore((s) => s.clearPairing);

  const onCopy = () => {
    if (!code) return;
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      void navigator.clipboard.writeText(code);
    }
  };

  return (
    <section className="rounded-2xl border border-accent/25 bg-accent/[0.04] p-4 shadow-glow">
      <header className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Phone className="h-4 w-4 text-accent" />
          <span className="text-[13px] font-semibold text-white">Mobile Companion</span>
        </div>
        <span className="rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider text-white/55">
          planned · secure pairing
        </span>
      </header>

      <p className="text-[11.5px] text-white/65">
        The phone is a capture + approval device. Voice notes become mission
        briefs. Screenshots become context. Destructive actions (cloud
        spend, repo write-back, risky shell) always wait for your tap.
      </p>

      {/* Pairing code */}
      <div className="mt-3 flex flex-col gap-2 rounded-xl border border-white/10 bg-graphite-900/60 p-3">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-accent">
            pairing code
          </span>
          {code && (
            <button
              type="button"
              onClick={clear}
              className="inline-flex items-center gap-1 rounded-md border border-rose-400/25 bg-rose-500/[0.06] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-rose-200 hover:bg-rose-500/[0.12]"
              title="Revoke pairing code"
            >
              <Trash2 className="h-2.5 w-2.5" /> revoke
            </button>
          )}
        </div>

        {code ? (
          <div className="flex flex-wrap items-center gap-3">
            <div
              className="flex h-20 w-20 shrink-0 items-center justify-center rounded-md border border-accent/30 bg-accent/[0.06] font-mono text-[10px] uppercase tracking-wider text-accent/80"
              title="QR placeholder · networking ships with the desktop runtime"
            >
              <QrCode className="h-10 w-10 text-accent" />
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-mono text-[18px] tracking-[0.28em] text-white">
                {code}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={onCopy}
                  className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.03] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-white/75 hover:bg-white/[0.06]"
                >
                  <Copy className="h-2.5 w-2.5" /> copy
                </button>
                <button
                  type="button"
                  onClick={generate}
                  className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.03] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-white/75 hover:bg-white/[0.06]"
                >
                  <RefreshCcw className="h-2.5 w-2.5" /> regenerate
                </button>
              </div>
              <p className="text-[10px] text-white/45">
                Code is generated and stored locally. Networking + QR scan
                land with the desktop runtime — no traffic leaves this machine yet.
              </p>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={generate}
            className="inline-flex items-center justify-center gap-1.5 rounded-md bg-accent/85 px-3 py-1.5 text-[12px] font-semibold text-white shadow-glow transition hover:bg-accent"
          >
            <QrCode className="h-3.5 w-3.5" /> Generate pairing code
          </button>
        )}
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
        <Capability
          eyebrow="capture"
          title="Voice · screenshot · share-sheet"
          body="Send anything to your brain from any app. Lands in Mission Brief on the desktop."
        />
        <Capability
          eyebrow="approve"
          title="Risky actions require a tap"
          body="Cloud spend, repo writes, vetted shell commands wait on phone-side approval with full diff."
        />
        <Capability
          eyebrow="view"
          title="Receipts on the go"
          body="Open any past receipt · copy a deliverable · forward to a teammate."
        />
        <Capability
          eyebrow="dispatch"
          title="Lightweight templates"
          body="“Ask my Brain” · “Summarize this” · “Send to desktop” · “Create repo task”."
        />
      </div>

      <p className="mt-3 text-[10.5px] text-white/45">
        Mobile never runs the full Mission Control, never executes
        unapproved actions, and never pretends Ollama exists on phone.
      </p>
    </section>
  );
}

function Capability({
  eyebrow,
  title,
  body
}: {
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <article className="flex flex-col gap-1 rounded-xl border border-white/8 bg-white/[0.012] p-3">
      <span className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-accent">
        {eyebrow}
      </span>
      <span className="text-[12.5px] font-semibold text-white">{title}</span>
      <span className="text-[11px] text-white/55">{body}</span>
    </article>
  );
}

// ============================================================================
// Telegram companion
// ============================================================================

function TelegramCompanionCard() {
  const link = useAtlasStore((s) => s.telegram);
  const generate = useAtlasStore((s) => s.generateTelegramLink);
  const clear = useAtlasStore((s) => s.clearTelegramLink);

  const onCopy = () => {
    if (!link) return;
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      void navigator.clipboard.writeText(link.code);
    }
  };

  const commands = [
    ["/missions", "list active and recent missions"],
    ["/receipt <id>", "show a receipt"],
    ["/status", "current engine + brain state"],
    ["/brain", "summary of brain identity"],
    ["/approve <id>", "approve a pending workflow node"],
    ["/reject <id>", "reject a pending workflow node"],
    ["/pause", "pause running workflow"],
    ["/resume", "resume paused workflow"]
  ];

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <header className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Send className="h-4 w-4 text-accent" />
          <span className="text-[13px] font-semibold text-white">Telegram Companion</span>
        </div>
        <span className="rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider text-white/55">
          {link ? "link issued · not connected" : "not connected"}
        </span>
      </header>

      <p className="text-[11.5px] text-white/65">
        Optional control surface — the bot accepts commands, never replaces
        the desktop brain. Issuance is local; the actual Telegram bot wires
        up with the desktop runtime.
      </p>

      <div className="mt-3 flex flex-col gap-2 rounded-xl border border-white/10 bg-graphite-900/60 p-3">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-accent">
            link code
          </span>
          {link && (
            <button
              type="button"
              onClick={clear}
              className="inline-flex items-center gap-1 rounded-md border border-rose-400/25 bg-rose-500/[0.06] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-rose-200 hover:bg-rose-500/[0.12]"
            >
              <Trash2 className="h-2.5 w-2.5" /> revoke
            </button>
          )}
        </div>
        {link ? (
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-mono text-[18px] tracking-[0.28em] text-white">{link.code}</span>
            <button
              type="button"
              onClick={onCopy}
              className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.03] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-white/75 hover:bg-white/[0.06]"
            >
              <Copy className="h-2.5 w-2.5" /> copy
            </button>
            <button
              type="button"
              onClick={generate}
              className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.03] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-white/75 hover:bg-white/[0.06]"
            >
              <RefreshCcw className="h-2.5 w-2.5" /> regenerate
            </button>
            <span className="font-mono text-[9.5px] uppercase tracking-wider text-white/45">
              issued {new Date(link.createdAt).toLocaleString()}
            </span>
          </div>
        ) : (
          <button
            type="button"
            onClick={generate}
            className="inline-flex items-center justify-center gap-1.5 self-start rounded-md bg-accent/85 px-3 py-1.5 text-[12px] font-semibold text-white shadow-glow transition hover:bg-accent"
          >
            <Send className="h-3.5 w-3.5" /> Generate Telegram link code
          </button>
        )}
      </div>

      <div className="mt-3">
        <div className="mb-1 font-mono text-[9.5px] uppercase tracking-[0.22em] text-white/40">
          control commands · local console
        </div>
        <ul className="grid grid-cols-1 gap-1 md:grid-cols-2">
          {commands.map(([cmd, desc]) => (
            <li
              key={cmd}
              className="flex items-center gap-2 rounded-md border border-white/8 bg-white/[0.012] px-2 py-1 text-[11px]"
            >
              <code className="rounded bg-black/40 px-1 py-px font-mono text-[10.5px] text-accent">{cmd}</code>
              <span className="text-white/65">{desc}</span>
            </li>
          ))}
        </ul>
      </div>

      <CommandConsole />
      <BridgeSimulator />
    </section>
  );
}

// ============================================================================
// Command console — local · same handlers a Telegram bot will call
// ============================================================================

interface ConsoleEntry {
  id: string;
  input: string;
  ok: boolean;
  output: string;
  at: number;
}

function CommandConsole() {
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<ConsoleEntry[]>([]);
  const ref = useRef<HTMLDivElement | null>(null);

  const onSubmit = async () => {
    const line = input.trim();
    if (!line || busy) return;
    setBusy(true);
    const r = await executeCommand(line);
    setLog((prev) => [
      { id: Math.random().toString(36).slice(2), input: line, ok: r.ok, output: r.output, at: Date.now() },
      ...prev
    ].slice(0, 20));
    setInput("");
    setBusy(false);
    window.setTimeout(() => {
      ref.current?.scrollTo({ top: 0 });
    }, 30);
  };

  return (
    <div className="mt-3 rounded-md border border-white/10 bg-graphite-900/70 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-accent">
          live console · local preview
        </span>
        <span className="font-mono text-[9px] uppercase tracking-wider text-white/45">
          same handlers will run via telegram when wired
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        <code className="rounded bg-black/40 px-1.5 py-1 font-mono text-[11px] text-accent">/</code>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void onSubmit();
          }}
          placeholder="status · brain · missions · receipt <id> · run <brief> · ollama …"
          className="flex-1 rounded-md border border-white/8 bg-white/[0.025] px-2 py-1.5 font-mono text-[11.5px] text-white placeholder:text-white/30 focus:border-accent/40 focus:outline-none"
        />
        <button
          type="button"
          onClick={onSubmit}
          disabled={busy || !input.trim()}
          className="inline-flex items-center gap-1 rounded-md bg-accent/85 px-2.5 py-1.5 text-[11.5px] font-semibold text-white shadow-glow hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : "Run"}
        </button>
      </div>

      <div className="mt-1 flex flex-wrap gap-1">
        {COMMAND_HELP.slice(0, 6).map((c) => (
          <button
            key={c.cmd}
            type="button"
            onClick={() => setInput(c.cmd)}
            className="rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider text-white/65 hover:bg-white/[0.06]"
          >
            {c.cmd}
          </button>
        ))}
      </div>

      <div
        ref={ref}
        className="mt-2 max-h-[260px] overflow-auto rounded-md border border-white/8 bg-black/40 p-2"
      >
        {log.length === 0 ? (
          <p className="font-mono text-[10.5px] text-white/45">
            Try <code className="rounded bg-white/[0.06] px-1 py-px text-accent">/status</code> or{" "}
            <code className="rounded bg-white/[0.06] px-1 py-px text-accent">/help</code>.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {log.map((entry) => (
              <li key={entry.id} className="flex flex-col gap-0.5">
                <div className="flex items-center gap-1.5 font-mono text-[10px]">
                  <span className="text-white/35">{new Date(entry.at).toLocaleTimeString()}</span>
                  <span className="text-accent">{entry.input}</span>
                </div>
                <pre
                  className={
                    entry.ok
                      ? "whitespace-pre-wrap rounded-md border border-emerald-400/15 bg-emerald-500/[0.04] px-2 py-1 font-mono text-[10.5px] text-white/85"
                      : "whitespace-pre-wrap rounded-md border border-rose-400/20 bg-rose-500/[0.06] px-2 py-1 font-mono text-[10.5px] text-rose-100/90"
                  }
                >
                  {entry.output}
                </pre>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Snapshots
// ============================================================================

function SnapshotsCard() {
  const snapshots = useAtlasStore((s) => s.snapshots);
  const recentPayloads = useAtlasStore((s) => s.recentSnapshotPayloads);
  const removeSnapshot = useAtlasStore((s) => s.removeSnapshot);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [label, setLabel] = useState("");
  const [importResult, setImportResult] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const recentIds = new Set(recentPayloads.map((p) => p.id));

  const onRestoreFromRecent = (id: string) => {
    const ok = restoreSnapshotById(id);
    setImportResult(ok ? "Restored from in-memory snapshot" : "Restore failed");
    window.setTimeout(() => setImportResult(null), 4000);
  };

  const onCreate = () => {
    const lbl = label.trim() || "snapshot";
    setBusy(true);
    try {
      downloadSnapshot(lbl);
    } finally {
      setBusy(false);
      setLabel("");
    }
  };

  const onPickFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setBusy(true);
    const r = await restoreSnapshotFromFile(f);
    setImportResult(r.ok ? "Restored · stores updated" : `Failed · ${r.error}`);
    setBusy(false);
    if (fileRef.current) fileRef.current.value = "";
    window.setTimeout(() => setImportResult(null), 4000);
  };

  return (
    <section className="rounded-2xl border border-accent/25 bg-accent/[0.04] p-4 shadow-glow">
      <header className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Archive className="h-4 w-4 text-accent" />
          <span className="text-[13px] font-semibold text-white">Brain Snapshots</span>
        </div>
        <span className="rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider text-white/55">
          {snapshots.length} recorded
        </span>
      </header>

      <p className="text-[11.5px] text-white/65">
        Export the entire local state — brain identity, missions, receipts,
        workflow canvas, repo contexts, memory docs, pins, atlas layout — as
        a downloadable <span className="font-mono">.brainpack</span> file. Reimport
        on any machine to restore.
      </p>

      <div className="mt-3 flex flex-col gap-2 md:flex-row md:items-center">
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="snapshot label (optional)"
          className="flex-1 rounded-md border border-white/8 bg-white/[0.025] px-2 py-1.5 text-[12px] text-white placeholder:text-white/30 focus:border-accent/40 focus:outline-none"
        />
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onCreate}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-md bg-accent/90 px-3 py-1.5 text-[12px] font-semibold text-white shadow-glow transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Download className="h-3.5 w-3.5" /> Export
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".brainpack,application/json"
            onChange={onPickFile}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[12px] font-semibold text-white/85 hover:bg-white/[0.06]"
          >
            <Upload className="h-3.5 w-3.5" /> Restore
          </button>
        </div>
      </div>

      {importResult && (
        <p className="mt-2 rounded-md border border-accent/30 bg-accent/[0.08] px-2 py-1 font-mono text-[10.5px] uppercase tracking-wider text-accent">
          {importResult}
        </p>
      )}

      {snapshots.length > 0 && (
        <>
          <div className="mt-3 font-mono text-[9.5px] uppercase tracking-[0.22em] text-accent">
            time machine · last {recentPayloads.length} kept in memory for one-click restore
          </div>

          {/* Horizontal timeline */}
          {snapshots.length > 0 && (
            <div className="mt-1 flex items-center gap-1 overflow-auto pb-1">
              {snapshots.slice(0, 12).reverse().map((s, i) => {
                const has = recentIds.has(s.id);
                return (
                  <div key={s.id} className="flex shrink-0 flex-col items-center gap-0.5">
                    <button
                      type="button"
                      disabled={!has}
                      onClick={() => onRestoreFromRecent(s.id)}
                      title={has ? `Restore ${s.label}` : "snapshot file on disk · use Restore above"}
                      className={
                        has
                          ? "h-2.5 w-2.5 rounded-full bg-accent shadow-[0_0_8px_1px_rgba(124,155,255,0.6)] hover:scale-125"
                          : "h-2.5 w-2.5 rounded-full bg-white/25"
                      }
                    />
                    <span className="font-mono text-[9px] uppercase tracking-wider text-white/40">
                      {i === snapshots.slice(0, 12).length - 1 ? "now" : timeAgo(s.createdAt)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          <ul className="mt-2 flex max-h-[200px] flex-col gap-1 overflow-auto pr-1">
            {snapshots.map((s) => {
              const has = recentIds.has(s.id);
              return (
                <li
                  key={s.id}
                  className="flex items-center justify-between gap-2 rounded-md border border-white/8 bg-white/[0.012] px-2 py-1 text-[11px]"
                >
                  <span className="font-mono text-white/80">{s.label}</span>
                  <div className="flex items-center gap-2 font-mono text-[9.5px] uppercase tracking-wider text-white/45">
                    <span>{new Date(s.createdAt).toLocaleString()}</span>
                    <span>{(s.size / 1024).toFixed(1)}KB</span>
                    {has ? (
                      <button
                        type="button"
                        onClick={() => onRestoreFromRecent(s.id)}
                        className="inline-flex items-center gap-1 rounded border border-accent/30 bg-accent/[0.08] px-1.5 py-0.5 text-accent hover:bg-accent/[0.12]"
                      >
                        restore
                      </button>
                    ) : (
                      <span className="text-white/35">file only</span>
                    )}
                    <button
                      type="button"
                      onClick={() => removeSnapshot(s.id)}
                      className="rounded p-0.5 text-white/40 hover:bg-white/[0.06] hover:text-white/80"
                    >
                      <Trash2 className="h-2.5 w-2.5" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}

// ============================================================================
// Desktop trust
// ============================================================================

function DesktopTrustCard() {
  const sources = useBrainStore((s) => s.memorySources);
  const engines = useBrainStore((s) => s.engines);
  const history = useMissionStore((s) => s.history);
  const memoryDocs = useAtlasStore((s) => s.memoryDocs);
  const files = useAtlasStore((s) => s.files);
  const snapshots = useAtlasStore((s) => s.snapshots);

  const lastReceipt = history[0];
  const lastSnapshot = snapshots[0];
  const lastImport = memoryDocs[0];

  // Approximate brain size in bytes by summing localStorage keys.
  let storageBytes = 0;
  let storageKeys = 0;
  if (typeof window !== "undefined") {
    try {
      storageKeys = window.localStorage.length;
      for (let i = 0; i < storageKeys; i++) {
        const k = window.localStorage.key(i);
        if (!k) continue;
        storageBytes += k.length + (window.localStorage.getItem(k) ?? "").length;
      }
    } catch {
      // ignore
    }
  }

  const resetWorkspace = () => {
    if (typeof window === "undefined") return;
    if (
      !window.confirm(
        "Reset workspace? This clears all local stores: brain, missions, atlas. Snapshots stay on disk."
      )
    )
      return;
    try {
      window.localStorage.clear();
      window.location.reload();
    } catch {
      // ignore
    }
  };

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <header className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HardDrive className="h-4 w-4 text-accent" />
          <span className="text-[13px] font-semibold text-white">Desktop · trust layer</span>
        </div>
        <span className="rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider text-white/55">
          local only
        </span>
      </header>

      <ul className="grid grid-cols-2 gap-2 md:grid-cols-3">
        <Stat label="workspace" value="browser localStorage" />
        <Stat label="brain size" value={`${(storageBytes / 1024).toFixed(1)}KB`} hint={`${storageKeys} keys`} />
        <Stat label="memory docs" value={`${memoryDocs.length}`} />
        <Stat label="files tracked" value={`${files.length}`} />
        <Stat label="receipts" value={`${history.length}`} />
        <Stat
          label="last activity"
          value={lastReceipt ? new Date(lastReceipt.startedAt).toLocaleString() : "never"}
        />
        <Stat
          label="last import"
          value={lastImport ? new Date(lastImport.addedAt).toLocaleString() : "never"}
        />
        <Stat
          label="last backup"
          value={lastSnapshot ? new Date(lastSnapshot.createdAt).toLocaleString() : "never"}
        />
        <Stat
          label="engine"
          value={engines.length > 0 ? engines.map((e) => e.kind).join(" · ") : "deterministic"}
          hint={`${sources.length} sources`}
        />
      </ul>

      <p className="mt-3 text-[11px] text-white/55">
        Workspace path moves to a Tauri-managed directory when you install
        the desktop runtime — at which point this card swaps "browser
        localStorage" for the absolute on-disk path.
      </p>

      <div className="mt-3">
        <button
          type="button"
          onClick={resetWorkspace}
          className="inline-flex items-center gap-1 rounded-md border border-rose-400/25 bg-rose-500/[0.06] px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-rose-200 hover:bg-rose-500/[0.12]"
        >
          <Trash2 className="h-3 w-3" /> Reset workspace
        </button>
      </div>
    </section>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <li className="flex flex-col gap-0.5 rounded-md border border-white/8 bg-white/[0.012] px-2 py-1.5">
      <span className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-white/40">
        {label}
      </span>
      <span className="text-[12.5px] font-semibold text-white">{value}</span>
      {hint && (
        <span className="font-mono text-[9.5px] uppercase tracking-wider text-white/45">
          {hint}
        </span>
      )}
    </li>
  );
}

// ============================================================================
// Packaging
// ============================================================================

function PackagingCard() {
  type PackagingState = "ready" | "partial" | "planned";
  const PLATFORMS: Array<{
    label: string;
    arch: string;
    Icon: typeof Apple;
    state: PackagingState;
    hint: string;
  }> = [
    {
      label: "macOS",
      arch: "Apple Silicon · Intel",
      Icon: Apple,
      state: "partial",
      hint: "Tauri config present · installer not yet signed."
    },
    {
      label: "Windows",
      arch: "x86_64",
      Icon: Monitor,
      state: "partial",
      hint: "Tauri config present · MSI not yet packaged."
    },
    {
      label: "Linux",
      arch: "AppImage · deb",
      Icon: Monitor,
      state: "planned",
      hint: "AppImage / .deb build pending."
    }
  ];

  // Real local status · Sprint E. Icons were generated and committed; the
  // local `tauri build` is blocked on host GTK/WebKit system libs (see
  // TAURI_BUILD_REPORT.md) — so we report no artifact and no signing/updater.
  const localStatus: Array<{ k: string; v: string; ok: boolean }> = [
    { k: "app name", v: "Operator Core", ok: true },
    { k: "icons present", v: "yes", ok: true },
    { k: "macOS .app build", v: "ready · opens", ok: true },
    { k: "macOS .dmg", v: "ready · unsigned (CI=true)", ok: true },
    { k: "signing", v: "missing", ok: false },
    { k: "notarization", v: "missing", ok: false },
    { k: "updater", v: "missing", ok: false },
    {
      k: "artifact",
      v: "bundle/dmg/Operator Core_0.1.0_aarch64.dmg",
      ok: true
    }
  ];

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <header className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-accent" />
          <span className="text-[13px] font-semibold text-white">Operator Core · packaging</span>
        </div>
        <span className="rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-white/55">
          source build only
        </span>
      </header>

      <ul className="mb-3 grid grid-cols-2 gap-1.5 md:grid-cols-4">
        {localStatus.map((s) => (
          <li
            key={s.k}
            className="flex flex-col gap-0.5 rounded-md border border-white/8 bg-white/[0.012] px-2 py-1.5"
          >
            <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/40">
              {s.k}
            </span>
            <span
              className={
                s.ok ? "font-mono text-[11px] text-emerald-200/90" : "font-mono text-[11px] text-amber-200/90"
              }
            >
              {s.v}
            </span>
          </li>
        ))}
      </ul>

      <ul className="grid grid-cols-1 gap-2 md:grid-cols-3">
        {PLATFORMS.map((p) => (
          <li
            key={p.label}
            className="flex flex-col gap-1 rounded-xl border border-white/8 bg-white/[0.012] p-3"
          >
            <header className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <p.Icon className="h-3.5 w-3.5 text-accent" />
                <span className="text-[12.5px] font-semibold text-white">{p.label}</span>
              </div>
              <span
                className={
                  p.state === "ready"
                    ? "rounded border border-emerald-400/30 bg-emerald-500/[0.08] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-emerald-200"
                    : p.state === "partial"
                      ? "rounded border border-amber-400/30 bg-amber-500/[0.08] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-amber-200"
                      : "rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-white/55"
                }
              >
                {p.state}
              </span>
            </header>
            <span className="font-mono text-[10px] uppercase tracking-wider text-white/45">
              {p.arch}
            </span>
            <span className="text-[11px] text-white/55">{p.hint}</span>
          </li>
        ))}
      </ul>
      <div className="mt-3">
        <div className="mb-1.5 font-mono text-[9.5px] uppercase tracking-[0.22em] text-white/40">
          packaging readiness
        </div>
        <ul className="grid grid-cols-1 gap-1 md:grid-cols-2">
          <ReadinessRow label="Tauri config" state="ready" detail="src-tauri/tauri.conf.json · productName Operator Core" />
          <ReadinessRow label="App icons" state="ready" detail="generated · 32/128/@2x · icns · ico" />
          <ReadinessRow label="macOS .app build" state="ready" detail="builds + opens · unsigned · bundle/macos/Operator Core.app" />
          <ReadinessRow label="macOS .dmg" state="ready" detail="unsigned · `npm run tauri:build:ci` → bundle/dmg/Operator Core_0.1.0_aarch64.dmg" />
          <ReadinessRow label="Windows MSI build" state="partial" detail="needs MSVC + WebView2 · unsigned" />
          <ReadinessRow label="Linux AppImage / deb" state="planned" detail="install libgtk-3-dev + libwebkit2gtk-4.0-dev, then build" />
          <ReadinessRow label="Code signing · macOS" state="unknown" detail="developer ID + notarization not yet configured" />
          <ReadinessRow label="Code signing · Windows" state="unknown" detail="EV / OV certificate not yet acquired" />
          <ReadinessRow label="Auto-update" state="planned" detail="Tauri updater requires signed release feed" />
          <ReadinessRow label="Public installer" state="planned" detail="no signed binaries published yet — source build only" />
        </ul>
      </div>
      <p className="mt-3 text-[10.5px] text-white/45">
        Icons + config are ready. The local{" "}
        <span className="font-mono">npm run tauri:build</span> needs GTK/WebKit
        system libraries (Linux) or Xcode/MSVC (mac/win); signing keys land
        before any public installer. Offline support is built in — the
        deterministic engine never reaches the network.
      </p>
    </section>
  );
}

// ============================================================================
// Diagnostics
// ============================================================================

function DiagnosticsCard() {
  const [busy, setBusy] = useState(false);
  const [filename, setFilename] = useState<string | null>(null);

  const onExport = () => {
    setBusy(true);
    try {
      setFilename(downloadDiagnostics());
    } finally {
      setBusy(false);
      window.setTimeout(() => setFilename(null), 4000);
    }
  };

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <header className="mb-3 flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-accent" />
        <span className="text-[13px] font-semibold text-white">Diagnostics</span>
      </header>
      <p className="text-[11px] text-white/55">
        Build a Markdown report of runtime, storage, brain shape, recent
        receipts, and workflow runs. Useful for support, migration, and
        debug. Local only.
      </p>
      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={onExport}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-md bg-accent/90 px-3 py-1.5 text-[12px] font-semibold text-white shadow-glow transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
          Export diagnostics.md
        </button>
        {filename && (
          <span className="font-mono text-[10.5px] uppercase tracking-wider text-accent">
            saved {filename}
          </span>
        )}
      </div>
    </section>
  );
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return "just";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`;
  return `${Math.floor(diff / 86_400_000)}d`;
}

function ReadinessRow({
  label,
  state,
  detail
}: {
  label: string;
  state: "ready" | "partial" | "planned" | "unknown";
  detail: string;
}) {
  const cls = {
    ready: "border-emerald-400/30 bg-emerald-500/[0.08] text-emerald-200",
    partial: "border-amber-400/30 bg-amber-500/[0.08] text-amber-200",
    planned: "border-white/10 bg-white/[0.03] text-white/55",
    unknown: "border-white/10 bg-white/[0.03] text-white/45"
  }[state];
  return (
    <li className="flex items-center justify-between rounded-md border border-white/8 bg-white/[0.012] px-2 py-1 text-[11px]">
      <div className="flex min-w-0 flex-col">
        <span className="text-white/85">{label}</span>
        <span className="font-mono text-[9.5px] text-white/45">{detail}</span>
      </div>
      <span className={`rounded border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider ${cls}`}>
        {state}
      </span>
    </li>
  );
}

// ============================================================================
// Brain Health card
// ============================================================================

function BrainHealthCard() {
  // Re-measure on every render so counts stay fresh after edits.
  const health = measureBrainHealth();
  const [optReport, setOptReport] = useState<OptimizeReport | null>(null);
  const [busy, setBusy] = useState(false);

  const onOptimize = () => {
    if (busy) return;
    setBusy(true);
    try {
      const r = optimizeBrain();
      setOptReport(r);
      window.setTimeout(() => setOptReport(null), 6000);
    } finally {
      setBusy(false);
    }
  };

  const rows: Array<{ k: string; v: string; warn?: boolean }> = [
    { k: "storage", v: `${(health.storageBytes / 1024).toFixed(1)}KB · ${health.storageKeys} keys` },
    { k: "memory docs", v: String(health.memoryDocs), warn: health.duplicateDocs > 0 },
    { k: "duplicates", v: String(health.duplicateDocs), warn: health.duplicateDocs > 0 },
    { k: "receipts", v: `${health.receipts}${health.oldReceipts ? ` · ${health.oldReceipts} old` : ""}`, warn: health.oldReceipts > 0 },
    { k: "snapshots", v: String(health.snapshots) },
    { k: "imports", v: String(health.imports) },
    { k: "stale repos", v: String(health.staleRepos), warn: health.staleRepos > 0 },
    { k: "workflow", v: `${health.workflowNodes} nodes · ${health.workflowEdges} edges` },
    { k: "unused nodes", v: String(health.unusedWorkflowNodes), warn: health.unusedWorkflowNodes > 0 },
    { k: "orphan files", v: String(health.orphanFiles), warn: health.orphanFiles > 0 },
    { k: "inbox archived", v: String(health.inboxArchived), warn: health.inboxArchived > 0 }
  ];

  const totalRemovable =
    health.duplicateDocs +
    health.oldReceipts +
    health.unusedWorkflowNodes +
    health.orphanFiles +
    health.inboxArchived;

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <header className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BrainIcon className="h-4 w-4 text-accent" />
          <span className="text-[13px] font-semibold text-white">Brain Health</span>
        </div>
        <span className="rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider text-white/55">
          {totalRemovable === 0 ? "clean" : `${totalRemovable} cleanup item${totalRemovable === 1 ? "" : "s"}`}
        </span>
      </header>

      <ul className="grid grid-cols-1 gap-1 md:grid-cols-2 lg:grid-cols-3">
        {rows.map((r) => (
          <li
            key={r.k}
            className="flex items-center justify-between rounded-md border border-white/8 bg-white/[0.012] px-2 py-1 text-[11px]"
          >
            <span className="font-mono text-[9.5px] uppercase tracking-wider text-white/40">
              {r.k}
            </span>
            <span
              className={
                r.warn
                  ? "font-mono text-amber-200/85"
                  : "font-mono text-white/85"
              }
            >
              {r.v}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={onOptimize}
          disabled={busy || totalRemovable === 0}
          className="inline-flex items-center gap-1.5 rounded-md bg-accent/90 px-3 py-1.5 text-[12px] font-semibold text-white shadow-glow transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          Optimize Brain
        </button>
        <span className="font-mono text-[10px] uppercase tracking-wider text-white/45">
          drops duplicates · old receipts · unused workflow nodes · orphan files · archived inbox
        </span>
      </div>

      {optReport && (
        <div className="mt-2 rounded-md border border-emerald-400/25 bg-emerald-500/[0.06] p-2 text-[11px] text-emerald-100/90">
          <span className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-emerald-200/85">
            optimized ·{" "}
          </span>
          {optReport.duplicateDocsRemoved > 0 && <span>{optReport.duplicateDocsRemoved} duplicate docs · </span>}
          {optReport.oldReceiptsRemoved > 0 && <span>{optReport.oldReceiptsRemoved} old receipts · </span>}
          {optReport.unusedWorkflowNodesRemoved > 0 && <span>{optReport.unusedWorkflowNodesRemoved} workflow nodes · </span>}
          {optReport.orphanFilesRemoved > 0 && <span>{optReport.orphanFilesRemoved} orphan files · </span>}
          {optReport.archivedInboxRemoved > 0 && <span>{optReport.archivedInboxRemoved} archived inbox · </span>}
          {optReport.duplicateDocsRemoved +
            optReport.oldReceiptsRemoved +
            optReport.unusedWorkflowNodesRemoved +
            optReport.orphanFilesRemoved +
            optReport.archivedInboxRemoved ===
            0 && <span>nothing to drop</span>}
        </div>
      )}
    </section>
  );
}


// ============================================================================
// Telegram Bridge simulator · Phase 18 adapter seam
// ============================================================================

function BridgeSimulator() {
  const messages = useAtlasStore((s) => s.bridgeMessages);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const status = getBridgeStatus();

  const onSend = async () => {
    const v = input.trim();
    if (!v || busy) return;
    setBusy(true);
    await receiveInbound(v);
    setInput("");
    setBusy(false);
  };

  const onSimulateNotification = () => {
    sendNotification("test · bot → operator notification queued");
  };

  return (
    <div className="mt-3 rounded-md border border-white/10 bg-graphite-900/70 p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[9.5px] uppercase tracking-[0.22em] text-accent">
            bridge simulator
          </span>
          <span
            className={
              status.wired
                ? "rounded border border-emerald-400/30 bg-emerald-500/[0.08] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-emerald-200"
                : "rounded border border-amber-400/30 bg-amber-500/[0.08] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-amber-200"
            }
          >
            {status.wired ? "wired" : "not connected"}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setShowSetup((v) => !v)}
            className="rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider text-white/65 hover:bg-white/[0.06]"
          >
            {showSetup ? "hide setup" : "setup notes"}
          </button>
          <button
            type="button"
            onClick={onSimulateNotification}
            className="rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider text-white/65 hover:bg-white/[0.06]"
          >
            push test note
          </button>
          {messages.length > 0 && (
            <button
              type="button"
              onClick={clearBridge}
              className="rounded border border-rose-400/25 bg-rose-500/[0.06] px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider text-rose-200 hover:bg-rose-500/[0.12]"
            >
              clear
            </button>
          )}
        </div>
      </div>

      <p className="text-[10.5px] text-white/45">{status.reason}</p>

      {showSetup && (
        <ol className="mt-2 flex list-decimal flex-col gap-0.5 rounded-md border border-white/8 bg-black/30 px-4 py-2 text-[10.5px] text-white/70">
          {BRIDGE_SETUP_NOTES.map((n, i) => (
            <li key={i}>{n.replace(/^\d+\.\s*/, "")}</li>
          ))}
        </ol>
      )}

      <div className="mt-2 max-h-[200px] overflow-auto rounded-md border border-white/8 bg-black/40 p-2">
        {messages.length === 0 ? (
          <p className="font-mono text-[10.5px] text-white/45">
            Simulator empty. Send a /command below to exercise the same handlers a real bot would call.
          </p>
        ) : (
          <ul className="flex flex-col gap-1">
            {messages.map((m) => (
              <li key={m.id} className="flex items-start gap-2 font-mono text-[10.5px]">
                <span className="w-16 shrink-0 text-white/30">
                  {new Date(m.at).toLocaleTimeString()}
                </span>
                <span
                  className={
                    m.dir === "in"
                      ? "rounded border border-accent/30 bg-accent/[0.06] px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-accent"
                      : "rounded border border-emerald-400/25 bg-emerald-500/[0.06] px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-emerald-200"
                  }
                >
                  {m.dir === "in" ? "in" : "out"}
                </span>
                <span className="min-w-0 flex-1 whitespace-pre-wrap text-white/85">{m.text}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-2 flex items-center gap-1.5">
        <code className="rounded bg-black/40 px-1.5 py-1 font-mono text-[11px] text-accent">in</code>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void onSend();
          }}
          placeholder="simulate inbound · e.g. /status · /missions · /run hello"
          className="flex-1 rounded-md border border-white/8 bg-white/[0.025] px-2 py-1.5 font-mono text-[11.5px] text-white placeholder:text-white/30 focus:border-accent/40 focus:outline-none"
        />
        <button
          type="button"
          onClick={onSend}
          disabled={busy || !input.trim()}
          className="inline-flex items-center gap-1 rounded-md bg-accent/85 px-2.5 py-1.5 text-[11.5px] font-semibold text-white shadow-glow hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : "Send"}
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Settings section header · UX RESET 02
// Single-letter group marker + label + sub. Purely visual hierarchy.
// ============================================================================

function SettingsSection({
  letter,
  label,
  hint
}: {
  letter: string;
  label: string;
  hint: string;
}) {
  return (
    <header className="mt-2 flex items-center gap-3 pl-1 pt-1">
      <span className="flex h-7 w-7 items-center justify-center rounded-md border border-white/10 bg-white/[0.03] font-mono text-[12px] font-semibold uppercase tracking-wider text-white/65">
        {letter}
      </span>
      <div className="flex flex-col leading-tight">
        <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-white/45">
          {label}
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/30">
          {hint}
        </span>
      </div>
      <span className="ml-1 h-px flex-1 bg-white/8" aria-hidden />
    </header>
  );
}
