import { createBrowserRouter, isRouteErrorResponse, Navigate, RouterProvider, useRouteError } from "react-router-dom";
import { ShellLayout } from "@/layouts/ShellLayout";
import HomePage from "@/modules/home/HomePage";
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

/**
 * Route registry.
 *
 * Five visible surfaces: Home, Markets, Console, Library, Launchpad,
 * Settings. Everything else is reachable through the command palette
 * (Cmd+K) and via legacy redirects so old deep-links continue to
 * resolve.
 */

const router = createBrowserRouter([
  {
    path: "/",
    element: <ShellLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "markets", element: <MarketLabPage />, errorElement: <MarketsRouteError /> },
      { path: "console", element: <MissionControlPage /> },
      { path: "library", element: <LibraryPage /> },
      { path: "launchpad", element: <LaunchpadPage /> },
      { path: "settings", element: <SettingsPage /> },

      // Cmd+K-only / legacy surfaces · still routable
      { path: "agents", element: <AgentsPage /> },
      { path: "memory", element: <MemoryPage /> },
      { path: "terminal", element: <IntelligenceTerminalPage /> },
      { path: "voice", element: <VoiceConsolePage /> },
      { path: "workflows", element: <WorkflowsPage /> },
      { path: "brain", element: <BrainPage /> },
      { path: "atlas", element: <AtlasPage /> },
      { path: "marketplace", element: <MarketplacePage /> },
      { path: "server", element: <ServerPage /> },

      // Legacy redirects
      { path: "mission-control", element: <Navigate to="/console" replace /> },
      { path: "market-lab", element: <Navigate to="/markets" replace /> },
      { path: "market-intel", element: <Navigate to="/markets?tab=intel" replace /> },
      { path: "move-replay", element: <Navigate to="/markets?tab=replay" replace /> },
      { path: "market-briefing", element: <Navigate to="/markets?tab=briefing" replace /> },
      { path: "apps", element: <Navigate to="/launchpad" replace /> },
      { path: "why", element: <Navigate to="/markets?tab=intel" replace /> },
      { path: "replay", element: <Navigate to="/markets?tab=replay" replace /> },
      { path: "war-room", element: <Navigate to="/markets?tab=briefing" replace /> }
    ]
  }
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}

function MarketsRouteError() {
  const error = useRouteError();
  const detail = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : "unknown rendering error";

  return (
    <div className="flex min-h-[calc(100vh-43px)] w-full items-center justify-center p-8">
      <section
        role="alert"
        className="flex w-full max-w-md flex-col gap-3 rounded-2xl bg-white/[0.03] p-6"
      >
        <h1 className="text-[18px] font-semibold text-white">Markets is recovering</h1>
        <p className="text-[13px] leading-relaxed text-white/60">
          Something tripped while drawing the workspace. The rest of Operator Center kept running.
        </p>
        <pre className="overflow-auto rounded-lg bg-black/30 px-3 py-2 text-[11.5px] text-white/65">
          {detail}
        </pre>
      </section>
    </div>
  );
}
