"use client";

import { useMemo, useRef, useState, type ChangeEvent } from "react";
import clsx from "clsx";
import {
  Briefcase,
  Check,
  Download,
  FlaskConical,
  Loader2,
  Package,
  Search,
  Sparkles,
  Upload
} from "lucide-react";
import { SurfaceHeader } from "@/components/primitives/SurfaceHeader";
import {
  STARTER_PACKS,
  installPack,
  listInstalledPacks,
  exportPack,
  importPackFromFile,
  type Pack,
  type PackKind
} from "@/services/marketplace";
import { auditLog } from "@/services/auditLog";

/**
 * Marketplace · Phase 23.
 *
 * Browse starter packs · install installs real local artifacts
 * (workflow nodes + edges, terminal pins, repo sources, mission
 * templates noted in the install log). Import a `.pack.json` from
 * disk or export the current bundled pack to share.
 */

const KIND_ICON: Record<PackKind, typeof Package> = {
  brain: Briefcase,
  workflow: Package,
  template: Sparkles,
  repo: Package,
  agent: Sparkles,
  "atlas-layout": Briefcase,
  "memory-vault": FlaskConical
};

const KIND_LABEL: Record<PackKind, string> = {
  brain: "Brain Pack",
  workflow: "Workflow Pack",
  template: "Template Pack",
  repo: "Repo Pack",
  agent: "Agent Pack",
  "atlas-layout": "Atlas Layout",
  "memory-vault": "Memory Vault"
};

