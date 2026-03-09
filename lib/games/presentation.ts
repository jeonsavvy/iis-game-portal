import type { Database } from "@/types/database";

type GameRow = Database["public"]["Tables"]["games_metadata"]["Row"];
type GenreToken = "racing" | "flight" | "shooter" | "puzzle" | "survival" | "experimental" | "action" | "game";

const PLACEHOLDER_PREFIXES = ["/assets/preview/", "/assets/preview-raster/"] as const;

function normalizedGenreToken(raw: string | null | undefined, tags: string[] = []): GenreToken {
  const haystack = [raw ?? "", ...tags].join(" ").toLowerCase();
  if (/(race|racing|openwheel|formula|circuit|drift|레이싱)/.test(haystack)) return "racing";
  if (/(flight|island|pilot|sky|wing|비행)/.test(haystack)) return "flight";
  if (/(shoot|dogfight|arena|combat|shooter|슈팅)/.test(haystack)) return "shooter";
  if (/(puzzle|labyrinth|퍼즐)/.test(haystack)) return "puzzle";
  if (/(survival|생존)/.test(haystack)) return "survival";
  if (/(experimental|prototype|실험)/.test(haystack)) return "experimental";
  if (/(arcade|action|액션)/.test(haystack)) return "action";
  return "game";
}

function normalizeAssetPath(url: string | null | undefined): string {
  const normalized = String(url ?? "").trim();
  if (!normalized) return "";
  try {
    return new URL(normalized).pathname.toLowerCase();
  } catch {
    return normalized.toLowerCase();
  }
}

function isHttpUrl(url: string | null | undefined): boolean {
  return /^https?:\/\//i.test(String(url ?? "").trim());
}

function isPlaceholderAsset(url: string | null | undefined): boolean {
  const normalizedPath = normalizeAssetPath(url);
  return PLACEHOLDER_PREFIXES.some((prefix) => normalizedPath.startsWith(prefix));
}

function looksRobotic(text: string, gameName: string): boolean {
  const normalized = text.trim();
  if (!normalized) return true;
  const lowered = normalized.toLowerCase();
  return (
    lowered.includes("play를 바로 즐길 수 있는 브라우저 게임")
    || lowered.includes("게임을 시작하면 화면의 목표와 루프를 먼저 확인하세요")
    || lowered.includes("초반에는 생존과 조작 감각 파악에 집중하고")
    || lowered.includes("기본 이동/조작은 화면 hud")
    || lowered.includes("재시작은 일반적으로")
    || /[a-z0-9]+_[a-z0-9_]+/.test(lowered)
    || normalized.startsWith(`${gameName} ·`)
  );
}

export function resolveGameImage(game: Pick<GameRow, "screenshot_url" | "hero_image_url" | "thumbnail_url" | "genre" | "genre_primary" | "genre_tags">): string | null {
  const candidates = [game.thumbnail_url, game.hero_image_url, game.screenshot_url].filter((value): value is string => Boolean(value?.trim()));
  const firstActual = candidates.find((candidate) => !isPlaceholderAsset(candidate));
  if (firstActual) return firstActual;
  const previewPlaceholder = candidates.find((candidate) => isPlaceholderAsset(candidate) && !isHttpUrl(candidate));
  return previewPlaceholder ?? null;
}

export function resolveGenreLabel(game: Pick<GameRow, "genre" | "genre_primary" | "genre_tags">): string {
  const token = normalizedGenreToken(game.genre_primary ?? game.genre, Array.isArray(game.genre_tags) ? game.genre_tags : []);
  const labels: Record<GenreToken, string> = {
    racing: "레이싱",
    flight: "비행",
    shooter: "슈팅",
    puzzle: "퍼즐",
    survival: "서바이벌",
    experimental: "실험작",
    action: "액션",
    game: "게임",
  };
  return labels[token];
}

