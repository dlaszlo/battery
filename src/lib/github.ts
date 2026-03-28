import type { GitHubConfig } from "./types";

interface GitHubFileResponse {
  sha: string;
  content: string;
  encoding: string;
}

const API_BASE = "https://api.github.com";

function sanitizeApiError(status: number): string {
  switch (status) {
    case 401:
    case 403:
      return "TOKEN_EXPIRED";
    case 404:
      return "REPO_NOT_FOUND";
    case 409:
      return "CONFLICT";
    case 422:
      return "VALIDATION_ERROR";
    case 429:
      return "RATE_LIMITED";
    default:
      return `GITHUB_ERROR_${status}`;
  }
}

function utf8ToBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function base64ToUtf8(base64: string): string {
  const cleaned = base64.replace(/[\s\n\r]/g, "");
  const binary = atob(cleaned);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

function headers(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "Content-Type": "application/json",
  };
}

// Generic file operations

export async function fetchFile<T>(
  config: GitHubConfig,
  filePath: string
): Promise<{ data: T; sha: string } | null> {
  const url = `${API_BASE}/repos/${config.owner}/${config.repo}/contents/${filePath}`;

  const response = await fetch(url, { headers: headers(config.token) });

  if (response.status === 404) return null;

  if (response.status === 401 || response.status === 403) {
    throw new Error("TOKEN_EXPIRED");
  }

  if (!response.ok) {
    throw new Error(sanitizeApiError(response.status));
  }

  const file: GitHubFileResponse = await response.json();
  const decoded = base64ToUtf8(file.content);
  const data: T = JSON.parse(decoded);

  return { data, sha: file.sha };
}

export async function saveFile<T>(
  config: GitHubConfig,
  filePath: string,
  data: T,
  sha: string | null,
  message?: string
): Promise<string> {
  const url = `${API_BASE}/repos/${config.owner}/${config.repo}/contents/${filePath}`;
  const content = utf8ToBase64(JSON.stringify(data, null, 2));

  const body: Record<string, string> = {
    message: message || `Update ${filePath} (${new Date().toISOString()})`,
    content,
  };

  if (sha) {
    body.sha = sha;
  }

  const response = await fetch(url, {
    method: "PUT",
    headers: headers(config.token),
    body: JSON.stringify(body),
  });

  if (response.status === 409) {
    throw new Error("CONFLICT");
  }

  if (!response.ok) {
    throw new Error(sanitizeApiError(response.status));
  }

  const result = await response.json();
  return result.content.sha;
}

export async function deleteFile(
  config: GitHubConfig,
  filePath: string,
  sha: string,
  message?: string
): Promise<void> {
  const url = `${API_BASE}/repos/${config.owner}/${config.repo}/contents/${filePath}`;

  const response = await fetch(url, {
    method: "DELETE",
    headers: headers(config.token),
    body: JSON.stringify({
      message: message || `Delete ${filePath}`,
      sha,
    }),
  });

  if (!response.ok && response.status !== 404) {
    throw new Error(sanitizeApiError(response.status));
  }
}

// Legacy compatibility wrappers
import type { BatteryData } from "./types";

export async function fetchData(
  config: GitHubConfig
): Promise<{ data: BatteryData; sha: string } | null> {
  return fetchFile<BatteryData>(config, config.filePath);
}

export async function saveData(
  config: GitHubConfig,
  data: BatteryData,
  sha: string | null,
  message?: string
): Promise<string> {
  return saveFile(config, config.filePath, data, sha, message);
}

export async function validateToken(
  config: GitHubConfig
): Promise<boolean> {
  const url = `${API_BASE}/repos/${config.owner}/${config.repo}`;
  const response = await fetch(url, { headers: headers(config.token) });
  return response.ok;
}
