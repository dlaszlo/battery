"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      // Determine basePath from the current page
      const basePath = document.querySelector('link[rel="manifest"]')?.getAttribute("href")?.replace("/manifest.json", "") || "";
      navigator.serviceWorker.register(`${basePath}/sw.js`, {
        scope: `${basePath}/`,
      });
    }
  }, []);

  return null;
}
