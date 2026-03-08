export function parseAllowedStaffEmails(raw: string | undefined | null): string[] {
  const values = (raw ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  return Array.from(new Set(values));
}

export function parseAllowedAdminEmails(raw: string | undefined | null): string[] {
  return parseAllowedStaffEmails(raw);
}

export function isAllowedStaffEmail(email: string | undefined | null, allowedEmails: string[]): boolean {
  if (!email) {
    return false;
  }

  return allowedEmails.includes(email.trim().toLowerCase());
}

export function isAllowedAdminEmail(email: string | undefined | null, allowedEmails: string[]): boolean {
  return isAllowedStaffEmail(email, allowedEmails);
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
