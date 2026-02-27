const ALWAYS_RETRYABLE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const RETRYABLE_STATUS_CODES = new Set([429]);

function normalizeAttemptCount(retries: number): number {
  if (!Number.isFinite(retries)) {
    return 1;
  }
  return Math.max(1, Math.trunc(retries));
}

function hasIdempotencyKey(headers: HeadersInit | undefined): boolean {
  if (!headers) return false;

  const resolved = new Headers(headers);
  const key = resolved.get("Idempotency-Key");
  return Boolean(key && key.trim());
}

function resolveRetryAttempts(init: RequestInit, retries: number): number {
  const normalizedRetries = normalizeAttemptCount(retries);
  const method = (init.method ?? "GET").trim().toUpperCase();
  if (ALWAYS_RETRYABLE_METHODS.has(method)) {
    return normalizedRetries;
  }
  if (method === "POST" && hasIdempotencyKey(init.headers)) {
    return normalizedRetries;
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

      const shouldRetryByStatus =
        !response.ok &&
        (response.status >= 500 || RETRYABLE_STATUS_CODES.has(response.status)) &&
        attempt < maxAttempts;

      if (shouldRetryByStatus) {
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
