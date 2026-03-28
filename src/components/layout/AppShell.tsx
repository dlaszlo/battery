"use client";

import { ReactNode, useState, useEffect, useCallback, useRef } from "react";
import { useSync } from "@/hooks/useSync";
import { ToastProvider } from "@/components/ui/Toast";
import Navbar from "./Navbar";
import Footer from "./Footer";
import ThemeProvider from "./ThemeProvider";
import OnboardingWizard from "../onboarding/OnboardingWizard";
import PinDialog from "../ui/PinDialog";
import { t } from "@/lib/i18n";
import { useBatteryStore } from "@/lib/store";
import { getPinLockoutDelay } from "@/lib/sync";

const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

export default function AppShell({ children }: { children: ReactNode }) {
  const { initialized, isConfigured } = useSync();
  const lang = useBatteryStore((s) => s.settings.language) ?? "hu";
  const configState = useBatteryStore((s) => s.configState);
  const unlockWithPin = useBatteryStore((s) => s.unlockWithPin);
  const lockSession = useBatteryStore((s) => s.lockSession);

  const [pinError, setPinError] = useState<string | null>(null);
  const [pinLoading, setPinLoading] = useState(false);
  const [wiped, setWiped] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Session timeout: lock after inactivity
  const resetTimer = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      const state = useBatteryStore.getState();
      if (state.configState === "unlocked") {
        lockSession();
      }
    }, SESSION_TIMEOUT_MS);
  }, [lockSession]);

  useEffect(() => {
    if (configState !== "unlocked") return;

    const events = ["mousedown", "keydown", "touchstart", "scroll"];
    const handler = () => resetTimer();
    events.forEach((e) => window.addEventListener(e, handler, { passive: true }));
    resetTimer();

    return () => {
      events.forEach((e) => window.removeEventListener(e, handler));
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [configState, resetTimer]);

  if (!initialized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white text-lg font-bold">
            B
          </div>
          <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
            <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {t("loading", lang)}
          </div>
        </div>
      </div>
    );
  }

  // Wiped — show message then go to onboarding
  if (wiped) {
    return (
      <ThemeProvider>
        <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
          <div className="w-full max-w-sm rounded-2xl border border-red-200 dark:border-red-800 bg-white dark:bg-gray-800 p-8 shadow-lg text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-red-100 dark:bg-red-900/50">
              <svg className="h-6 w-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <h2 className="mb-2 text-lg font-bold text-gray-900 dark:text-gray-100">
              {lang === "hu" ? "Túl sok sikertelen próbálkozás" : "Too many failed attempts"}
            </h2>
            <p className="mb-6 text-sm text-gray-600 dark:text-gray-400">
              {lang === "hu"
                ? "A titkosított konfiguráció törölve lett. Add meg újra a GitHub tokenedet és állíts be egy új PIN kódot."
                : "The encrypted configuration has been wiped. Please re-enter your GitHub token and set a new PIN."}
            </p>
            <button
              onClick={() => setWiped(false)}
              className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              {lang === "hu" ? "Újrakezdés" : "Start Over"}
            </button>
          </div>
        </div>
      </ThemeProvider>
    );
  }

  // PIN required: plaintext (migration) or encrypted (unlock)
  if (configState === "plaintext" || configState === "encrypted") {
    const mode = configState === "plaintext" ? "migrate" : "unlock";
    const lockoutDelay = getPinLockoutDelay();
    return (
      <ThemeProvider>
        <PinDialog
          mode={mode}
          lang={lang}
          error={pinError}
          loading={pinLoading}
          lockoutMs={lockoutDelay}
          onSubmit={async (pin) => {
            setPinError(null);
            setPinLoading(true);
            const result = await unlockWithPin(pin);
            setPinLoading(false);
            if (result === "wiped") {
              setWiped(true);
            } else if (!result) {
              const remaining = 10 - ((JSON.parse(localStorage.getItem("battery-pin-attempts") || "{}")).count || 0);
              const remainingText = remaining > 0
                ? (lang === "hu"
                  ? ` (${remaining} próbálkozás maradt)`
                  : ` (${remaining} attempts remaining)`)
                : "";
              setPinError(
                (lang === "hu" ? "Hibás PIN kód" : "Wrong PIN") + remainingText
              );
            }
          }}
        />
      </ThemeProvider>
    );
  }

  if (!isConfigured) {
    return (
      <ToastProvider>
        <ThemeProvider>
          <OnboardingWizard />
        </ThemeProvider>
      </ToastProvider>
    );
  }

  return (
    <ToastProvider>
      <ThemeProvider>
        <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-900">
          <Navbar />
          <main className="flex-1">
            <div className="mx-auto max-w-6xl px-4 py-6">{children}</div>
          </main>
          <Footer />
        </div>
      </ThemeProvider>
    </ToastProvider>
  );
}
