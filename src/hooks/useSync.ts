import { useEffect, useRef } from "react";
import { useBatteryStore } from "@/lib/store";
import { useToast } from "@/components/ui/Toast";
import { t } from "@/lib/i18n";
import type { SyncState } from "@/lib/types";

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

  // beforeunload: warn if there are pending changes or sync is in progress
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      const state = useBatteryStore.getState();
      if (state.syncState.pendingChanges || state.syncState.status === "syncing") {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  return {
    initialized,
    syncState,
    isConfigured: !!githubConfig || configState === "plaintext" || configState === "encrypted",
  };
}

export function useSyncToasts() {
  const syncState = useBatteryStore((s) => s.syncState);
  const lang = useBatteryStore((s) => s.settings.language) ?? "hu";
  const { toast } = useToast();
  const prevRef = useRef<SyncState | null>(null);
  // Track if we've seen a user-initiated sync (not just the initial pull)
  const hasSeenPendingRef = useRef(false);

  useEffect(() => {
    const prev = prevRef.current;
    prevRef.current = syncState;

    if (!prev) return;

    // Track if we ever had pending changes (user-initiated sync)
    if (syncState.pendingChanges) {
      hasSeenPendingRef.current = true;
    }

    // Only fire toasts for user-initiated syncs (not initial pull on unlock)
    if (!hasSeenPendingRef.current) return;

    // syncing → idle (success)
    if (prev.status === "syncing" && syncState.status === "idle") {
      toast(t("sync.syncedToast", lang), "success");
    }

    // syncing → error
    if (prev.status === "syncing" && syncState.status === "error") {
      if (syncState.retryCount > 0) {
        toast(t("sync.retrying", lang), "info");
      } else {
        toast(syncState.error || t("sync.errorToast", lang), "error", 5000);
      }
    }

    // syncing → conflict
    if (prev.status === "syncing" && syncState.status === "conflict") {
      toast(t("sync.conflictToast", lang), "error", 5000);
    }
  }, [syncState, lang, toast]);
}
