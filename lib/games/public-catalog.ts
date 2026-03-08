import type { Database } from "@/types/database";

export type PublicGame = Database["public"]["Tables"]["games_metadata"]["Row"];
export type PublicSort = "popular" | "newest" | "name";

type FilterOptions = {
  q?: string;
  genre?: string;
};

function normalizeToken(value: string | null | undefined): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function parseDate(value: string | null | undefined): number {
  const parsed = Date.parse(String(value ?? ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function numericValue(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function extractGenreTags(game: Pick<PublicGame, "genre" | "genre_primary" | "genre_tags">): string[] {
  const tags = [
    normalizeToken(game.genre_primary),
    normalizeToken(game.genre),
    ...(Array.isArray(game.genre_tags) ? game.genre_tags.map((tag) => normalizeToken(String(tag))) : []),
  ].filter(Boolean);

  return Array.from(new Set(tags));
}

export function filterPublicGames(rows: PublicGame[], { q = "", genre = "" }: FilterOptions): PublicGame[] {
  const normalizedQuery = normalizeToken(q);
  const normalizedGenre = normalizeToken(genre);

  return rows.filter((game) => {
    if (normalizedQuery) {
      const haystack = normalizeToken([game.name, game.marketing_summary, game.short_description].filter(Boolean).join(" "));
      if (!haystack.includes(normalizedQuery)) {
        return false;
      }
    }

    if (normalizedGenre) {
      const tags = extractGenreTags(game);
      if (!tags.includes(normalizedGenre)) {
        return false;
      }
    }

    return true;
  });
}

export function sortPublicGames(rows: PublicGame[], sort: PublicSort): PublicGame[] {
  const copied = [...rows];

  if (sort === "name") {
    return copied.sort((left, right) => left.name.localeCompare(right.name, "ko-KR"));
  }

  if (sort === "popular") {
    return copied.sort((left, right) => {
      const playCountDiff = numericValue(right.play_count_cached) - numericValue(left.play_count_cached);
      if (playCountDiff !== 0) return playCountDiff;

      return parseDate(right.created_at) - parseDate(left.created_at);
    });
  }

  return copied.sort((left, right) => parseDate(right.released_at ?? right.created_at) - parseDate(left.released_at ?? left.created_at));
}
