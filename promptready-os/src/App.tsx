import { useEffect } from "react";
import { AppRouter } from "@/routes";
import { useSettingsStore, useBrainStore } from "@/store";
import { BrainBootstrap } from "@/components/BrainBootstrap";

/**
 * App root — hydrates persisted stores, then mounts the router. The
 * BrainBootstrap overlay renders on top of the router when no brain
 * exists yet; it doesn't block the shell from rendering underneath, so
 * the user always sees the product behind the bootstrap.
 */

export function App() {
  useEffect(() => {
    void useSettingsStore.getState().hydrate();
    useBrainStore.getState().hydrate();
  }, []);

  return (
    <>
      <AppRouter />
      <BrainBootstrap />
    </>
  );
}
