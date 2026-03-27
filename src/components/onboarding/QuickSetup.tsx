"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { useGitHubValidation } from "@/hooks/useGitHub";
import { useBatteryStore } from "@/lib/store";
import { DEFAULT_GITHUB_FILE_PATH, DEFAULT_GITHUB_REPO } from "@/lib/constants";

interface QuickSetupProps {
  onBack: () => void;
}

export default function QuickSetup({ onBack }: QuickSetupProps) {
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
      <h2 className="mb-2 text-xl font-bold text-gray-900">Gyors beállítás</h2>
      <p className="mb-6 text-sm text-gray-600">
        Add meg a GitHub felhasználóneved és a tokent. A repónak (<code className="rounded bg-gray-100 px-1 py-0.5 font-mono text-xs">{repo}</code>) már léteznie kell.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="GitHub felhasználónév"
          placeholder="pl. johndoe"
          value={owner}
          onChange={(e) => setOwner(e.target.value)}
        />
        <Input
          label="Repó neve"
          placeholder={DEFAULT_GITHUB_REPO}
          value={repo}
          onChange={(e) => setRepo(e.target.value)}
        />
        <Input
          label="Fine-grained PAT"
          placeholder="github_pat_..."
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          error={error || undefined}
        />

        <div className="flex justify-between pt-2">
          <Button type="button" variant="ghost" onClick={onBack}>
            Vissza
          </Button>
          <Button type="submit" disabled={!canSubmit} loading={validating || loading}>
            Csatlakozás
          </Button>
        </div>
      </form>
    </div>
  );
}
