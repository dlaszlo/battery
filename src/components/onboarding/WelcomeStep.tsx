"use client";

import Button from "../ui/Button";
import { useBatteryStore } from "@/lib/store";
import { t } from "@/lib/i18n";

interface WelcomeStepProps {
  onNext: () => void;
  onQuickSetup: () => void;
}

export default function WelcomeStep({ onNext, onQuickSetup }: WelcomeStepProps) {
  const lang = useBatteryStore((s) => s.settings.language) ?? "hu";
  return (
    <div className="text-center">
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 dark:bg-blue-900/50">
        <svg className="h-8 w-8 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 10.5h.375c.621 0 1.125.504 1.125 1.125v2.25c0 .621-.504 1.125-1.125 1.125H21M4.5 10.5h6.75V15H4.5v-4.5zM3.75 18h15A2.25 2.25 0 0021 15.75v-6a2.25 2.25 0 00-2.25-2.25h-15A2.25 2.25 0 001.5 9.75v6A2.25 2.25 0 003.75 18z" />
        </svg>
      </div>

      <h1 className="mb-3 text-2xl font-bold text-gray-900 dark:text-gray-100">
        Battery Cell Tracker
      </h1>

      <p className="mb-6 text-gray-600 dark:text-gray-400 leading-relaxed">
        {t("onboarding.welcome.descFull", lang)}
      </p>

      <div className="mb-8 space-y-3 text-left">
        <Feature icon="clipboard" text={t("onboarding.welcome.feature.inventory", lang)} />
        <Feature icon="chart" text={t("onboarding.welcome.feature.trends", lang)} />
        <Feature icon="shield" text={t("onboarding.welcome.feature.scrap", lang)} />
        <Feature icon="cloud" text={t("onboarding.welcome.feature.cloud", lang)} />
      </div>

      <Button onClick={onNext} size="lg" className="w-full">
        {t("onboarding.welcome.start", lang)}
      </Button>
      <button
        onClick={onQuickSetup}
        className="mt-3 w-full text-center text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
      >
        {t("onboarding.welcome.quickSetup", lang)} &rarr;
      </button>
    </div>
  );
}

function Feature({ icon, text }: { icon: string; text: string }) {
  const icons: Record<string, React.ReactNode> = {
    clipboard: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.251 2.251 0 011.65.75" />
    ),
    chart: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    ),
    shield: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    ),
    cloud: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15a4.5 4.5 0 004.5 4.5H18a3.75 3.75 0 001.332-7.257 3 3 0 00-3.758-3.848 5.25 5.25 0 00-10.233 2.33A4.502 4.502 0 002.25 15z" />
    ),
  };

  return (
    <div className="flex items-start gap-3">
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/50">
        <svg className="h-3.5 w-3.5 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          {icons[icon]}
        </svg>
      </div>
      <span className="text-sm text-gray-700 dark:text-gray-300">{text}</span>
    </div>
  );
}
