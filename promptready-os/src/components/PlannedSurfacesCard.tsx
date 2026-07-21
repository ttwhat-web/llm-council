"use client";

import { Cloud, Github, HardDrive, Mail, Phone, Plug, Send, Building2 } from "lucide-react";

/**
 * Phase 26–29 planned surfaces · Phase 30 demo glue.
 *
 * Architecture cards · no real implementations. Each panel describes
 * the contract the desktop runtime will fill in. Status pills are
 * honest.
 */

export function CloudSyncCard() {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <header className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Cloud className="h-4 w-4 text-accent" />
          <span className="text-[13px] font-semibold text-white">Cloud Sync · Phase 26</span>
        </div>
        <Pill state="planned" />
      </header>
      <p className="text-[11.5px] text-white/65">
        Optional encrypted sync for multi-device operators. Local-first
        remains the default — cloud sync is opt-in.
      </p>
      <ul className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
        <Row title="Device pairing" body="QR or paste-code · scoped tokens · revocable from any device." />
        <Row title="Encrypted workspace" body="Brain + missions + atlas snapshot encrypted at rest in transit." />
        <Row title="Conflict resolution" body="Last-write-wins per slice · receipts always merge · workflow runs diverge by space." />
        <Row title="Provider choice" body="Operator-supplied bucket (S3 · B2 · R2) or self-hosted relay." />
      </ul>
      <p className="mt-3 text-[10px] text-white/40">
        Status · planned. No cloud calls until the operator turns it on.
      </p>
    </section>
  );
}

export function MobileCompanionRoadmapCard() {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <header className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Phone className="h-4 w-4 text-accent" />
          <span className="text-[13px] font-semibold text-white">Mobile Companion · Phase 27</span>
        </div>
        <Pill state="planned" />
      </header>
      <p className="text-[11.5px] text-white/65">
        Phone is a remote control, not a full app. Capture, approve,
        receipts viewer, alerts. QR pairs to the desktop · destructive
        actions require explicit approval.
      </p>
      <ul className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
        <Row title="Capture" body="voice · screenshot · share sheet" />
        <Row title="Approve" body="cloud spend · repo writes · shell" />
        <Row title="Receipts" body="open · copy · forward" />
        <Row title="Inbox" body="quick dispatch templates" />
      </ul>
      <p className="mt-3 text-[10px] text-white/40">
        Pairing code generation already works (Settings → Mobile Companion).
        Networking ships with the desktop runtime.
      </p>
    </section>
  );
}

export function ConnectorHubCard() {
  const rows: Array<{ Icon: typeof Github; name: string; state: "planned" | "local-only" | "not-connected" | "ready"; cap: string }> = [
    { Icon: Github, name: "GitHub", state: "local-only", cap: "manual repo context · indexer planned" },
    { Icon: Mail, name: "Gmail", state: "planned", cap: "OAuth scope: read-only inbox digest" },
    { Icon: HardDrive, name: "Google Drive", state: "planned", cap: "OAuth scope: pick folder · index docs" },
    { Icon: Plug, name: "Obsidian vault", state: "planned", cap: "local folder watcher" },
    { Icon: Plug, name: "Notion", state: "planned", cap: "internal integration token" },
    { Icon: Plug, name: "Slack", state: "planned", cap: "read channels · receipt push" },
    { Icon: Send, name: "Telegram", state: "local-only", cap: "bridge needs setup · networking Coming soon" },
    { Icon: HardDrive, name: "Local folder", state: "ready", cap: "drag-drop import lands in Memory Vault" }
  ];
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <header className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Plug className="h-4 w-4 text-accent" />
          <span className="text-[13px] font-semibold text-white">Connector Hub · Phase 28</span>
        </div>
        <span className="rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider text-white/55">
          capability matrix
        </span>
      </header>
      <ul className="grid grid-cols-1 gap-1 md:grid-cols-2">
        {rows.map((r) => (
          <li
            key={r.name}
            className="flex items-start gap-2 rounded-md border border-white/8 bg-white/[0.012] px-2 py-1.5 text-[11px]"
          >
            <r.Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
            <div className="flex min-w-0 flex-col">
              <span className="flex items-center gap-1.5 text-[12px] text-white">
                {r.name}
                <Pill state={r.state} />
              </span>
              <span className="text-[10.5px] text-white/55">{r.cap}</span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function EnterpriseServerCard() {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <header className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-accent" />
          <span className="text-[13px] font-semibold text-white">Operator Cloud / Enterprise Server · Phase 29</span>
        </div>
        <Pill state="planned" />
      </header>
      <p className="text-[11.5px] text-white/65">
        Self-host story for teams that can't run individual desktops.
        Backs the Phase 24 compliance declarations with real enforcement.
      </p>
      <ul className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
        <Row title="Self-host" body="Docker · Helm chart" />
        <Row title="BYOK" body="provider keys in keychain" />
        <Row title="Audit export" body="continuous → SIEM" />
        <Row title="SSO" body="OIDC · SAML" />
        <Row title="RBAC" body="Roles enforced at API" />
        <Row title="Air-gap" body="no outbound HTTP" />
        <Row title="Encrypted" body="brainpack at rest" />
        <Row title="Backup" body="snapshot rotation" />
      </ul>
    </section>
  );
}

function Row({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-md border border-white/8 bg-white/[0.012] px-2 py-1.5">
      <span className="text-[12px] font-semibold text-white">{title}</span>
      <span className="text-[10.5px] text-white/55">{body}</span>
    </div>
  );
}

function Pill({ state }: { state: "ready" | "planned" | "local-only" | "not-connected" }) {
  const cls = {
    ready: "border-emerald-400/30 bg-emerald-500/[0.08] text-emerald-200",
    "local-only": "border-amber-400/30 bg-amber-500/[0.08] text-amber-200",
    "not-connected": "border-white/10 bg-white/[0.03] text-white/55",
    planned: "border-white/10 bg-white/[0.03] text-white/55"
  }[state];
  return (
    <span className={`rounded border px-1 py-px font-mono text-[9px] uppercase tracking-wider ${cls}`}>
      {state}
    </span>
  );
}
