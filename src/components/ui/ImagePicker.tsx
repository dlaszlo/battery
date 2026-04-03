"use client";

import { useState, useRef, useEffect } from "react";
import { useBatteryStore } from "@/lib/store";
import { t } from "@/lib/i18n";
import { loadImage, compressToWebp, uploadImage, downloadImageFromUrl } from "@/lib/image-utils";
import type { Language } from "@/lib/types";

interface ImagePickerProps {
  currentFileName?: string;
  onImageChange: (fileName: string | undefined) => void;
  lang: Language;
}

export default function ImagePicker({ currentFileName, onImageChange, lang }: ImagePickerProps) {
  const githubConfig = useBatteryStore((s) => s.githubConfig);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Load existing image
  useEffect(() => {
    if (!currentFileName || !githubConfig) {
      setPreviewUrl(null);
      return;
    }
    let cancelled = false;
    loadImage(githubConfig, currentFileName).then((url) => {
      if (!cancelled && url) setPreviewUrl(url);
    });
    return () => { cancelled = true; };
  }, [currentFileName, githubConfig]);

  if (!githubConfig) return null;

  async function handleFile(file: File) {
    setError(null);
    setLoading(true);
    try {
      const base64 = await compressToWebp(file);
      const fileName = await uploadImage(githubConfig!, base64);
      setPreviewUrl(`data:image/webp;base64,${base64}`);
      onImageChange(fileName);
    } catch {
      setError(t("image.error", lang));
    } finally {
      setLoading(false);
    }
  }

  async function handleUrlDownload() {
    if (!urlInput.trim()) return;
    setError(null);
    setLoading(true);
    try {
      const blob = await downloadImageFromUrl(urlInput.trim());
      const base64 = await compressToWebp(blob);
      const fileName = await uploadImage(githubConfig!, base64);
      setPreviewUrl(`data:image/webp;base64,${base64}`);
      onImageChange(fileName);
      setUrlInput("");
    } catch (err) {
      if (err instanceof Error && err.message === "IMAGE_CORS_BLOCKED") {
        setError(t("image.corsBlocked", lang));
      } else {
        setError(t("image.error", lang));
      }
    } finally {
      setLoading(false);
    }
  }

  function handleRemove() {
    setPreviewUrl(null);
    setError(null);
    onImageChange(undefined);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div className="space-y-3">
      <span className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {t("image.title", lang)}
      </span>

      {/* Preview */}
      {previewUrl && (
        <div className="relative inline-block">
          <img
            src={previewUrl}
            alt=""
            className="h-32 w-32 rounded-xl object-cover border border-gray-200 dark:border-gray-600"
          />
          <button
            type="button"
            onClick={handleRemove}
            className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white text-xs hover:bg-red-600 transition-colors cursor-pointer"
            title={t("image.remove", lang)}
          >
            &times;
          </button>
        </div>
      )}

      {/* Upload / URL input */}
      {!previewUrl && !loading && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {/* Native label wraps the file input — works reliably on iOS Safari */}
          <label className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 transition-colors cursor-pointer">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
            </svg>
            {t("image.upload", lang)}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
          </label>

          <span className="text-xs text-gray-400 dark:text-gray-500">{t("image.or", lang)}</span>

          <div className="flex gap-1 flex-1">
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder={t("image.urlPlaceholder", lang)}
              className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 min-w-0"
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleUrlDownload())}
            />
            <button
              type="button"
              onClick={handleUrlDownload}
              disabled={!urlInput.trim()}
              className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40 transition-colors cursor-pointer"
            >
              {t("image.download", lang)}
            </button>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          {t("image.uploading", lang)}
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
