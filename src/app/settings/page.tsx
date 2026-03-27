"use client";

import { useState, useRef } from "react";
import AppShell from "@/components/layout/AppShell";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { useBatteryStore } from "@/lib/store";
import { exportToFile, importFromFile } from "@/lib/sync";
import { TEST_DEVICES } from "@/lib/constants";
import { formatDate } from "@/lib/utils";

export default function SettingsPage() {
  const settings = useBatteryStore((s) => s.settings);
  const updateSettings = useBatteryStore((s) => s.updateSettings);
  const githubConfig = useBatteryStore((s) => s.githubConfig);
  const syncState = useBatteryStore((s) => s.syncState);
  const removeGitHubConfig = useBatteryStore((s) => s.removeGitHubConfig);
  const importData = useBatteryStore((s) => s.importData);
  const exportData = useBatteryStore((s) => s.exportData);
  const cells = useBatteryStore((s) => s.cells);

  const { toast } = useToast();
  const setGitHubConfig = useBatteryStore((s) => s.setGitHubConfig);
  const syncWithGitHub = useBatteryStore((s) => s.syncWithGitHub);
  const forceSyncToGitHub = useBatteryStore((s) => s.forceSyncToGitHub);
  const [showReset, setShowReset] = useState(false);
  const [showDisconnect, setShowDisconnect] = useState(false);
  const [showTokenUpdate, setShowTokenUpdate] = useState(false);
  const [newToken, setNewToken] = useState("");
  const [newDevice, setNewDevice] = useState("");
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    exportToFile(exportData());
    toast("Adatok exportálva");
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
      toast("Adatok importálva");
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Import hiba");
      toast("Import hiba", "error");
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const deviceOptions = TEST_DEVICES.map((d) => ({ value: d, label: d }));

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Beállítások</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Alkalmazás és szinkronizáció beállítások</p>
      </div>

      <div className="space-y-6">
        {/* Téma */}
        <Section title="Megjelenés" description="Világos, sötét, vagy rendszer beállítás szerinti téma">
          <div className="flex gap-2">
            {([
              { value: "light", label: "Világos" },
              { value: "dark", label: "Sötét" },
              { value: "system", label: "Rendszer" },
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
                {opt.label}
              </button>
            ))}
          </div>
        </Section>

        {/* Selejt küszöb */}
        <Section title="Selejt-jelzés" description="Automatikus selejtnek jelölés küszöbértéke">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Küszöbérték (névleges kapacitás %-a)
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
                Ha a mért kapacitás ez alá csökken, a cella automatikusan selejtnek jelölődik.
              </p>
            </div>
          </div>
        </Section>

        {/* Default mérési értékek */}
        <Section title="Alapértelmezett mérési értékek" description="Új mérés hozzáadásakor ezek az értékek lesznek kitöltve">
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Tesztelő eszköz"
              options={deviceOptions}
              value={settings.defaultTestDevice}
              onChange={(e) => updateSettings({ defaultTestDevice: e.target.value })}
            />
            <Input
              label="Merítési áram (mA)"
              type="number"
              value={settings.defaultDischargeCurrent.toString()}
              onChange={(e) => updateSettings({ defaultDischargeCurrent: Number(e.target.value) || 500 })}
            />
          </div>
        </Section>

        {/* Eszköz törzslista */}
        <Section title="Eszközök" description="A cellák hozzárendelhetők ezekhez az eszközökhöz">
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
                      toast(`"${device}" törölve`);
                    }}
                    className="ml-0.5 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    &times;
                  </button>
                </span>
              ))}
              {(settings.devices || []).length === 0 && (
                <p className="text-sm text-gray-400">Nincs eszköz megadva.</p>
              )}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Új eszköz neve..."
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
                  toast(`"${newDevice.trim()}" hozzáadva`);
                }}
              >
                Hozzáadás
              </Button>
            </div>
          </div>
        </Section>

        {/* GitHub szinkron */}
        <Section title="GitHub szinkronizáció" description="Az adataid a GitHub privát repódban tárolódnak">
          {githubConfig ? (
            <div className="space-y-4">
              <div className="rounded-lg bg-gray-50 dark:bg-gray-700/50 p-4">
                <div className="grid gap-2 text-sm sm:grid-cols-2">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Felhasználó: </span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">{githubConfig.owner}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Repó: </span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">{githubConfig.repo}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Állapot: </span>
                    <span className={`font-medium ${
                      syncState.status === "idle" ? "text-green-600" :
                      syncState.status === "syncing" ? "text-blue-600" :
                      "text-red-600"
                    }`}>
                      {syncState.status === "idle" ? "Szinkronizálva" :
                       syncState.status === "syncing" ? "Szinkronizálás..." :
                       "Hiba"}
                    </span>
                  </div>
                  {syncState.lastSynced && (
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Utolsó szinkron: </span>
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
                  <p className="text-sm font-medium text-amber-900 dark:text-amber-200">Új token megadása</p>
                  <Input
                    placeholder="github_pat_..."
                    type="password"
                    value={newToken}
                    onChange={(e) => setNewToken(e.target.value)}
                    hint="Generálj egy új Fine-grained PAT-ot a GitHub Settings-ben."
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      disabled={!newToken.startsWith("github_pat_")}
                      onClick={() => {
                        if (githubConfig) {
                          setGitHubConfig({ ...githubConfig, token: newToken });
                          setShowTokenUpdate(false);
                          setNewToken("");
                          toast("Token frissítve");
                          syncWithGitHub();
                        }
                      }}
                    >
                      Mentés
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => { setShowTokenUpdate(false); setNewToken(""); }}>
                      Mégse
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" size="sm" onClick={() => setShowTokenUpdate(true)}>
                    Token frissítése
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={async () => {
                      await forceSyncToGitHub();
                      toast("GitHub újraszinkronizálva (UTF-8)");
                    }}
                  >
                    Újraszinkronizálás
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => setShowDisconnect(true)}>
                    GitHub leválasztás
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">Nincs csatlakoztatva GitHub fiók.</p>
          )}
        </Section>

        {/* Import / Export */}
        <Section title="Adat export / import" description="Mentsd el vagy töltsd be az adataidat JSON fájlként">
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" onClick={handleExport}>
              Export (JSON letöltés)
            </Button>
            <div>
              <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
                Import (JSON feltöltés)
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
          {importSuccess && <p className="mt-2 text-sm text-green-600">Import sikeres!</p>}
          <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
            Jelenleg {cells.length} cella van a rendszerben.
          </p>
        </Section>

        {/* Danger zone */}
        <Section title="Veszélyzóna" description="Ezek a műveletek nem vonhatók vissza">
          <Button variant="danger" size="sm" onClick={() => setShowReset(true)}>
            Összes adat törlése
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
        title="GitHub leválasztás"
        message="Leválasztod a GitHub fiókot? Az adataid megmaradnak a böngészőben, de nem szinkronizálódnak többé."
        confirmLabel="Leválasztás"
      />

      {/* Reset dialog */}
      <ConfirmDialog
        open={showReset}
        onClose={() => setShowReset(false)}
        onConfirm={() => {
          importData({ version: 1, settings, cells: [] });
          setShowReset(false);
        }}
        title="Összes adat törlése"
        message="Biztosan törlöd az összes cellát és mérést? Ez a művelet nem vonható vissza! Az adatok a GitHub repóból is törlődnek."
        confirmLabel="Minden törlése"
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
