"use client";

import { useState } from "react";
import WelcomeStep from "./WelcomeStep";
import RepoStep from "./RepoStep";
import TokenStep from "./TokenStep";
import PinStep from "./PinStep";
import CompleteStep from "./CompleteStep";
import QuickSetup from "./QuickSetup";
import { useBatteryStore } from "@/lib/store";
import { t } from "@/lib/i18n";

export type OnboardingData = {
  owner: string;
  repo: string;
  token: string;
  pin: string;
};

export default function OnboardingWizard() {
  const lang = useBatteryStore((s) => s.settings.language) ?? "hu";
  const STEPS = [
    t("onboarding.step.welcome", lang),
    t("onboarding.step.repo", lang),
    t("onboarding.step.token", lang),
    t("onboarding.step.pin", lang),
    t("onboarding.step.done", lang),
  ];
  const [step, setStep] = useState(0);
  const [quickMode, setQuickMode] = useState(false);
  const [data, setData] = useState<OnboardingData>({
    owner: "",
    repo: "battery-cell-data",
    token: "",
    pin: "",
  });

  const updateData = (updates: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  };

  if (quickMode) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-green-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 p-4">
        <div className="w-full max-w-lg">
          <div className="rounded-2xl bg-white dark:bg-gray-800 p-8 shadow-xl shadow-gray-200/50 dark:shadow-black/30">
            <QuickSetup onBack={() => setQuickMode(false)} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-green-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 p-4">
      <div className="w-full max-w-lg">
        {/* Progress indicator */}
        <div className="mb-8 flex items-center justify-center gap-2">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div
                className={`
                  flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors
                  ${i < step
                    ? "bg-green-500 text-white"
                    : i === step
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                  }
                `}
              >
                {i < step ? (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  i + 1
                )}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`h-0.5 w-8 transition-colors ${i < step ? "bg-green-500" : "bg-gray-200 dark:bg-gray-700"}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step content */}
        <div className="rounded-2xl bg-white dark:bg-gray-800 p-8 shadow-xl shadow-gray-200/50 dark:shadow-black/30">
          {step === 0 && (
            <WelcomeStep
              onNext={() => setStep(1)}
              onQuickSetup={() => setQuickMode(true)}
            />
          )}
          {step === 1 && (
            <RepoStep
              data={data}
              onChange={updateData}
              onNext={() => setStep(2)}
              onBack={() => setStep(0)}
            />
          )}
          {step === 2 && (
            <TokenStep
              data={data}
              onChange={updateData}
              onNext={() => setStep(3)}
              onBack={() => setStep(1)}
            />
          )}
          {step === 3 && (
            <PinStep
              onNext={(pin) => {
                updateData({ pin });
                setStep(4);
              }}
              onBack={() => setStep(2)}
            />
          )}
          {step === 4 && (
            <CompleteStep
              data={data}
              onBack={() => setStep(3)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
