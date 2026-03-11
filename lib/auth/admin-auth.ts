import { canAccessWorkspace } from "@/lib/auth/rbac";
import type { AppRole } from "@/types/database";

export function normalizeStaffEmail(raw: string | undefined | null): string {
  return String(raw ?? "").trim().toLowerCase();
}

export function canUseStaffLogin(role: AppRole | null): boolean {
  return canAccessWorkspace(role);
}

export function normalizeNextPath(raw: string | undefined | null, fallback = "/admin"): string {
  if (!raw) {
    return fallback;
  }

  const value = raw.trim();
  if (!value.startsWith("/")) {
    return fallback;
  }
  if (value.startsWith("//")) {
    return fallback;
  }

  return value;
}
