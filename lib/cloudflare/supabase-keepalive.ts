export type SupabaseKeepaliveEnv = {
  NEXT_PUBLIC_SUPABASE_URL?: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
  SUPABASE_KEEPALIVE_PATH?: string;
  NEXTJS_ENV?: string;
};

type SupabaseKeepaliveBuildEnv = Partial<Record<"production" | "development" | "test", SupabaseKeepaliveEnv>>;

const DEFAULT_KEEPALIVE_PATH = "/rest/v1/games_metadata?status=eq.active&select=id&limit=1";
const DEFAULT_TIMEOUT_MS = 10_000;

function readEnv(value: string | undefined): string {
  return value?.trim() ?? "";
}

function trimBodySnippet(value: string, maxLength = 240): string {
  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

export function resolveSupabaseKeepaliveEnv(
  env: SupabaseKeepaliveEnv,
  buildEnv?: SupabaseKeepaliveBuildEnv,
): SupabaseKeepaliveEnv {
  const mode = readEnv(env.NEXTJS_ENV) || "production";
  const fallback = buildEnv?.[mode as keyof SupabaseKeepaliveBuildEnv] ?? buildEnv?.production ?? {};

  return {
    NEXT_PUBLIC_SUPABASE_URL: readEnv(env.NEXT_PUBLIC_SUPABASE_URL) || readEnv(fallback.NEXT_PUBLIC_SUPABASE_URL) || undefined,
    NEXT_PUBLIC_SUPABASE_ANON_KEY:
      readEnv(env.NEXT_PUBLIC_SUPABASE_ANON_KEY) || readEnv(fallback.NEXT_PUBLIC_SUPABASE_ANON_KEY) || undefined,
    SUPABASE_KEEPALIVE_PATH: readEnv(env.SUPABASE_KEEPALIVE_PATH) || readEnv(fallback.SUPABASE_KEEPALIVE_PATH) || undefined,
    NEXTJS_ENV: mode,
  };
}

export function resolveSupabaseKeepaliveUrl(env: SupabaseKeepaliveEnv): string {
  const supabaseUrl = readEnv(env.NEXT_PUBLIC_SUPABASE_URL);
  if (!supabaseUrl) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is missing");
  }

  const path = readEnv(env.SUPABASE_KEEPALIVE_PATH) || DEFAULT_KEEPALIVE_PATH;
  return new URL(path, supabaseUrl).toString();
}

export function createSupabaseKeepaliveHeaders(env: SupabaseKeepaliveEnv): Headers {
  const anonKey = readEnv(env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  if (!anonKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is missing");
  }

  return new Headers({
    apikey: anonKey,
    Authorization: `Bearer ${anonKey}`,
    Accept: "application/json",
    "Cache-Control": "no-store, max-age=0",
  });
}

export async function runSupabaseKeepalive(
  env: SupabaseKeepaliveEnv,
  options?: { timeoutMs?: number; fetchImpl?: typeof fetch; cacheBuster?: string | number },
): Promise<{ status: number; url: string }> {
  const url = resolveSupabaseKeepaliveUrl(env);
  const headers = createSupabaseKeepaliveHeaders(env);
  if (options?.cacheBuster !== undefined && options?.cacheBuster !== null && String(options.cacheBuster).trim()) {
    headers.set("X-IIS-Keepalive-At", String(options.cacheBuster));
  }
  headers.set("User-Agent", "iis-game-portal-supabase-keepalive/1.1");
  const fetchImpl = options?.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const timeout = globalThis.setTimeout(() => controller.abort("supabase_keepalive_timeout"), timeoutMs);

  try {
    const response = await fetchImpl(url, {
      method: "GET",
      headers,
      signal: controller.signal,
    });

    if (!response.ok) {
      const bodyText = trimBodySnippet(await response.text().catch(() => ""));
      throw new Error(
        `Supabase keepalive failed (${response.status}${response.statusText ? ` ${response.statusText}` : ""})${bodyText ? `: ${bodyText}` : ""}`,
      );
    }

    return {
      status: response.status,
      url,
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Supabase keepalive timed out after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    globalThis.clearTimeout(timeout);
  }
}