export default function MarketplacePage() {
  const [query, setQuery] = useState("");
  const [kindFilter, setKindFilter] = useState<PackKind | "all">("all");
  const [installing, setInstalling] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const installed = listInstalledPacks();
  const installedIds = new Set(installed.map((p) => p.id));

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return STARTER_PACKS.filter((p) => {
      if (kindFilter !== "all" && p.kind !== kindFilter) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.blurb.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q)
      );
    });
  }, [query, kindFilter]);

  const onInstall = async (pack: Pack) => {
    setInstalling(pack.id);
    setFlash(null);
    try {
      const r = installPack(pack);
      auditLog("pack.install", {
        pack: pack.id,
        nodes: r.workflowNodesAdded,
        edges: r.workflowEdgesAdded,
        templates: r.templatesAdded,
        repos: r.reposAdded,
        pins: r.pinsAdded
      });
      const parts: string[] = [];
      if (r.workflowNodesAdded) parts.push(`${r.workflowNodesAdded} workflow node${r.workflowNodesAdded === 1 ? "" : "s"}`);
      if (r.workflowEdgesAdded) parts.push(`${r.workflowEdgesAdded} edge${r.workflowEdgesAdded === 1 ? "" : "s"}`);
      if (r.templatesAdded) parts.push(`${r.templatesAdded} mission template${r.templatesAdded === 1 ? "" : "s"}`);
      if (r.reposAdded) parts.push(`${r.reposAdded} repo source${r.reposAdded === 1 ? "" : "s"}`);
      if (r.pinsAdded) parts.push(`${r.pinsAdded} terminal pin${r.pinsAdded === 1 ? "" : "s"}`);
      setFlash(
        parts.length > 0
          ? `installed · ${parts.join(" · ")}`
          : "installed · pack contents already present"
      );
    } finally {
      setInstalling(null);
      window.setTimeout(() => setFlash(null), 5000);
    }
  };

  const onExport = (pack: Pack) => {
    const r = exportPack(pack);
    setFlash(`exported ${r.filename}`);
    window.setTimeout(() => setFlash(null), 3500);
  };

  const onImport = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const pack = await importPackFromFile(file);
    if (!pack) {
      setFlash("import failed · not a valid pack.json");
    } else {
      const r = installPack(pack);
      auditLog("pack.install", {
        pack: pack.id,
        source: "import",
        nodes: r.workflowNodesAdded,
        templates: r.templatesAdded
      });
      setFlash(`imported ${pack.name}`);
    }
    if (fileRef.current) fileRef.current.value = "";
    window.setTimeout(() => setFlash(null), 4000);
  };

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-5 px-5 py-5 md:px-7 md:py-7">
      <SurfaceHeader
        eyebrow="marketplace · operator packs"
        title="Marketplace"
        sub="Starter packs · workflows, templates, terminal pins and repo presets that install into the current brain. Local-only. Browse · install · export · share."
        right={
          <div className="flex items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept=".json,.pack.json,application/json"
              onChange={onImport}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-[12px] font-medium text-white/85 hover:bg-white/[0.06]"
            >
              <Upload className="h-3.5 w-3.5" /> Import .pack.json
            </button>
            <span className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-white/55">
              {installed.length} installed
            </span>
          </div>
        }
      />

      <section className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/8 bg-white/[0.02] p-3">
        <label className="flex flex-1 items-center gap-1.5 rounded-md border border-white/8 bg-white/[0.025] px-2 py-1 text-[12px] text-white/75">
          <Search className="h-3 w-3 text-white/40" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="search packs · names · blurbs · ids"
            className="w-full bg-transparent placeholder:text-white/30 focus:outline-none"
          />
        </label>
        <div className="flex flex-wrap items-center gap-1">
          {(["all", "brain", "workflow", "template"] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKindFilter(k as PackKind | "all")}
              className={
                kindFilter === k
                  ? "rounded border border-accent/40 bg-accent/[0.1] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-accent"
                  : "rounded border border-white/10 bg-white/[0.03] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-white/65 hover:bg-white/[0.06]"
              }
            >
              {k}
            </button>
          ))}
        </div>
      </section>

      {flash && (
        <p className="rounded-md border border-accent/30 bg-accent/[0.08] px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-wider text-accent">
          {flash}
        </p>
      )}

      <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((p) => {
          const Icon = KIND_ICON[p.kind] ?? Package;
          const wasInstalled = installedIds.has(p.id);
          return (
            <li
              key={p.id}
              className={clsx(
                "flex flex-col gap-2 rounded-2xl border p-4 transition",
                wasInstalled
                  ? "border-accent/30 bg-accent/[0.04] shadow-glow"
                  : "border-white/8 bg-white/[0.02] hover:border-accent/25 hover:bg-white/[0.03]"
              )}
            >
              <header className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-accent" />
                  <span className="text-[13px] font-semibold text-white">{p.name}</span>
                </div>
                <span className="rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-white/55">
                  {KIND_LABEL[p.kind] ?? p.kind}
                </span>
              </header>
              <p className="text-[11.5px] text-white/65">{p.blurb}</p>
              <p className="font-mono text-[9.5px] uppercase tracking-wider text-white/40">
                {p.author} · v{p.version}
              </p>

              <ul className="flex flex-wrap gap-1">
                {p.contents.workflowNodes?.length ? (
                  <Chip label={`${p.contents.workflowNodes.length} workflow nodes`} />
                ) : null}
                {p.contents.missionTemplates?.length ? (
                  <Chip label={`${p.contents.missionTemplates.length} templates`} />
                ) : null}
                {p.contents.pinnedTerminal ? <Chip label="terminal pins" /> : null}
                {p.contents.repoLabels?.length ? <Chip label={`${p.contents.repoLabels.length} repos`} /> : null}
              </ul>

              <div className="mt-auto flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onInstall(p)}
                  disabled={installing === p.id}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md bg-accent/90 px-2.5 py-1.5 text-[11.5px] font-semibold text-white shadow-glow transition hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {installing === p.id ? <Loader2 className="h-3 w-3 animate-spin" /> : wasInstalled ? <Check className="h-3 w-3" /> : <Download className="h-3 w-3" />}
                  {wasInstalled ? "Re-install" : "Install"}
                </button>
                <button
                  type="button"
                  onClick={() => onExport(p)}
                  className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.03] px-2 py-1.5 font-mono text-[10px] uppercase tracking-wider text-white/65 hover:bg-white/[0.06]"
                >
                  export
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {installed.length > 0 && (
        <section className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
          <header className="mb-2 flex items-center gap-2">
            <Package className="h-3.5 w-3.5 text-accent" />
            <span className="text-[13px] font-semibold text-white">Installed packs</span>
          </header>
          <ul className="flex flex-col gap-1">
            {installed.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between rounded-md border border-white/8 bg-white/[0.012] px-2 py-1 text-[11px]"
              >
                <span className="font-mono text-white/80">{p.name}</span>
                <span className="font-mono text-[9.5px] uppercase tracking-wider text-white/45">
                  {new Date(p.installedAt).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Chip({ label }: { label: string }) {
  return (
    <span className="rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-wider text-white/65">
      {label}
    </span>
  );
}
