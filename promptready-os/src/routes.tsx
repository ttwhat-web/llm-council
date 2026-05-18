import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { ShellLayout } from "@/layouts/ShellLayout";
import MissionControlPage from "@/modules/mission-control/MissionControlPage";
import AgentsPage from "@/modules/agents/AgentsPage";
import MemoryPage from "@/modules/memory/MemoryPage";
import LibraryPage from "@/modules/library/LibraryPage";
import IntelligenceTerminalPage from "@/modules/intelligence-terminal/IntelligenceTerminalPage";
import WorkflowsPage from "@/modules/workflows/WorkflowsPage";
import BrainPage from "@/modules/brain/BrainPage";
import AtlasPage from "@/modules/atlas/AtlasPage";
import SettingsPage from "@/modules/settings/SettingsPage";

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
      { path: "workflows", element: <WorkflowsPage /> },
      { path: "brain", element: <BrainPage /> },
      { path: "atlas", element: <AtlasPage /> },
      { path: "settings", element: <SettingsPage /> }
    ]
  }
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}
