"use client";

import { useState, useRef, useEffect } from "react";
import Button from "./Button";

interface PinDialogProps {
  mode: "create" | "unlock" | "migrate";
  onSubmit: (pin: string) => void;
  error?: string | null;
  loading?: boolean;
  lang: "hu" | "en";
  lockoutMs?: number;
}

const labels = {
  create: {
    hu: { title: "PIN kód beállítása", desc: "Adj meg egy 4-8 jegyű PIN kódot a GitHub token védelméhez. Minden app induláskor meg kell adnod.", confirm: "PIN megerősítése", btn: "Beállítás", mismatch: "A két PIN kód nem egyezik" },
    en: { title: "Set PIN Code", desc: "Enter a 4-8 digit PIN to protect your GitHub token. You'll need to enter it every time you open the app.", confirm: "Confirm PIN", btn: "Set PIN", mismatch: "PINs do not match" },
  },
  unlock: {
    hu: { title: "PIN kód megadása", desc: "Add meg a PIN kódodat a GitHub token visszafejtéséhez.", confirm: "", btn: "Feloldás", mismatch: "" },
    en: { title: "Enter PIN", desc: "Enter your PIN to decrypt the GitHub token.", confirm: "", btn: "Unlock", mismatch: "" },
  },
  migrate: {
    hu: { title: "PIN kód beállítása", desc: "A biztonsági frissítés részeként a GitHub tokened mostantól titkosítva tárolódik. Adj meg egy PIN kódot a védelméhez.", confirm: "PIN megerősítése", btn: "Token titkosítása", mismatch: "A két PIN kód nem egyezik" },
    en: { title: "Set PIN Code", desc: "As a security update, your GitHub token will now be stored encrypted. Set a PIN to protect it.", confirm: "Confirm PIN", btn: "Encrypt Token", mismatch: "PINs do not match" },
  },
};

export default function PinDialog({ mode, onSubmit, error, loading, lang, lockoutMs = 0 }: PinDialogProps) {
  const l = labels[mode][lang];
  const needsConfirm = mode === "create" || mode === "migrate";

  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(Math.ceil(lockoutMs / 1000));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Countdown timer for lockout
  useEffect(() => {
    setCountdown(Math.ceil(lockoutMs / 1000));
  }, [lockoutMs]);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const isLockedOut = countdown > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (pin.length < 4 || pin.length > 8) {
      setLocalError(lang === "hu" ? "A PIN kód 4-8 számjegyű legyen" : "PIN must be 4-8 digits");
      return;
    }
    if (!/^\d+$/.test(pin)) {
      setLocalError(lang === "hu" ? "Csak számjegyek használhatók" : "Only digits allowed");
      return;
    }
    if (needsConfirm && pin !== confirmPin) {
      setLocalError(l.mismatch);
      return;
    }

    onSubmit(pin);
  };

  const displayError = error || localError;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-8 shadow-lg">
        <div className="mb-6 flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </div>
        </div>

        <h2 className="mb-2 text-center text-lg font-bold text-gray-900 dark:text-gray-100">{l.title}</h2>
        <p className="mb-6 text-center text-sm text-gray-500 dark:text-gray-400">{l.desc}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">PIN</label>
            <input
              ref={inputRef}
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={8}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              className="block w-full rounded-lg border border-gray-300 px-4 py-3 text-center text-2xl font-mono tracking-[0.5em] placeholder:text-gray-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder:text-gray-500"
              placeholder="****"
              autoComplete="off"
              disabled={isLockedOut}
            />
          </div>

          {needsConfirm && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{l.confirm}</label>
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={8}
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
                className="block w-full rounded-lg border border-gray-300 px-4 py-3 text-center text-2xl font-mono tracking-[0.5em] placeholder:text-gray-300 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder:text-gray-500"
                placeholder="****"
                autoComplete="off"
              />
            </div>
          )}

          {isLockedOut && (
            <p className="text-center text-sm text-amber-600 dark:text-amber-400">
              {lang === "hu"
                ? `Várakozás: ${countdown} mp`
                : `Please wait: ${countdown}s`}
            </p>
          )}

          {displayError && (
            <p className="text-center text-sm text-red-600 dark:text-red-400">{displayError}</p>
          )}

          <Button type="submit" className="w-full" loading={loading} disabled={pin.length < 4 || isLockedOut}>
            {l.btn}
          </Button>
        </form>
      </div>
    </div>
  );
}
