"use client";

import { ReactNode } from "react";
import { useSync } from "@/hooks/useSync";
import { ToastProvider } from "@/components/ui/Toast";
import Navbar from "./Navbar";
import Footer from "./Footer";
import ThemeProvider from "./ThemeProvider";
import OnboardingWizard from "../onboarding/OnboardingWizard";

export default function AppShell({ children }: { children: ReactNode }) {
  const { initialized, isConfigured } = useSync();

  if (!initialized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white text-lg font-bold">
            B
          </div>
          <div className="flex items-center gap-3 text-gray-500">
            <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Betöltés...
          </div>
        </div>
      </div>
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
