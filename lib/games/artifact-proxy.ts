import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

const JS_CONTENT_TYPE = "application/javascript; charset=utf-8";
const ARTIFACT_FETCH_TIMEOUT_MS = 15_000;
const ARTIFACT_FETCH_RETRIES = 2;
const ARTIFACT_FETCH_RETRY_DELAY_MS = 200;
const ARTIFACT_FETCH_MAX_REDIRECT_HOPS = 3;

export type ArtifactTarget = {
  game: Database["public"]["Tables"]["games_metadata"]["Row"];
  upstreamUrl: string;
  contentTypeHint: string;
};

function artifactProxyError(status: number, error: string, code: string = error): NextResponse {
  return NextResponse.json(
    {
      error,
      detail: error,
      code,
    },
    { status },
  );
}

function normalizeEntryPath(pathname: string): string {
  if (pathname.endsWith(".html")) {
    return pathname;
  }
  if (pathname.endsWith("/")) {
    return `${pathname}index.html`;
  }
  return `${pathname}/index.html`;
}

function sanitizeAssetPath(assetPath: string): string | null {
  const normalized = assetPath.replace(/^\/+/, "").replace(/\\/g, "/");
  if (!normalized) {
    return "index.html";
  }
  if (normalized.includes("..") || normalized.includes("//")) {
    return null;
  }
  return normalized;
}

function isLocalOrPrivateHost(hostname: string): boolean {
  const normalized = hostname.trim().toLowerCase().replace(/\.$/, "");
  if (!normalized) return true;
  if (normalized === "localhost" || normalized.endsWith(".localhost")) return true;
  if (normalized === "0.0.0.0" || normalized === "::1") return true;
  if (normalized.includes(":")) {
    // Block literal IPv6 hosts to avoid local-link/private range bypasses.
    return true;
  }

  const ipv4Match = normalized.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!ipv4Match) return false;

  const octets = ipv4Match.slice(1).map((part) => Number(part));
  if (octets.some((part) => Number.isNaN(part) || part < 0 || part > 255)) {
    return false;
  }

  const [a, b] = octets;
  if (a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a === 0) return true;
  return false;
}

function isAllowedArtifactSource(sourceUrl: URL): boolean {
  if (sourceUrl.protocol === "https:") {
    return !isLocalOrPrivateHost(sourceUrl.hostname);
  }
  if (sourceUrl.protocol === "http:" && process.env.NODE_ENV !== "production") {
    return !isLocalOrPrivateHost(sourceUrl.hostname);
  }
  return false;
}

function isRedirectStatus(status: number): boolean {
  return status >= 300 && status < 400;
}

function guessContentType(path: string): string {
  const lowered = path.toLowerCase();
  if (lowered.endsWith(".html")) return "text/html; charset=utf-8";
  if (lowered.endsWith(".css")) return "text/css; charset=utf-8";
  if (lowered.endsWith(".js")) return JS_CONTENT_TYPE;
  if (lowered.endsWith(".json")) return "application/json; charset=utf-8";
  return "application/octet-stream";
}

function resolveProxyContentType(upstreamContentType: string, hint: string): string {
  const normalized = upstreamContentType.toLowerCase();
  const isGeneric = normalized.startsWith("text/plain") || normalized.startsWith("application/octet-stream");
  if (!upstreamContentType || isGeneric) {
    return hint;
  }
  return upstreamContentType;
}

