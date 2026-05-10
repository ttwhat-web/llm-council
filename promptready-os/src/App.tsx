import { useEffect } from "react";
import { AppRouter } from "@/routes";
import { useSettingsStore } from "@/store";

/**
 * App root — boots the settings store, then mounts the router.
 *
 * Stores hydrate lazily; only settings is awaited so the rest of the
 * tree can render immediately without a flash. Other stores call
 * `load()` from inside their owning module's first effect.
 */

export function App() {
  useEffect(() => {
    void useSettingsStore.getState().hydrate();
  }, []);

  return <AppRouter />;
}
