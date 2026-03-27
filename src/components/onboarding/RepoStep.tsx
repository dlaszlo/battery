"use client";

import Button from "../ui/Button";
import Input from "../ui/Input";
import type { OnboardingData } from "./OnboardingWizard";

interface RepoStepProps {
  data: OnboardingData;
  onChange: (updates: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function RepoStep({ data, onChange, onNext, onBack }: RepoStepProps) {
  const canProceed = data.owner.trim() !== "" && data.repo.trim() !== "";

  return (
    <div>
      <h2 className="mb-2 text-xl font-bold text-gray-900">GitHub repó beállítás</h2>
      <p className="mb-6 text-sm text-gray-600">
        Hozz létre egy privát repót a GitHub-on, ahol az adataid tárolódnak.
      </p>

      <div className="mb-6 rounded-lg bg-blue-50 p-4">
        <h3 className="mb-2 text-sm font-semibold text-blue-900">Lépések:</h3>
        <ol className="space-y-2 text-sm text-blue-800">
          <li className="flex gap-2">
            <span className="font-bold">1.</span>
            <span>
              Nyisd meg a{" "}
              <a
                href="https://github.com/new"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium underline hover:text-blue-600"
              >
                github.com/new
              </a>{" "}
              oldalt
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
            <span>Válaszd a <strong>Private</strong> opciót</span>
          </li>
          <li className="flex gap-2">
            <span className="font-bold">4.</span>
            <span>Kattints a &quot;Create repository&quot; gombra</span>
          </li>
        </ol>
      </div>

      <div className="space-y-4">
        <Input
          label="GitHub felhasználónév"
          placeholder="pl. johndoe"
          value={data.owner}
          onChange={(e) => onChange({ owner: e.target.value })}
        />
        <Input
          label="Repó neve"
          placeholder="battery-cell-data"
          value={data.repo}
          onChange={(e) => onChange({ repo: e.target.value })}
          hint="Ha nem változtatod meg, a battery-cell-data nevet használjuk."
        />
      </div>

      <div className="mt-6 flex justify-between">
        <Button variant="ghost" onClick={onBack}>
          Vissza
        </Button>
        <Button onClick={onNext} disabled={!canProceed}>
          Tovább
        </Button>
      </div>
    </div>
  );
}
