import { useEffect } from "react";
import { AppRouter } from "@/routes";
import {
  useSettingsStore,
  useBrainStore,
  useMissionStore,
  useThemeStore,
  useAtlasStore
} from "@/store";
import { BrainBootstrap } from "@/components/BrainBootstrap";

export function App() {
  useEffect(() => {
    useThemeStore.getState().hydrate();
    void useSettingsStore.getState().hydrate();
    useBrainStore.getState().hydrate();
    useMissionStore.getState().hydrate();
    useAtlasStore.getState().hydrate();
  }, []);

  return (
    <>
      <AppRouter />
      <BrainBootstrap />
    </>
  );
}
