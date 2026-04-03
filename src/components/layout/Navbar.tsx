"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useBatteryStore } from "@/lib/store";
import { useState, useEffect } from "react";
import { t } from "@/lib/i18n";
import type { TranslationKey } from "@/lib/i18n";
import type { SyncState, Language } from "@/lib/types";

const navItems: { href: string; labelKey: TranslationKey }[] = [
  { href: "/", labelKey: "nav.home" },
  { href: "/cells", labelKey: "nav.cells" },
  { href: "/add", labelKey: "nav.addCell" },
  { href: "/templates", labelKey: "nav.templates" },
  { href: "/settings", labelKey: "nav.settings" },
  { href: "/help", labelKey: "nav.help" },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const syncState = useBatteryStore((s) => s.syncState);
  const githubConfig = useBatteryStore((s) => s.githubConfig);
  const pushToGitHub = useBatteryStore((s) => s.pushToGitHub);
  const syncWithGitHub = useBatteryStore((s) => s.syncWithGitHub);
  const lang = useBatteryStore((s) => s.settings.language) ?? "hu";
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-40 border-b border-gray-200 bg-white/80 backdrop-blur-md dark:border-gray-700 dark:bg-gray-800/80">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <svg className="h-8 w-8" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
              {/* Battery outline */}
              <rect x="106" y="80" width="300" height="400" rx="32" fill="none" stroke="white" strokeWidth="28"/>
              {/* Battery terminal */}
              <rect x="196" y="48" width="120" height="44" rx="12" fill="white"/>
              {/* 5 charge bars — equal size, 40% default, loops 0→100% on hover */}
              <rect x="150" y="390" width="212" height="50" rx="6" fill="white" className="charge-bar charge-bar-1"/>
              <rect x="150" y="328" width="212" height="50" rx="6" fill="white" className="charge-bar charge-bar-2"/>
              <rect x="150" y="266" width="212" height="50" rx="6" fill="white" className="charge-bar charge-bar-3"/>
              <rect x="150" y="204" width="212" height="50" rx="6" fill="white" className="charge-bar charge-bar-4"/>
              <rect x="150" y="142" width="212" height="50" rx="6" fill="white" className="charge-bar charge-bar-5"/>
            </svg>
            <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
              Battery Tracker
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={(e) => {
                    if (pathname === item.href) {
                      e.preventDefault();
                      router.replace(item.href);
                    }
                  }}
                  className={`
                    rounded-lg px-3 py-2 text-sm font-medium transition-colors
                    ${active
                      ? "bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-gray-100"
                    }
                  `}
                >
                  {t(item.labelKey, lang)}
                </Link>
              );
            })}
          </div>

          {/* Sync status + mobile toggle */}
          <div className="flex items-center gap-3">
            {githubConfig && (
              <SyncIndicator
                syncState={syncState}
                lang={lang}
                onRetry={pushToGitHub}
                onSync={syncWithGitHub}
                onPush={pushToGitHub}
              />
            )}

            <button
              className="md:hidden rounded-lg p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                {mobileOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        {mobileOpen && (
          <div className="border-t border-gray-200 py-2 md:hidden dark:border-gray-700">
            {navItems.map((item) => {
              const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={(e) => {
                    setMobileOpen(false);
                    if (pathname === item.href) {
                      e.preventDefault();
                      router.replace(item.href);
                    }
                  }}
                  className={`
                    block rounded-lg px-3 py-2 text-sm font-medium transition-colors
                    ${active
                      ? "bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-gray-100"
                    }
                  `}
                >
                  {t(item.labelKey, lang)}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </nav>
  );
}

function useRelativeTime(iso: string | null, lang: Language) {
  const [text, setText] = useState("");

  useEffect(() => {
    if (!iso) { setText(""); return; }

    function update() {
      const diff = Math.floor((Date.now() - new Date(iso!).getTime()) / 1000);
      if (diff < 60) { setText(t("sync.timeAgo.justNow", lang)); return; }
      const mins = Math.floor(diff / 60);
      if (mins < 60) { setText(t("sync.timeAgo.minutesAgo", lang, { n: mins })); return; }
      const hours = Math.floor(mins / 60);
      setText(t("sync.timeAgo.hoursAgo", lang, { n: hours }));
    }

    update();
    const interval = setInterval(update, 30_000);
    return () => clearInterval(interval);
  }, [iso, lang]);

  return text;
}

interface SyncIndicatorProps {
  syncState: SyncState;
  lang: Language;
  onRetry: () => void;
  onSync: () => void;
  onPush: () => void;
}

function SyncIndicator({ syncState, lang, onRetry, onSync, onPush }: SyncIndicatorProps) {
  const { status, lastSynced, error, pendingChanges, retryCount, remoteChanged } = syncState;
  const timeAgo = useRelativeTime(lastSynced, lang);

  // Remote changes available (clickable → sync)
  if (remoteChanged && status === "idle" && !pendingChanges) {
    return (
      <button
        onClick={onSync}
        className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 cursor-pointer transition-colors"
        title={t("sync.remoteChanged", lang)}
      >
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-blue-500" />
        </span>
        <span className="hidden md:inline">{t("sync.remoteChanged", lang)}</span>
      </button>
    );
  }

  // Pending changes — clickable save button
  if (pendingChanges && status !== "syncing" && status !== "error" && status !== "conflict") {
    return (
      <button
        onClick={onPush}
        className="flex items-center gap-1.5 rounded-lg bg-amber-100 px-2.5 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-200 dark:bg-amber-900/50 dark:text-amber-300 dark:hover:bg-amber-900/70 cursor-pointer transition-colors"
        title={t("sync.clickSave", lang)}
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
        </svg>
        <span className="hidden md:inline">{t("sync.save", lang)}</span>
      </button>
    );
  }

  // Syncing
  if (status === "syncing") {
    return (
      <div className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400">
        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <span className="hidden md:inline">
          {retryCount > 0 ? t("sync.retrying", lang) : t("sync.syncing", lang)}
        </span>
      </div>
    );
  }

  // Error (clickable → retry)
  if (status === "error") {
    return (
      <button
        onClick={onRetry}
        className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 cursor-pointer transition-colors"
        title={error ? `${error} — ${t("sync.clickRetry", lang)}` : t("sync.clickRetry", lang)}
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="hidden md:inline">{t("sync.error", lang)}</span>
      </button>
    );
  }

  // Conflict (clickable → force sync)
  if (status === "conflict") {
    return (
      <button
        onClick={onSync}
        className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 cursor-pointer transition-colors"
        title={error ? `${error} — ${t("sync.clickOverwrite", lang)}` : t("sync.clickOverwrite", lang)}
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
        <span className="hidden md:inline">{t("sync.conflict", lang)}</span>
      </button>
    );
  }

  // Idle — synced
  return (
    <div
      className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400"
      title={lastSynced ? `${t("sync.saved", lang)}: ${new Date(lastSynced).toLocaleString(lang === "hu" ? "hu-HU" : "en-US")}` : t("sync.saved", lang)}
    >
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
      <span className="hidden md:inline">
        {t("sync.saved", lang)}{timeAgo ? ` ${timeAgo}` : ""}
      </span>
    </div>
  );
}
