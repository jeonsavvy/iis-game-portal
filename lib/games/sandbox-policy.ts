const DEFAULT_SANDBOX_POLICY = "allow-scripts";
const LEGACY_SANDBOX_POLICY = "allow-scripts allow-same-origin allow-forms";

export type ResolveSandboxPolicyArgs = {
  legacySandboxMode: boolean;
  gameId: string;
  gameSlug?: string;
  legacyAllowlist: ReadonlySet<string>;
};

function normalizeAllowlistToken(value: string): string {
  return value.trim().toLowerCase();
}

export function parseLegacySandboxAllowlist(raw: string | undefined): Set<string> {
  if (!raw) {
    return new Set<string>();
  }

  return new Set(
    raw
      .split(",")
      .map(normalizeAllowlistToken)
      .filter(Boolean),
  );
}

export function resolveGameIframeSandboxPolicy({
  legacySandboxMode,
  gameId,
  gameSlug,
  legacyAllowlist,
}: ResolveSandboxPolicyArgs): string {
  if (legacySandboxMode) {
    return LEGACY_SANDBOX_POLICY;
  }

  const normalizedGameId = normalizeAllowlistToken(gameId);
  if (legacyAllowlist.has(normalizedGameId)) {
    return LEGACY_SANDBOX_POLICY;
  }

  const normalizedGameSlug = gameSlug ? normalizeAllowlistToken(gameSlug) : "";
  if (normalizedGameSlug && legacyAllowlist.has(normalizedGameSlug)) {
    return LEGACY_SANDBOX_POLICY;
  }

  return DEFAULT_SANDBOX_POLICY;
}
