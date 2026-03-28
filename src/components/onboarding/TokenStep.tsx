"use client";

import { useState, lazy, Suspense } from "react";
import Button from "../ui/Button";
import Input from "../ui/Input";
import { useGitHubValidation } from "@/hooks/useGitHub";

const QrScanner = lazy(() => import("../ui/QrScanner"));
import { useBatteryStore } from "@/lib/store";
import { DEFAULT_GITHUB_FILE_PATH } from "@/lib/constants";
import { t } from "@/lib/i18n";
import type { OnboardingData } from "./OnboardingWizard";

interface TokenStepProps {
  data: OnboardingData;
  onChange: (updates: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function TokenStep({ data, onChange, onNext, onBack }: TokenStepProps) {
  const lang = useBatteryStore((s) => s.settings.language) ?? "hu";
  const { validate, validating, error } = useGitHubValidation();
  const [showToken, setShowToken] = useState(false);
  const [showQr, setShowQr] = useState(false);

  const handleNext = async () => {
    const valid = await validate({
      token: data.token,
      owner: data.owner,
      repo: data.repo,
      filePath: DEFAULT_GITHUB_FILE_PATH,
    });
    if (valid) onNext();
  };

  const canProceed = data.token.trim().startsWith("github_pat_");
  const tokenSettingsUrl = `https://github.com/settings/personal-access-tokens/new`;

  return (
    <div>
      <h2 className="mb-2 text-xl font-bold text-gray-900">{t("onboarding.token.title", lang)}</h2>
      <p className="mb-6 text-sm text-gray-600">
        {t("onboarding.token.descFull", lang, { repo: data.repo })}
      </p>

      <div className="mb-6 rounded-lg bg-amber-50 p-4">
        <h3 className="mb-2 text-sm font-semibold text-amber-900">{t("onboarding.token.stepsTitle", lang)}</h3>
        <ol className="space-y-2 text-sm text-amber-800">
          <li className="flex gap-2">
            <span className="font-bold">1.</span>
            <span>
              {t("onboarding.token.step1Open", lang)}{" "}
              <a
                href={tokenSettingsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium underline hover:text-amber-600"
              >
                Fine-grained token
              </a>{" "}
              {t("onboarding.token.step1Page", lang)}
            </span>
          </li>
          <li className="flex gap-2">
            <span className="font-bold">2.</span>
            <span>Token name: <strong>Battery Tracker</strong></span>
          </li>
          <li className="flex gap-2">
            <span className="font-bold">3.</span>
            <span>Expiration: <strong>Custom</strong> ({t("onboarding.token.step3Exp", lang)})</span>
          </li>
          <li className="flex gap-2">
            <span className="font-bold">4.</span>
            <span>
              Repository access: <strong>Only select repositories</strong> &rarr;{" "}
              <code className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-xs">{data.repo}</code>
            </span>
          </li>
          <li className="flex gap-2">
            <span className="font-bold">5.</span>
            <span>
              Permissions &rarr; Repository permissions &rarr; <strong>Contents</strong>: Read and write
            </span>
          </li>
          <li className="flex gap-2">
            <span className="font-bold">6.</span>
            <span>{t("onboarding.token.step6", lang)}</span>
          </li>
        </ol>
      </div>

      <div className="space-y-4">
        {showQr ? (
          <Suspense fallback={<div className="py-8 text-center text-sm text-gray-400">Loading...</div>}>
            <QrScanner
              onScan={(value) => {
                onChange({ token: value });
                setShowQr(false);
              }}
              onClose={() => setShowQr(false)}
            />
          </Suspense>
        ) : (
          <>
            <div className="relative">
              <Input
                label={t("onboarding.token.tokenLabel", lang)}
                placeholder={t("onboarding.token.tokenPlaceholder", lang)}
                type={showToken ? "text" : "password"}
                value={data.token}
                onChange={(e) => onChange({ token: e.target.value })}
                error={error || undefined}
                hint={!error ? t("onboarding.token.hint", lang) : undefined}
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-3 top-7 text-gray-400 hover:text-gray-600"
              >
                {showToken ? (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
              </button>
            </div>
            <button
              type="button"
              onClick={() => setShowQr(true)}
              className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75z" />
              </svg>
              {t("onboarding.token.scanQr", lang)}
            </button>
          </>
        )}
      </div>

      <div className="mt-6 flex justify-between">
        <Button variant="ghost" onClick={onBack}>
          {t("onboarding.token.back", lang)}
        </Button>
        <Button onClick={handleNext} disabled={!canProceed} loading={validating}>
          {t("onboarding.token.verify", lang)}
        </Button>
      </div>
    </div>
  );
}
