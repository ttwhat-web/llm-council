import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { ShellLayout } from "@/layouts/ShellLayout";

/**
 * Route registry. New modules add a route file under `modules/<name>/route.tsx`
 * and register it here. Until each module's first screen lands, the placeholder
 * card explains what's coming.
 */

const router = createBrowserRouter([
  {
    path: "/",
    element: <ShellLayout />,
    children: [
      { index: true, element: <Placeholder name="Dashboard" hint="Recent prompts · active sessions · usage telemetry · productivity insight." /> },
      { path: "fixer", element: <Placeholder name="PromptFixer" hint="Lift the existing 3-column Mission Control surface from promptfixer-sidekick/ here." /> },
      { path: "launcher", element: <Placeholder name="Multi AI Launcher" hint="One-click route to Claude · ChatGPT · Gemini · Perplexity · Cursor · Ollama." /> },
      { path: "vault", element: <Placeholder name="Prompt Memory Vault" hint="Folders · tags · FTS5 search · workflows · pinned." /> },
      { path: "sessions", element: <Placeholder name="Session Continuity" hint="Drafts · timeline · recovery banner." /> },
      { path: "settings", element: <Placeholder name="Settings" hint="Providers · shortcuts · BYOK keychain · autosave window · telemetry consent." /> }
    ]
  }
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}

function Placeholder({ name, hint }: { name: string; hint: string }) {
  return (
    <div className="mx-auto flex max-w-[920px] flex-col gap-4 p-8">
      <div className="text-[11px] font-medium uppercase tracking-[0.2em] text-white/35">
        Module · {name}
      </div>
      <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.012] p-8">
        <div className="text-[14px] text-white/75">{name}</div>
        <p className="mt-2 max-w-[60ch] text-[12px] text-white/50">{hint}</p>
        <p className="mt-3 font-mono text-[10px] text-white/30">
          Scaffold only. Implementation lands per the MVP phase plan in README.md.
        </p>
      </div>
    </div>
  );
}
