import { createBrowserRouter, isRouteErrorResponse, Navigate, RouterProvider, useRouteError } from "react-router-dom";
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
import LaunchpadPage from "@/modules/launchpad/LaunchpadPage";
import MarketIntelPage from "@/modules/market-intel/MarketIntelPage";
import MoveReplayPage from "@/modules/move-replay/MoveReplayPage";
import MarketBriefingPage from "@/modules/market-briefing/MarketBriefingPage";

/**
 * Route registry.
 *
 * Visible labels and paths use the current names: Launchpad, Market
 * Intel, Move Replay, Market Briefing. Legacy paths (/apps, /why,
 * /replay, /war-room) are kept as redirects so old bookmarks and
 * deep links still resolve.
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
      { path: "market-intel", element: <MarketIntelPage /> },
      { path: "move-replay", element: <MoveReplayPage /> },
      { path: "market-briefing", element: <MarketBriefingPage /> },
      { path: "voice", element: <VoiceConsolePage /> },
      { path: "workflows", element: <WorkflowsPage /> },
      { path: "brain", element: <BrainPage /> },
      { path: "atlas", element: <AtlasPage /> },
      { path: "marketplace", element: <MarketplacePage /> },
      { path: "server", element: <ServerPage /> },
      { path: "launchpad", element: <LaunchpadPage /> },
      { path: "settings", element: <SettingsPage /> },

      // legacy redirects · keep old links working
      { path: "apps", element: <Navigate to="/launchpad" replace /> },
      { path: "why", element: <Navigate to="/market-intel" replace /> },
      { path: "replay", element: <Navigate to="/move-replay" replace /> },
      { path: "war-room", element: <Navigate to="/market-briefing" replace /> }
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
