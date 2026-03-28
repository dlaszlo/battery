"use client";

import { useState, useRef, lazy, Suspense } from "react";
import AppShell from "@/components/layout/AppShell";
import Button from "@/components/ui/Button";

const QrScanner = lazy(() => import("@/components/ui/QrScanner"));
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { useBatteryStore } from "@/lib/store";
import { exportToFile, importFromFile } from "@/lib/sync";
import { formatDate } from "@/lib/utils";
import { t } from "@/lib/i18n";

export default function SettingsPage() {
  const settings = useBatteryStore((s) => s.settings);
  const updateSettings = useBatteryStore((s) => s.updateSettings);
  const githubConfig = useBatteryStore((s) => s.githubConfig);
  const syncState = useBatteryStore((s) => s.syncState);
  const removeGitHubConfig = useBatteryStore((s) => s.removeGitHubConfig);
  const importData = useBatteryStore((s) => s.importData);
  const exportData = useBatteryStore((s) => s.exportData);
  const cells = useBatteryStore((s) => s.cells);

  const lang = settings.language ?? "hu";
  const { toast } = useToast();
  const setGitHubConfig = useBatteryStore((s) => s.setGitHubConfig);
  const syncWithGitHub = useBatteryStore((s) => s.syncWithGitHub);
  const [showReset, setShowReset] = useState(false);
  const [showDisconnect, setShowDisconnect] = useState(false);
  const [showTokenUpdate, setShowTokenUpdate] = useState(false);
  const [newToken, setNewToken] = useState("");
  const [tokenPin, setTokenPin] = useState("");
  const [tokenPinError, setTokenPinError] = useState<string | null>(null);
  const [showQrScanner, setShowQrScanner] = useState(false);
  const [newDevice, setNewDevice] = useState("");
  const [newTestDevice, setNewTestDevice] = useState("");
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    exportToFile(exportData());
    toast(t("settings.exported", lang));
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError(null);
    setImportSuccess(false);

    try {
      const data = await importFromFile(file);
      importData(data);
      setImportSuccess(true);
      toast(t("settings.imported", lang));
    } catch (err) {
      setImportError(err instanceof Error ? err.message : t("settings.importError", lang));
      toast(t("settings.importError", lang), "error");
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const testDeviceOptions = (settings.testDevices || []).map((d) => ({ value: d, label: d }));

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t("settings.title", lang)}</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t("settings.subtitle", lang)}</p>
      </div>

      <div className="space-y-6">
        {/* Téma */}
        <Section title={t("settings.appearance", lang)} description={t("settings.appearanceDesc", lang)}>
          <div className="flex gap-2">
            {([
              { value: "light", labelKey: "settings.themeLight" as const },
              { value: "dark", labelKey: "settings.themeDark" as const },
              { value: "system", labelKey: "settings.themeSystem" as const },
            ] as const).map((opt) => (
              <button
                key={opt.value}
                onClick={() => updateSettings({ theme: opt.value })}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  (settings.theme ?? "system") === opt.value
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                }`}
              >
                {t(opt.labelKey, lang)}
              </button>
            ))}
          </div>
        </Section>

        {/* Nyelv */}
        <Section title={t("settings.language", lang)} description={t("settings.languageDesc", lang)}>
          <div className="flex gap-2">
            {([
              { value: "hu", label: "Magyar" },
              { value: "en", label: "English" },
            ] as const).map((opt) => (
              <button
                key={opt.value}
                onClick={() => updateSettings({ language: opt.value })}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  (settings.language ?? "hu") === opt.value
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </Section>

        {/* Selejt küszöb */}
        <Section title={t("settings.scrapDetection", lang)} description={t("settings.scrapDetectionDesc", lang)}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("settings.threshold", lang)}
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={20}
                  max={90}
                  step={5}
                  value={settings.scrapThresholdPercent}
                  onChange={(e) => updateSettings({ scrapThresholdPercent: Number(e.target.value) })}
                  className="flex-1"
                />
                <span className="w-12 text-right text-sm font-bold text-gray-900 dark:text-gray-100">
                  {settings.scrapThresholdPercent}%
                </span>
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {t("settings.thresholdHint", lang)}
              </p>
            </div>
          </div>
        </Section>

        {/* Default mérési értékek */}
        <Section title={t("settings.defaultMeasurement", lang)} description={t("settings.defaultMeasurementDesc", lang)}>
          <div className="grid gap-4 sm:grid-cols-3">
            <Select
              label={t("settings.testDevice", lang)}
              options={testDeviceOptions}
              value={settings.defaultTestDevice}
              onChange={(e) => updateSettings({ defaultTestDevice: e.target.value })}
            />
            <Input
              label={t("settings.dischargeCurrent", lang)}
              type="number"
              value={settings.defaultDischargeCurrent.toString()}
              onChange={(e) => updateSettings({ defaultDischargeCurrent: Number(e.target.value) || 500 })}
            />
            <Input
              label={t("settings.chargeCurrent", lang)}
              type="number"
              value={(settings.defaultChargeCurrent ?? 1000).toString()}
              onChange={(e) => updateSettings({ defaultChargeCurrent: Number(e.target.value) || 1000 })}
            />
          </div>
        </Section>

        {/* Tesztelő eszközök */}
        <Section title={t("settings.testDevices", lang)} description={t("settings.testDevicesDesc", lang)}>
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {(settings.testDevices || []).map((device) => (
                <span
                  key={device}
                  className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 dark:bg-gray-700 px-3 py-1 text-sm text-gray-700 dark:text-gray-300"
                >
                  {device}
                  <button
                    type="button"
                    onClick={() => {
                      updateSettings({
                        testDevices: (settings.testDevices || []).filter((d) => d !== device),
                      });
                      toast(`"${device}" ${t("settings.testDeviceRemoved", lang)}`);
                    }}
                    className="ml-0.5 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    &times;
                  </button>
                </span>
              ))}
              {(settings.testDevices || []).length === 0 && (
                <p className="text-sm text-gray-400">{t("settings.noTestDevices", lang)}</p>
              )}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder={t("settings.newTestDevicePlaceholder", lang)}
                value={newTestDevice}
                onChange={(e) => setNewTestDevice(e.target.value)}
              />
              <Button
                variant="secondary"
                size="sm"
                disabled={!newTestDevice.trim() || (settings.testDevices || []).includes(newTestDevice.trim())}
                onClick={() => {
                  updateSettings({
                    testDevices: [...(settings.testDevices || []), newTestDevice.trim()],
                  });
                  setNewTestDevice("");
                  toast(`"${newTestDevice.trim()}" ${t("settings.testDeviceAdded", lang)}`);
                }}
              >
                {t("settings.addTestDevice", lang)}
              </Button>
            </div>
          </div>
        </Section>

        {/* Eszköz törzslista */}
        <Section title={t("settings.devices", lang)} description={t("settings.devicesDesc", lang)}>
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {(settings.devices || []).map((device) => (
                <span
                  key={device}
                  className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 dark:bg-gray-700 px-3 py-1 text-sm text-gray-700 dark:text-gray-300"
                >
                  {device}
                  <button
                    type="button"
                    onClick={() => {
                      updateSettings({
                        devices: (settings.devices || []).filter((d) => d !== device),
                      });
                      toast(`"${device}" ${t("settings.deviceRemoved", lang)}`);
                    }}
                    className="ml-0.5 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    &times;
                  </button>
                </span>
              ))}
              {(settings.devices || []).length === 0 && (
                <p className="text-sm text-gray-400">{t("settings.noDevices", lang)}</p>
              )}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder={t("settings.newDevicePlaceholder", lang)}
                value={newDevice}
                onChange={(e) => setNewDevice(e.target.value)}
              />
              <Button
                variant="secondary"
                size="sm"
                disabled={!newDevice.trim() || (settings.devices || []).includes(newDevice.trim())}
                onClick={() => {
                  updateSettings({
                    devices: [...(settings.devices || []), newDevice.trim()],
                  });
                  setNewDevice("");
                  toast(`"${newDevice.trim()}" ${t("settings.deviceAdded", lang)}`);
                }}
              >
                {t("settings.addDevice", lang)}
              </Button>
            </div>
          </div>
        </Section>

        {/* GitHub szinkron */}
        <Section title={t("settings.github", lang)} description={t("settings.githubDesc", lang)}>
          {githubConfig ? (
            <div className="space-y-4">
              <div className="rounded-lg bg-gray-50 dark:bg-gray-700/50 p-4">
                <div className="grid gap-2 text-sm sm:grid-cols-2">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">{t("settings.githubUser", lang)}: </span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">{githubConfig.owner}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">{t("settings.githubRepo", lang)}: </span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">{githubConfig.repo}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">{t("settings.githubStatus", lang)}: </span>
                    <span className={`font-medium ${
                      syncState.status === "idle" ? "text-green-600" :
                      syncState.status === "syncing" ? "text-blue-600" :
                      "text-red-600"
                    }`}>
                      {syncState.status === "idle" ? t("settings.githubSynced", lang) :
                       syncState.status === "syncing" ? t("settings.githubSyncing", lang) :
                       t("settings.githubError", lang)}
                    </span>
                  </div>
                  {syncState.lastSynced && (
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">{t("settings.githubLastSync", lang)}: </span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {formatDate(syncState.lastSynced)}
                      </span>
                    </div>
                  )}
                </div>
                {syncState.error && (
                  <p className="mt-2 text-sm text-red-600">{syncState.error}</p>
                )}
              </div>
              {showTokenUpdate ? (
                <div className="space-y-3 rounded-lg border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/30 p-4">
                  <p className="text-sm font-medium text-amber-900 dark:text-amber-200">{t("settings.tokenNewTitle", lang)}</p>
                  {showQrScanner ? (
                    <Suspense fallback={<div className="py-4 text-center text-sm text-gray-400">Loading...</div>}>
                      <QrScanner
                        onScan={(value) => {
                          setNewToken(value);
                          setShowQrScanner(false);
                        }}
                        onClose={() => setShowQrScanner(false)}
                      />
                    </Suspense>
                  ) : (
                    <>
                      <Input
                        placeholder="github_pat_..."
                        type="password"
                        value={newToken}
                        onChange={(e) => setNewToken(e.target.value)}
                        hint={t("settings.tokenHint", lang)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowQrScanner(true)}
                        className="flex items-center gap-2 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75z" />
                        </svg>
                        {t("onboarding.token.scanQr", lang)}
                      </button>
                    </>
                  )}
                  <div>
                    <Input
                      label={lang === "hu" ? "Jelenlegi PIN" : "Current PIN"}
                      type="password"
                      inputMode="numeric"
                      maxLength={8}
                      placeholder="****"
                      value={tokenPin}
                      onChange={(e) => { setTokenPin(e.target.value.replace(/\D/g, "")); setTokenPinError(null); }}
                      error={tokenPinError || undefined}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      disabled={!newToken.startsWith("github_pat_") || tokenPin.length < 4}
                      onClick={async () => {
                        if (githubConfig) {
                          try {
                            await setGitHubConfig({ ...githubConfig, token: newToken }, tokenPin);
                            setShowTokenUpdate(false);
                            setShowQrScanner(false);
                            setNewToken("");
                            setTokenPin("");
                            setTokenPinError(null);
                            toast(t("settings.tokenUpdated", lang));
                            syncWithGitHub();
                          } catch {
                            setTokenPinError(lang === "hu" ? "Hibás PIN kód" : "Wrong PIN");
                          }
                        }
                      }}
                    >
                      {t("settings.tokenSave", lang)}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => { setShowTokenUpdate(false); setNewToken(""); setTokenPin(""); setTokenPinError(null); }}>
                      {t("form.cancel", lang)}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" size="sm" onClick={() => setShowTokenUpdate(true)}>
                    {t("settings.tokenRefresh", lang)}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={async () => {
                      await syncWithGitHub();
                      toast(t("settings.resynced", lang));
                    }}
                  >
                    {t("settings.resync", lang)}
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => setShowDisconnect(true)}>
                    {t("settings.disconnect", lang)}
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">{t("settings.githubNotConnected", lang)}</p>
          )}
        </Section>

        {/* Import / Export */}
        <Section title={t("settings.export", lang)} description={t("settings.exportDesc", lang)}>
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" onClick={handleExport}>
              {t("settings.exportBtn", lang)}
            </Button>
            <div>
              <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
                {t("settings.importBtn", lang)}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImport}
                className="hidden"
              />
            </div>
          </div>
          {importError && <p className="mt-2 text-sm text-red-600">{importError}</p>}
          {importSuccess && <p className="mt-2 text-sm text-green-600">{t("settings.importSuccess", lang)}</p>}
          <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
            {t("settings.cellCount", lang, { count: cells.length })}
          </p>
        </Section>

        {/* Danger zone */}
        <Section title={t("settings.dangerZone", lang)} description={t("settings.dangerZoneDesc", lang)}>
          <Button variant="danger" size="sm" onClick={() => setShowReset(true)}>
            {t("settings.deleteAll", lang)}
          </Button>
        </Section>
      </div>

      {/* Disconnect dialog */}
      <ConfirmDialog
        open={showDisconnect}
        onClose={() => setShowDisconnect(false)}
        onConfirm={() => {
          removeGitHubConfig();
          setShowDisconnect(false);
        }}
        title={t("settings.disconnectTitle", lang)}
        message={t("settings.disconnectMessage", lang)}
        confirmLabel={t("settings.disconnectConfirm", lang)}
      />

      {/* Reset dialog */}
      <ConfirmDialog
        open={showReset}
        onClose={() => setShowReset(false)}
        onConfirm={() => {
          importData({ version: 1, settings, cells: [] });
          setShowReset(false);
        }}
        title={t("settings.deleteAllTitle", lang)}
        message={t("settings.deleteAllMessage", lang)}
        confirmLabel={t("settings.deleteAllConfirm", lang)}
      />
    </AppShell>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
      <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">{description}</p>
      {children}
    </div>
  );
}
