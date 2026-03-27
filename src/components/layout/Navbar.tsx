"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useBatteryStore } from "@/lib/store";
import { useState } from "react";
import { t } from "@/lib/i18n";
import type { TranslationKey } from "@/lib/i18n";

const navItems: { href: string; labelKey: TranslationKey }[] = [
  { href: "/", labelKey: "nav.home" },
  { href: "/cells", labelKey: "nav.cells" },
  { href: "/add", labelKey: "nav.addCell" },
  { href: "/settings", labelKey: "nav.settings" },
];

export default function Navbar() {
  const pathname = usePathname();
  const syncState = useBatteryStore((s) => s.syncState);
  const lang = useBatteryStore((s) => s.settings.language) ?? "hu";
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-40 border-b border-gray-200 bg-white/80 backdrop-blur-md dark:border-gray-700 dark:bg-gray-800/80">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white text-sm font-bold">
              B
            </div>
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
            <SyncIndicator status={syncState.status} lastSynced={syncState.lastSynced} error={syncState.error} />

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
                  onClick={() => setMobileOpen(false)}
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

function SyncIndicator({ status, lastSynced, error }: { status: string; lastSynced: string | null; error: string | null }) {
  if (status === "syncing") {
    return (
      <div className="flex items-center gap-1.5 text-xs text-blue-600" title="Szinkronizálás folyamatban...">
        <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <span className="hidden sm:inline">Mentés...</span>
      </div>
    );
  }

  if (status === "error" || status === "conflict") {
    return (
      <div className="flex items-center gap-1.5 text-xs text-red-600" title={error || "Szinkronizációs hiba"}>
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="hidden sm:inline">Hiba</span>
      </div>
    );
  }

  if (status === "idle") {
    const title = lastSynced
      ? `Szinkronizálva: ${new Date(lastSynced).toLocaleString("hu-HU")}`
      : "Szinkronizálva";
    return (
      <div className="flex items-center gap-1.5 text-xs text-green-600" title={title}>
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
    );
  }

  return null;
}
