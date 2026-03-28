"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { useGitHubValidation } from "@/hooks/useGitHub";
import { useBatteryStore } from "@/lib/store";
import { DEFAULT_GITHUB_FILE_PATH, DEFAULT_GITHUB_REPO } from "@/lib/constants";
import { t } from "@/lib/i18n";

interface QuickSetupProps {
  onBack: () => void;
}

export default function QuickSetup({ onBack }: QuickSetupProps) {
  const lang = useBatteryStore((s) => s.settings.language) ?? "hu";
  const [owner, setOwner] = useState("");
  const [repo, setRepo] = useState(DEFAULT_GITHUB_REPO);
  const [token, setToken] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  const { validate, validating, error } = useGitHubValidation();
  const setGitHubConfig = useBatteryStore((s) => s.setGitHubConfig);
  const initialize = useBatteryStore((s) => s.initialize);
  const [loading, setLoading] = useState(false);

  const canSubmit = owner.trim() !== "" && token.startsWith("github_pat_") && pin.length >= 4;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError(null);

    if (pin.length < 4 || pin.length > 8) {
      setPinError(t("pin.lengthError", lang));
      return;
    }
    if (!/^\d+$/.test(pin)) {
      setPinError(t("pin.digitsOnly", lang));
      return;
    }
    if (pin !== confirmPin) {
      setPinError(t("pin.mismatch", lang));
      return;
    }

    const config = {
      token,
      owner: owner.trim(),
      repo: repo.trim() || DEFAULT_GITHUB_REPO,
      filePath: DEFAULT_GITHUB_FILE_PATH,
    };

    const valid = await validate(config);
    if (!valid) return;

    setLoading(true);
    await setGitHubConfig(config, pin);
    await initialize();
  };

  return (
    <div>
      <h2 className="mb-2 text-xl font-bold text-gray-900 dark:text-gray-100">{t("onboarding.quick.titleFull", lang)}</h2>
      <p className="mb-6 text-sm text-gray-600 dark:text-gray-400">
        {t("onboarding.quick.descFull", lang, { repo })}
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label={t("onboarding.quick.ownerLabel", lang)}
          placeholder={t("onboarding.quick.ownerPlaceholder", lang)}
          value={owner}
          onChange={(e) => setOwner(e.target.value)}
        />
        <Input
          label={t("onboarding.quick.repoLabel", lang)}
          placeholder={DEFAULT_GITHUB_REPO}
          value={repo}
          onChange={(e) => setRepo(e.target.value)}
        />
        <Input
          label={t("onboarding.quick.tokenLabel", lang)}
          placeholder={t("onboarding.quick.tokenPlaceholder", lang)}
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          error={error || undefined}
        />

        <div className="rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 p-4 space-y-3">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("pin.setupTitle", lang)}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{t("pin.setupDescShort", lang)}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="PIN"
              type="password"
              inputMode="numeric"
              maxLength={8}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              placeholder="****"
            />
            <Input
              label={t("pin.confirm", lang)}
              type="password"
              inputMode="numeric"
              maxLength={8}
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
              placeholder="****"
            />
          </div>
          {pinError && <p className="text-sm text-red-600">{pinError}</p>}
        </div>

        <div className="flex justify-between pt-2">
          <Button type="button" variant="ghost" onClick={onBack}>
            {t("onboarding.quick.backBtn", lang)}
          </Button>
          <Button type="submit" disabled={!canSubmit} loading={validating || loading}>
            {t("onboarding.quick.connect", lang)}
          </Button>
        </div>
      </form>
    </div>
  );
}
