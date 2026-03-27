import { useEffect } from "react";
import { useBatteryStore } from "@/lib/store";

export function useSync() {
  const initialize = useBatteryStore((s) => s.initialize);
  const initialized = useBatteryStore((s) => s.initialized);
  const syncState = useBatteryStore((s) => s.syncState);
  const githubConfig = useBatteryStore((s) => s.githubConfig);

  useEffect(() => {
    if (!initialized) {
      initialize();
    }
  }, [initialized, initialize]);

  return {
    initialized,
    syncState,
    isConfigured: !!githubConfig,
  };
}
