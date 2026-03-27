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
  const { validate, validating, error } = useGitHubValidation();
  const setGitHubConfig = useBatteryStore((s) => s.setGitHubConfig);
  const initialize = useBatteryStore((s) => s.initialize);
  const [loading, setLoading] = useState(false);

  const canSubmit = owner.trim() !== "" && token.startsWith("github_pat_");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const config = {
      token,
      owner: owner.trim(),
      repo: repo.trim() || DEFAULT_GITHUB_REPO,
      filePath: DEFAULT_GITHUB_FILE_PATH,
    };

    const valid = await validate(config);
    if (!valid) return;

    setLoading(true);
    setGitHubConfig(config);
    await initialize();
  };

  return (
    <div>
      <h2 className="mb-2 text-xl font-bold text-gray-900">{t("onboarding.quick.titleFull", lang)}</h2>
      <p className="mb-6 text-sm text-gray-600">
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