export async function resolveArtifactTarget(gameId: string, requestedAssetPath: string): Promise<ArtifactTarget | NextResponse> {
  const supabase = await createSupabaseServerClient();
  const { data: game, error } = await supabase.from("games_metadata").select("*").eq("id", gameId).eq("status", "active").single();
  if (error || !game) {
    return artifactProxyError(404, "Game not found", "game_not_found");
  }

  const typedGame: Database["public"]["Tables"]["games_metadata"]["Row"] = game;
  const safeAssetPath = sanitizeAssetPath(requestedAssetPath);
  if (!safeAssetPath) {
    return artifactProxyError(400, "Invalid artifact path", "invalid_artifact_path");
  }

  let sourceUrl: URL;
  try {
    sourceUrl = new URL(typedGame.url);
  } catch {
    return artifactProxyError(500, "Invalid game URL", "invalid_game_url");
  }

  if (!isAllowedArtifactSource(sourceUrl)) {
    return artifactProxyError(403, "Artifact source is not allowed", "artifact_source_not_allowed");
  }

  const entryPath = normalizeEntryPath(sourceUrl.pathname);
  const baseDir = entryPath.slice(0, entryPath.lastIndexOf("/") + 1);
  const assetPath = safeAssetPath === "index.html" ? entryPath : `${baseDir}${safeAssetPath}`;

  const upstreamUrl = new URL(sourceUrl.toString());
  upstreamUrl.pathname = assetPath;
  if (safeAssetPath !== "index.html") {
    upstreamUrl.search = "";
  }

  return {
    game: typedGame,
    upstreamUrl: upstreamUrl.toString(),
    contentTypeHint: guessContentType(safeAssetPath),
  };
}

export async function proxyArtifactResponse(target: ArtifactTarget): Promise<NextResponse> {
  let upstream: Response | null = null;

  for (let attempt = 1; attempt <= ARTIFACT_FETCH_RETRIES; attempt += 1) {
    try {
      let requestUrl = target.upstreamUrl;
      let redirectHop = 0;

      while (redirectHop <= ARTIFACT_FETCH_MAX_REDIRECT_HOPS) {
        const controller = new AbortController();
        const timeoutHandle = setTimeout(() => controller.abort(), ARTIFACT_FETCH_TIMEOUT_MS);
        let response: Response;
        try {
          response = await fetch(requestUrl, {
            cache: "no-store",
            signal: controller.signal,
            redirect: "manual",
          });
        } finally {
          clearTimeout(timeoutHandle);
        }

        if (!isRedirectStatus(response.status)) {
          upstream = response;
          break;
        }

        const redirectLocation = response.headers.get("location")?.trim();
        if (!redirectLocation) {
          return artifactProxyError(502, "artifact_redirect_missing_location", "artifact_redirect_missing_location");
        }

        let redirectedUrl: URL;
        try {
          redirectedUrl = new URL(redirectLocation, requestUrl);
        } catch {
          return artifactProxyError(502, "artifact_redirect_invalid_location", "artifact_redirect_invalid_location");
        }

        if (!isAllowedArtifactSource(redirectedUrl)) {
          return artifactProxyError(502, "artifact_redirect_not_allowed", "artifact_redirect_not_allowed");
        }

        requestUrl = redirectedUrl.toString();
        redirectHop += 1;
      }

      if (!upstream) {
        return artifactProxyError(502, "artifact_redirect_limit_exceeded", "artifact_redirect_limit_exceeded");
      }

      if (upstream.status >= 500 && attempt < ARTIFACT_FETCH_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, ARTIFACT_FETCH_RETRY_DELAY_MS * attempt));
        upstream = null;
        continue;
      }
      break;
    } catch (exc) {
      if (attempt < ARTIFACT_FETCH_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, ARTIFACT_FETCH_RETRY_DELAY_MS * attempt));
      }
    }
  }

  if (!upstream) {
    return artifactProxyError(502, "artifact_fetch_failed", "artifact_fetch_failed");
  }

  const body = await upstream.arrayBuffer();
  const upstreamContentType = upstream.headers.get("content-type")?.trim() || "";

  return new NextResponse(body, {
    status: upstream.status,
    headers: {
      "content-type": resolveProxyContentType(upstreamContentType, target.contentTypeHint),
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      "cross-origin-resource-policy": "same-origin",
      "x-iis-artifact-proxy": "1",
    },
  });
}
