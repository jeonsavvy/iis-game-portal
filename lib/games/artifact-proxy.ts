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

const EMBED_VIEWPORT_FIX_STYLE =
  "<style id=\"iis-embed-viewport-fix\">html,body{margin:0!important;width:100%!important;height:100%!important;min-height:0!important;overflow:hidden!important;overscroll-behavior:none!important;background:#020617!important;}body{display:block!important;}main,[data-overflow-policy],#root,#app,.app,.runtime-root,.game-root,.stage-shell,.stage,.play-stage,.play-area{width:100%!important;height:100%!important;max-width:none!important;max-height:100%!important;min-height:0!important;margin:0!important;border:0!important;border-radius:0!important;overflow:hidden!important;}canvas#game,canvas{width:100%!important;height:100%!important;max-width:100%!important;max-height:100%!important;aspect-ratio:auto!important;display:block!important;}</style>";

const EMBED_VIEWPORT_FIX_SCRIPT = `<script id="iis-embed-viewport-script">(()=>{
const fit=(el)=>{if(!(el instanceof HTMLElement))return;el.style.minHeight='0';el.style.height='100%';el.style.maxHeight='100%';el.style.overflow='hidden';};
const recoverOverlay=()=>{
  const overlay=document.getElementById('overlay');
  const overlayText=(document.getElementById('overlay-text')?.textContent||'').toLowerCase();
  const shouldRecover=Boolean(overlay&&overlay.classList.contains('show')&&(overlayText.includes('game over')||overlayText.includes('최종')||overlayText.includes('start')||overlayText.includes('시작')));
  if(!shouldRecover)return;
  overlay.classList.remove('show');
  if(typeof window.restartGame==='function'){try{window.restartGame();}catch(_){}}
  try{window.dispatchEvent(new KeyboardEvent('keydown',{key:'r'}));}catch(_){}
};
const apply=()=>{
  fit(document.documentElement);fit(document.body);
  const game=(document.getElementById('game')||document.querySelector('canvas'));
  if(game instanceof HTMLCanvasElement){
    game.style.width='100%';game.style.height='100%';game.style.maxWidth='100%';game.style.maxHeight='100%';game.style.aspectRatio='auto';
    let node=game.parentElement;let depth=0;while(node&&depth<8){fit(node);node=node.parentElement;depth+=1;}
  }
  const stage=document.querySelector('.stage,.stage-shell,.runtime-root,.game-root,main,[data-overflow-policy],.app,.play-stage');
  fit(stage);
  recoverOverlay();
};
if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',apply,{once:true});}else{apply();}
window.addEventListener('resize',apply,{passive:true});
window.addEventListener('message',(event)=>{if(event?.data?.type==='iis:recover:start'){recoverOverlay();apply();}});
})();</script>`;

function patchHtmlForEmbeddedViewport(html: string): string {
  if (!html || html.includes("iis-embed-viewport-fix")) {
    return html;
  }

  let nextHtml = html;
  if (/<\/head>/i.test(nextHtml)) {
    nextHtml = nextHtml.replace(/<\/head>/i, `${EMBED_VIEWPORT_FIX_STYLE}</head>`);
  } else {
    nextHtml = `${EMBED_VIEWPORT_FIX_STYLE}${nextHtml}`;
  }

  if (/<\/body>/i.test(nextHtml)) {
    nextHtml = nextHtml.replace(/<\/body>/i, `${EMBED_VIEWPORT_FIX_SCRIPT}</body>`);
  } else {
    nextHtml = `${nextHtml}${EMBED_VIEWPORT_FIX_SCRIPT}`;
  }
  return nextHtml;
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

  const upstreamContentType = upstream.headers.get("content-type")?.trim() || "";
  const resolvedContentType = resolveProxyContentType(upstreamContentType, target.contentTypeHint);
  let body: BodyInit;
  const rawBody = await upstream.arrayBuffer();
  if (resolvedContentType.toLowerCase().startsWith("text/html")) {
    const rawHtml = new TextDecoder().decode(rawBody);
    const patchedHtml = patchHtmlForEmbeddedViewport(rawHtml);
    body = patchedHtml;
  } else {
    body = rawBody;
  }

  return new NextResponse(body, {
    status: upstream.status,
    headers: {
      "content-type": resolvedContentType,
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
      // sandbox iframe (without allow-same-origin) gets an opaque origin.
      // strict same-origin CORP blocks loading its own proxied JS/CSS assets.
      "cross-origin-resource-policy": "cross-origin",
      "x-iis-artifact-proxy": "1",
    },
  });
}
