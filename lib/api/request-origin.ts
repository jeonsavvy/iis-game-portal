type OriginValidationResult =
  | { ok: true }
  | {
      ok: false;
      code: "origin_missing" | "origin_invalid" | "origin_null" | "origin_mismatch";
    };

export function validateTrustedWriteOrigin(request: Request): OriginValidationResult {
  const origin = request.headers.get("origin")?.trim();
  if (!origin) {
    return { ok: false, code: "origin_missing" };
  }
  if (origin === "null") {
    return { ok: false, code: "origin_null" };
  }

  let originUrl: URL;
  let requestUrl: URL;
  try {
    originUrl = new URL(origin);
    requestUrl = new URL(request.url);
  } catch {
    return { ok: false, code: "origin_invalid" };
  }

  if (originUrl.protocol !== requestUrl.protocol || originUrl.host !== requestUrl.host) {
    return { ok: false, code: "origin_mismatch" };
  }

  return { ok: true };
}
