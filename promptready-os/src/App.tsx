import { useEffect } from "react";
import { AppRouter } from "@/routes";
import {
  useSettingsStore,
  useBrainStore,
  useMissionStore,
  useThemeStore
} from "@/store";
import { BrainBootstrap } from "@/components/BrainBootstrap";

/**
 * App root — hydrates persisted stores then mounts the router. Theme
 * hydration runs first so the visible palette is correct on first
 * paint. The BrainBootstrap overlay renders on top until a brain
 * identity exists.
 */

export function App() {
  useEffect(() => {
    useThemeStore.getState().hydrate();
    void useSettingsStore.getState().hydrate();
    useBrainStore.getState().hydrate();
    useMissionStore.getState().hydrate();
  }, []);

  return (
    <>
      <AppRouter />
      <BrainBootstrap />
    </>
  );
}
