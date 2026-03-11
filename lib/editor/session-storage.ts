const LAST_SESSION_STORAGE_KEY_PREFIX = "iis-workspace-last-session-v3";
export const LEGACY_LAST_SESSION_STORAGE_KEY = "iis-workspace-last-session-v2";

export function normalizeSessionStorageAccountKey(email: string | null | undefined): string {
  const normalized = String(email ?? "").trim().toLowerCase();
  return normalized || "guest";
}

export function buildLastSessionStorageKey(email: string | null | undefined): string {
  return `${LAST_SESSION_STORAGE_KEY_PREFIX}:${normalizeSessionStorageAccountKey(email)}`;
}
