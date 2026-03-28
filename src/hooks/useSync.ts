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

  const configState = useBatteryStore((s) => s.configState);

  // Configured = either unlocked (PIN entered) or has some config (needs PIN)
  // Only show onboarding if there is NO config at all
  return {
    initialized,
    syncState,
    isConfigured: !!githubConfig || configState === "plaintext" || configState === "encrypted",
  };
}
