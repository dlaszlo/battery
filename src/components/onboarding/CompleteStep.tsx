"use client";

import { useState } from "react";
import Button from "../ui/Button";
import { useBatteryStore } from "@/lib/store";
import { DEFAULT_GITHUB_FILE_PATH } from "@/lib/constants";
import { t } from "@/lib/i18n";
import type { OnboardingData } from "./OnboardingWizard";

interface CompleteStepProps {
  data: OnboardingData;
  onBack: () => void;
}

export default function CompleteStep({ data, onBack }: CompleteStepProps) {
  const lang = useBatteryStore((s) => s.settings.language) ?? "hu";
  const setGitHubConfig = useBatteryStore((s) => s.setGitHubConfig);
  const initialize = useBatteryStore((s) => s.initialize);
  const [loading, setLoading] = useState(false);

  const handleComplete = async () => {
    setLoading(true);
    await setGitHubConfig({
      token: data.token,
      owner: data.owner,
      repo: data.repo,
      filePath: DEFAULT_GITHUB_FILE_PATH,
    }, data.pin);
    await initialize();
  };

  return (
    <div className="text-center">
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-green-100 dark:bg-green-900/50">
        <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>

      <h2 className="mb-3 text-xl font-bold text-gray-900 dark:text-gray-100">{t("onboarding.complete.titleFull", lang)}</h2>

      <p className="mb-6 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
        {t("onboarding.complete.descFull", lang)}
      </p>

      <div className="mb-8 rounded-lg bg-gray-50 dark:bg-gray-700/50 p-4 text-left">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500 dark:text-gray-400">{t("onboarding.complete.user", lang)}</span>
            <span className="font-medium text-gray-900 dark:text-gray-100">{data.owner}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500 dark:text-gray-400">{t("onboarding.complete.repo", lang)}</span>
            <span className="font-medium text-gray-900 dark:text-gray-100">{data.repo}</span>
          </div>
        </div>
      </div>

      <div className="flex justify-between">
        <Button variant="ghost" onClick={onBack} disabled={loading}>
          {t("onboarding.complete.back", lang)}
        </Button>
        <Button onClick={handleComplete} size="lg" loading={loading}>
          {t("onboarding.complete.launch", lang)}
        </Button>
      </div>
    </div>
  );
}
