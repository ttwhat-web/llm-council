import { useEffect } from "react";
import { AppRouter } from "@/routes";
import {
  useSettingsStore,
  useBrainStore,
  useMissionStore,
  useThemeStore,
  useAtlasStore
} from "@/store";
import { useSpacesStore } from "@/store/spaces";
import { BrainBootstrap } from "@/components/BrainBootstrap";
import { RecoveryBanner } from "@/components/RecoveryBanner";
import { bumpCrashCounter } from "@/services/telemetry";
import { refreshEnvStatus } from "@/services/runtimeBridge";

export function App() {
  useEffect(() => {
    useThemeStore.getState().hydrate();
    void useSettingsStore.getState().hydrate();
    useBrainStore.getState().hydrate();
    useMissionStore.getState().hydrate();
    useAtlasStore.getState().hydrate();
    useSpacesStore.getState().hydrate();

    // Crash detection: a recovery checkpoint that survived a reload
    // means the previous session shut down before the mission finished.
    const checkpoint = useAtlasStore.getState().recovery;
    if (checkpoint?.hadInFlightMission) {
      bumpCrashCounter();
    }

    // Desktop runtime: cache connector env-status (configured flags only,
    // never values) so status readers reflect desktop-configured keys.
    void refreshEnvStatus();
  }, []);

  return (
    <>
      <AppRouter />
      <BrainBootstrap />
      <RecoveryBanner />
    </>
  );
}
