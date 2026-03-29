import { IMAGES_FOLDER, IMAGE_MAX_DIMENSION, IMAGE_MAX_BYTES } from "./constants";
import { saveRawFile, fetchRawFile, fetchFileSha } from "./github";
import type { GitHubConfig } from "./types";

// --- In-memory cache: fileName → data URL ---
const imageCache = new Map<string, string>();

export function getCachedImageUrl(fileName: string): string | undefined {
  return imageCache.get(fileName);
}

export function clearImageCache(): void {
  imageCache.clear();
}

// --- Load image from GitHub (with cache) ---

export async function loadImage(
  config: GitHubConfig,
  fileName: string
): Promise<string | null> {
  const cached = imageCache.get(fileName);
  if (cached) return cached;

  const result = await fetchRawFile(config, `${IMAGES_FOLDER}/${fileName}`);
  if (!result) return null;

  const dataUrl = `data:image/webp;base64,${result.base64}`;
  imageCache.set(fileName, dataUrl);
  return dataUrl;
}

// --- Compress image to webp, returns base64 (no prefix) ---

export async function compressToWebp(source: Blob): Promise<string> {
  const img = await blobToImage(source);
  const canvas = document.createElement("canvas");

  let { width, height } = img;
  if (width > IMAGE_MAX_DIMENSION || height > IMAGE_MAX_DIMENSION) {
    const ratio = Math.min(IMAGE_MAX_DIMENSION / width, IMAGE_MAX_DIMENSION / height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }

  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, width, height);

  // Iteratively reduce quality until under size limit
  for (let quality = 0.82; quality >= 0.1; quality -= 0.12) {
    const blob = await canvasToBlob(canvas, "image/webp", quality);
    if (blob.size <= IMAGE_MAX_BYTES || quality <= 0.15) {
      return blobToBase64(blob);
    }
  }

  // Fallback: smallest quality
  const blob = await canvasToBlob(canvas, "image/webp", 0.1);
  return blobToBase64(blob);
}

// --- Download image from URL (with CORS fallback) ---

export async function downloadImageFromUrl(url: string): Promise<Blob> {
  // Try 1: direct fetch
  try {
    const res = await fetch(url, { mode: "cors" });
    if (res.ok) {
      const blob = await res.blob();
      if (blob.type.startsWith("image/")) return blob;
    }
  } catch {
    // CORS blocked, try fallback
  }

  // Try 2: img element with crossOrigin → canvas
  return new Promise<Blob>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0);
        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error("IMAGE_CORS_BLOCKED"))),
          "image/png"
        );
      } catch {
        reject(new Error("IMAGE_CORS_BLOCKED"));
      }
    };

    img.onerror = () => reject(new Error("IMAGE_CORS_BLOCKED"));
    img.src = url;
  });
}

// --- SHA-256 hash for deduplication ---

export async function hashBase64(base64: string): Promise<string> {
  const binary = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const hashBuffer = await crypto.subtle.digest("SHA-256", binary);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// --- Upload image with deduplication ---

export async function uploadImage(
  config: GitHubConfig,
  base64Content: string
): Promise<string> {
  const hash = await hashBase64(base64Content);
  const fileName = `${hash}.webp`;
  const filePath = `${IMAGES_FOLDER}/${fileName}`;

  // Check if file already exists
  const existingSha = await fetchFileSha(config, filePath);
  if (existingSha) {
    // Already uploaded — reuse
    const dataUrl = `data:image/webp;base64,${base64Content}`;
    imageCache.set(fileName, dataUrl);
    return fileName;
  }

  // Upload new file
  await saveRawFile(config, filePath, base64Content, null, `Upload image ${fileName}`);
  const dataUrl = `data:image/webp;base64,${base64Content}`;
  imageCache.set(fileName, dataUrl);
  return fileName;
}

// --- Delete image (only if no other entity references it) ---

export async function deleteImageIfUnused(
  config: GitHubConfig,
  fileName: string,
  allFileNames: string[]
): Promise<void> {
  const refCount = allFileNames.filter((f) => f === fileName).length;
  if (refCount > 0) return; // still referenced

  const result = await fetchRawFile(config, `${IMAGES_FOLDER}/${fileName}`);
  if (!result) return;

  const url = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${IMAGES_FOLDER}/${fileName}`;
  await fetch(url, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: `Delete unused image ${fileName}`,
      sha: result.sha,
    }),
  });

  imageCache.delete(fileName);
}

// --- Helpers ---

function blobToImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      resolve(img);
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(blob);
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Canvas export failed"))),
      type,
      quality
    );
  });
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // Strip data URL prefix
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
