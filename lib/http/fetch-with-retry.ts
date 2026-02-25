const ALWAYS_RETRYABLE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function hasIdempotencyKey(headers: HeadersInit | undefined): boolean {
  if (!headers) return false;

  const resolved = new Headers(headers);
  const key = resolved.get("Idempotency-Key");
  return Boolean(key && key.trim());
}

function resolveRetryAttempts(init: RequestInit, retries: number): number {
  const method = (init.method ?? "GET").trim().toUpperCase();
  if (ALWAYS_RETRYABLE_METHODS.has(method)) {
    return retries;
  }
  if (method === "POST" && hasIdempotencyKey(init.headers)) {
    return retries;
  }
  return 1;
}

export async function fetchWithRetry(
  input: RequestInfo | URL,
  init: RequestInit,
  options: { timeoutMs?: number; retries?: number } = {},
): Promise<Response> {
  const timeoutMs = options.timeoutMs ?? 15000;
  const retries = options.retries ?? 3;
  const maxAttempts = resolveRetryAttempts(init, retries);

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(input, {
        ...init,
        signal: controller.signal,
      });

      if (!response.ok && response.status >= 500 && attempt < maxAttempts) {
        continue;
      }

      return response;
    } catch (error) {
      lastError = error;
      if (attempt === maxAttempts) {
        throw error;
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Unknown request failure");
}
