import { createBrowserRouter, isRouteErrorResponse, RouterProvider, useRouteError } from "react-router-dom";
import { ShellLayout } from "@/layouts/ShellLayout";
import MissionControlPage from "@/modules/mission-control/MissionControlPage";
import AgentsPage from "@/modules/agents/AgentsPage";
import MemoryPage from "@/modules/memory/MemoryPage";
import LibraryPage from "@/modules/library/LibraryPage";
import IntelligenceTerminalPage from "@/modules/intelligence-terminal/IntelligenceTerminalPage";
import MarketLabPage from "@/modules/market-lab/MarketLabPage";
import VoiceConsolePage from "@/modules/voice/VoiceConsolePage";
import WorkflowsPage from "@/modules/workflows/WorkflowsPage";
import BrainPage from "@/modules/brain/BrainPage";
import AtlasPage from "@/modules/atlas/AtlasPage";
import MarketplacePage from "@/modules/marketplace/MarketplacePage";
import ServerPage from "@/modules/server/ServerPage";
import SettingsPage from "@/modules/settings/SettingsPage";
import AppsPage from "@/modules/apps/AppsPage";
import WhyCenterPage from "@/modules/why-center/WhyCenterPage";
import TradeReplayPage from "@/modules/trade-replay/TradeReplayPage";
import WarRoomPage from "@/modules/war-room/WarRoomPage";

/**
 * Route registry · Phase 11 rebuild.
 *
 * Eight top-level surfaces matching the left rail. The index route is
 * Mission Control — the centerpiece HUD. The other seven render their
 * own modules. No more `Placeholder` cards; every surface ships a real
 * (honest) screen.
 */

const router = createBrowserRouter([
  {
    path: "/",
    element: <ShellLayout />,
    children: [
      { index: true, element: <AtlasPage /> },
      { path: "mission-control", element: <MissionControlPage /> },
      { path: "agents", element: <AgentsPage /> },
      { path: "memory", element: <MemoryPage /> },
      { path: "library", element: <LibraryPage /> },
      { path: "terminal", element: <IntelligenceTerminalPage /> },
      { path: "market-lab", element: <MarketLabPage />, errorElement: <MarketLabRouteError /> },
      { path: "voice", element: <VoiceConsolePage /> },
      { path: "workflows", element: <WorkflowsPage /> },
      { path: "brain", element: <BrainPage /> },
      { path: "atlas", element: <AtlasPage /> },
      { path: "marketplace", element: <MarketplacePage /> },
      { path: "server", element: <ServerPage /> },
      { path: "apps", element: <AppsPage /> },
      { path: "why", element: <WhyCenterPage /> },
      { path: "replay", element: <TradeReplayPage /> },
      { path: "war-room", element: <WarRoomPage /> },
      { path: "settings", element: <SettingsPage /> }
    ]
  }
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}

function MarketLabRouteError() {
  const error = useRouteError();
  const detail = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : "unknown chart rendering error";

  return (
    <div className="flex min-h-[calc(100vh-43px)] w-full items-center justify-center bg-[#03050a] p-4 text-white">
      <section
        role="alert"
        className="flex w-full max-w-xl flex-col gap-3 rounded-lg border border-rose-400/30 bg-rose-500/[0.06] p-4"
      >
        <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-rose-200">
          market lab recovered
        </span>
        <h1 className="text-[18px] font-semibold">Chart surface unavailable</h1>
        <p className="text-[12px] leading-snug text-white/70">
          Market Lab caught a rendering error before it could take down the app.
        </p>
        <div className="rounded-md border border-white/10 bg-black/35 px-2 py-1.5 font-mono text-[10px] text-white/65">
          {detail}
        </div>
      </section>
    </div>
  );
}
