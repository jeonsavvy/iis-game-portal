export function isSupabaseAuthCookieName(name: string): boolean {
  const normalized = String(name ?? "").trim();
  if (!normalized) return false;

  return (
    /^sb-[a-z0-9-]+-auth-token(?:\.\d+)?$/i.test(normalized) ||
    normalized.includes("supabase-auth-token") ||
    normalized.includes("sb-access-token")
  );
}
