"use client";

import Button from "../ui/Button";
import Input from "../ui/Input";
import { useBatteryStore } from "@/lib/store";
import { t } from "@/lib/i18n";
import type { OnboardingData } from "./OnboardingWizard";

interface RepoStepProps {
  data: OnboardingData;
  onChange: (updates: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function RepoStep({ data, onChange, onNext, onBack }: RepoStepProps) {
  const lang = useBatteryStore((s) => s.settings.language) ?? "hu";
  const canProceed = data.owner.trim() !== "" && data.repo.trim() !== "";

  return (
    <div>
      <h2 className="mb-2 text-xl font-bold text-gray-900">{t("onboarding.repo.setupTitle", lang)}</h2>
      <p className="mb-6 text-sm text-gray-600">
        {t("onboarding.repo.setupDesc", lang)}
      </p>

      <div className="mb-6 rounded-lg bg-blue-50 p-4">
        <h3 className="mb-2 text-sm font-semibold text-blue-900">{t("onboarding.repo.stepsTitle", lang)}</h3>
        <ol className="space-y-2 text-sm text-blue-800">
          <li className="flex gap-2">
            <span className="font-bold">1.</span>
            <span>
              {t("onboarding.repo.step1Open", lang)}{" "}
              <a
                href="https://github.com/new"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium underline hover:text-blue-600"
              >
                github.com/new
              </a>{" "}
              {t("onboarding.repo.step1Page", lang)}
            </span>
          </li>
          <li className="flex gap-2">
            <span className="font-bold">2.</span>
            <span>
              Repository name: <code className="rounded bg-blue-100 px-1.5 py-0.5 font-mono text-xs">{data.repo}</code>
            </span>
          </li>
          <li className="flex gap-2">
            <span className="font-bold">3.</span>
            <span>{t("onboarding.repo.step3", lang)} <strong>Private</strong> {t("onboarding.repo.step3Option", lang)}</span>
          </li>
          <li className="flex gap-2">
            <span className="font-bold">4.</span>
            <span>{t("onboarding.repo.step4", lang)}</span>
          </li>
        </ol>
      </div>

      <div className="space-y-4">
        <Input
          label={t("onboarding.repo.ownerLabel", lang)}
          placeholder={t("onboarding.repo.ownerPlaceholder", lang)}
          value={data.owner}
          onChange={(e) => onChange({ owner: e.target.value })}
        />
        <Input
          label={t("onboarding.repo.repoLabel", lang)}
          placeholder="battery-cell-data"
          value={data.repo}
          onChange={(e) => onChange({ repo: e.target.value })}
          hint={t("onboarding.repo.repoHint", lang)}
        />
      </div>

      <div className="mt-6 flex justify-between">
        <Button variant="ghost" onClick={onBack}>
          {t("onboarding.repo.back", lang)}
        </Button>
        <Button onClick={onNext} disabled={!canProceed}>
          {t("onboarding.repo.next", lang)}
        </Button>
      </div>
    </div>
  );
}