export function resolveGameSummary(game: Pick<GameRow, "name" | "genre" | "genre_primary" | "genre_tags" | "short_description" | "marketing_summary">): string {
  const candidates = [game.short_description, game.marketing_summary].filter((value): value is string => Boolean(value?.trim()));
  const firstHuman = candidates.find((candidate) => !looksRobotic(candidate, game.name));
  if (firstHuman) return firstHuman.trim();

  const token = normalizedGenreToken(game.genre_primary ?? game.genre, Array.isArray(game.genre_tags) ? game.genre_tags : []);
  const summaries: Record<GenreToken, string> = {
    racing: "네온 서킷을 질주하며 랩타임을 줄여가는 3D 레이싱 게임",
    flight: "섬과 구름 사이를 누비며 링을 통과하는 3D 비행 게임",
    shooter: "적을 추격하고 회피를 이어가는 3D 아케이드 슈팅 게임",
    puzzle: "짧은 규칙 안에서 경로와 타이밍을 푸는 퍼즐 게임",
    survival: "압박 속에서 생존 시간을 늘려가는 아케이드 생존 게임",
    experimental: "짧고 선명한 규칙 실험에 집중한 실험작",
    action: "즉시 시작해 손맛 있게 즐기는 아케이드 액션 게임",
    game: "브라우저에서 바로 실행할 수 있는 게임",
  };
  return summaries[token];
}

export function resolveGameOverview(game: Pick<GameRow, "genre" | "genre_primary" | "genre_tags" | "play_overview">): string[] {
  const rows = Array.isArray(game.play_overview) ? game.play_overview.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
  if (rows.length > 0 && rows.every((row) => !looksRobotic(row, ""))) {
    return rows;
  }

  const token = normalizedGenreToken(game.genre_primary ?? game.genre, Array.isArray(game.genre_tags) ? game.genre_tags : []);
  const overviews: Record<GenreToken, string[]> = {
    racing: [
      "체크포인트를 이어가며 랩타임을 줄이는 3D 레이싱 구조입니다.",
      "코너 진입 전에 감속하고, 탈출 구간에서 다시 가속하는 리듬이 중요합니다.",
    ],
    flight: [
      "섬과 구름 사이를 날며 링을 통과하는 3D 비행 구조입니다.",
      "고도와 yaw를 안정적으로 유지하면서 다음 링의 각도를 읽는 것이 핵심입니다.",
    ],
    shooter: [
      "적 편대를 추격하며 회피와 사격을 반복하는 3D 전투 구조입니다.",
      "적의 이동선을 읽고 짧은 부스트로 사각을 만드는 것이 중요합니다.",
    ],
    puzzle: [
      "짧은 규칙 안에서 경로와 타이밍을 읽는 퍼즐 구조입니다.",
      "정답 하나보다 탐색 순서와 관찰이 중요합니다.",
    ],
    survival: [
      "초반 생존 루프를 빠르게 익히고 압박을 관리하는 구조입니다.",
      "공간 확보와 템포 조절이 오래 버티는 핵심입니다.",
    ],
    experimental: [
      "짧은 플레이 안에 새로운 규칙 감각을 시험하는 실험작입니다.",
      "무엇을 해야 하는지보다 어떻게 해석하는지가 중요한 빌드입니다.",
    ],
    action: [
      "즉시 시작해 손맛과 템포를 확인할 수 있는 액션 구조입니다.",
      "짧은 회피와 연속 입력 타이밍이 핵심입니다.",
    ],
    game: ["바로 실행해서 감각과 루프를 확인할 수 있는 빌드입니다."],
  };
  return overviews[token];
}

export function resolveGameControls(game: Pick<GameRow, "genre" | "genre_primary" | "genre_tags" | "controls_guide">): string[] {
  const rows = Array.isArray(game.controls_guide) ? game.controls_guide.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
  if (rows.length > 0 && rows.every((row) => !looksRobotic(row, ""))) {
    return rows;
  }

  const token = normalizedGenreToken(game.genre_primary ?? game.genre, Array.isArray(game.genre_tags) ? game.genre_tags : []);
  const controls: Record<GenreToken, string[]> = {
    racing: ["조향: A / D 또는 ← / →", "가속·감속: W / S 또는 ↑ / ↓", "재시작: R"],
    flight: ["피치: W / S", "Yaw / Bank: A / D", "부스트: Shift", "자세 안정화: Space", "재시작: R"],
    shooter: ["피치: W / S", "롤: A / D", "Yaw: Q / E", "사격: Space", "부스트: Shift", "재시작: R"],
    puzzle: ["이동: 방향키 또는 WASD", "상호작용: Space", "재시작: R"],
    survival: ["이동: 방향키 또는 WASD", "액션: Space", "재시작: R"],
    experimental: ["이동: 방향키 또는 WASD", "상호작용: Space", "재시작: R"],
    action: ["이동: 방향키 또는 WASD", "액션: Space", "재시작: R"],
    game: ["조작은 화면 상단 HUD를 먼저 확인하세요.", "재시작: R"],
  };
  return controls[token];
}
