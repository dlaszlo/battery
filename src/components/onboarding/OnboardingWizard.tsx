"use client";

import { useState } from "react";
import WelcomeStep from "./WelcomeStep";
import RepoStep from "./RepoStep";
import TokenStep from "./TokenStep";
import CompleteStep from "./CompleteStep";
import QuickSetup from "./QuickSetup";

export type OnboardingData = {
  owner: string;
  repo: string;
  token: string;
};

const STEPS = ["Üdvözlünk", "Repó", "Token", "Kész"];

export default function OnboardingWizard() {
  const [step, setStep] = useState(0);
  const [quickMode, setQuickMode] = useState(false);
  const [data, setData] = useState<OnboardingData>({
    owner: "",
    repo: "battery-cell-data",
    token: "",
  });

  const updateData = (updates: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  };

  if (quickMode) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-green-50 p-4">
        <div className="w-full max-w-lg">
          <div className="rounded-2xl bg-white p-8 shadow-xl shadow-gray-200/50">
            <QuickSetup onBack={() => setQuickMode(false)} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-green-50 p-4">
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
                      : "bg-gray-200 text-gray-500"
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
                <div className={`h-0.5 w-8 transition-colors ${i < step ? "bg-green-500" : "bg-gray-200"}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step content */}
        <div className="rounded-2xl bg-white p-8 shadow-xl shadow-gray-200/50">
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
            <CompleteStep
              data={data}
              onBack={() => setStep(2)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
