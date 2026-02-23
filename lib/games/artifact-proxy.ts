import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

const JS_CONTENT_TYPE = "application/javascript; charset=utf-8";
const ARTIFACT_FETCH_TIMEOUT_MS = 15_000;
const ARTIFACT_FETCH_RETRIES = 2;
const ARTIFACT_FETCH_RETRY_DELAY_MS = 200;

export type ArtifactTarget = {
  game: Database["public"]["Tables"]["games_metadata"]["Row"];
  upstreamUrl: string;
  contentTypeHint: string;
};

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
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }

  const typedGame = game as unknown as Database["public"]["Tables"]["games_metadata"]["Row"];
  const safeAssetPath = sanitizeAssetPath(requestedAssetPath);
  if (!safeAssetPath) {
    return NextResponse.json({ error: "Invalid artifact path" }, { status: 400 });
  }

  let sourceUrl: URL;
  try {
    sourceUrl = new URL(typedGame.url);
  } catch {
    return NextResponse.json({ error: "Invalid game URL" }, { status: 500 });
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
  let lastError: unknown;

  for (let attempt = 1; attempt <= ARTIFACT_FETCH_RETRIES; attempt += 1) {
    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), ARTIFACT_FETCH_TIMEOUT_MS);
    try {
      upstream = await fetch(target.upstreamUrl, { cache: "no-store", signal: controller.signal });
      if (upstream.status >= 500 && attempt < ARTIFACT_FETCH_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, ARTIFACT_FETCH_RETRY_DELAY_MS * attempt));
        continue;
      }
      break;
    } catch (exc) {
      lastError = exc;
      if (attempt < ARTIFACT_FETCH_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, ARTIFACT_FETCH_RETRY_DELAY_MS * attempt));
      }
    } finally {
      clearTimeout(timeoutHandle);
    }
  }

  if (!upstream) {
    return NextResponse.json({ error: `artifact_fetch_failed: ${String(lastError ?? "unknown")}` }, { status: 502 });
  }

  const body = await upstream.arrayBuffer();
  const upstreamContentType = upstream.headers.get("content-type")?.trim() || "";

  return new NextResponse(body, {
    status: upstream.status,
    headers: {
      "content-type": resolveProxyContentType(upstreamContentType, target.contentTypeHint),
      "cache-control": "no-store",
      "x-iis-artifact-proxy": "1",
      "x-iis-artifact-source": target.upstreamUrl,
    },
  });
}
