"use client";

import { useState, useRef, useEffect } from "react";
import Button from "../ui/Button";
import { useBatteryStore } from "@/lib/store";
import { t } from "@/lib/i18n";

interface PinStepProps {
  onNext: (pin: string) => void;
  onBack: () => void;
}

export default function PinStep({ onNext, onBack }: PinStepProps) {
  const lang = useBatteryStore((s) => s.settings.language) ?? "hu";
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (pin.length < 4 || pin.length > 8) {
      setError(t("pin.lengthError", lang));
      return;
    }
    if (!/^\d+$/.test(pin)) {
      setError(t("pin.digitsOnly", lang));
      return;
    }
    if (pin !== confirmPin) {
      setError(t("pin.mismatch", lang));
      return;
    }

    onNext(pin);
  };

  return (
    <div>
      <div className="mb-6 flex justify-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100">
          <svg className="h-7 w-7 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
        </div>
      </div>

      <h2 className="mb-2 text-center text-xl font-bold text-gray-900">{t("pin.setupTitle", lang)}</h2>
      <p className="mb-6 text-center text-sm text-gray-600 leading-relaxed">{t("pin.setupDesc", lang)}</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">PIN</label>
          <input
            ref={inputRef}
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={8}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            className="block w-full rounded-lg border border-gray-300 px-4 py-3 text-center text-2xl font-mono tracking-[0.5em] placeholder:text-gray-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="****"
            autoComplete="off"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">{t("pin.confirm", lang)}</label>
          <input
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={8}
            value={confirmPin}
            onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
            className="block w-full rounded-lg border border-gray-300 px-4 py-3 text-center text-2xl font-mono tracking-[0.5em] placeholder:text-gray-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="****"
            autoComplete="off"
          />
        </div>

        {error && (
          <p className="text-center text-sm text-red-600">{error}</p>
        )}

        <div className="flex justify-between pt-2">
          <Button type="button" variant="ghost" onClick={onBack}>
            {t("onboarding.complete.back", lang)}
          </Button>
          <Button type="submit" disabled={pin.length < 4}>
            {t("onboarding.complete.next", lang)}
          </Button>
        </div>
      </form>
    </div>
  );
}
