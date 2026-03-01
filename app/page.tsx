import Link from "next/link";

import { GameCard } from "@/components/GameCard";
import { PREVIEW_GAMES } from "@/lib/demo/preview-data";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

const SORT_OPTIONS = ["newest", "oldest", "name"] as const;

const SORT_LABELS: Record<(typeof SORT_OPTIONS)[number], string> = {
  newest: "최신순",
  oldest: "오래된순",
  name: "이름순",
};

type HomeSearchParams = {
  sort?: string;
  q?: string;
};

type GameRow = Database["public"]["Tables"]["games_metadata"]["Row"];

type HomeDataResult = {
  rows: GameRow[];
  error: string | null;
};

function parseDate(value: string): number {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function applySorting(rows: GameRow[], sort: (typeof SORT_OPTIONS)[number]): GameRow[] {
  if (sort === "name") {
    return [...rows].sort((a, b) => a.name.localeCompare(b.name));
  }
  const sorted = [...rows].sort((a, b) => parseDate(a.created_at) - parseDate(b.created_at));
  if (sort === "newest") {
    sorted.reverse();
  }
  return sorted;
}

async function loadHomeRows({
  previewMode,
  sort,
  q,
}: {
  previewMode: boolean;
  sort: (typeof SORT_OPTIONS)[number];
  q: string;
}): Promise<HomeDataResult> {
  if (previewMode) {
    const filtered = PREVIEW_GAMES.filter((game) => game.status === "active");
    const searched = q ? filtered.filter((game) => game.name.toLowerCase().includes(q.toLowerCase())) : filtered;
    return { rows: applySorting(searched, sort), error: null };
  }

  try {
    const supabase = await createSupabaseServerClient();
    let query = supabase.from("games_metadata").select("*").eq("status", "active");
    if (q) {
      query = query.ilike("name", `%${q}%`);
    }
    if (sort === "name") {
      query = query.order("name", { ascending: true });
    } else {
      query = query.order("created_at", { ascending: sort === "oldest" });
    }

    const { data, error } = await query;
    if (error) {
      return { rows: [], error: error.message };
    }
    return { rows: ((data ?? []) as GameRow[]).filter((game) => game.status === "active"), error: null };
  } catch (error) {
    return { rows: [], error: error instanceof Error ? error.message : "알 수 없는 오류" };
  }
}

export default async function HomePage({ searchParams }: { searchParams?: Promise<HomeSearchParams> }) {
  const params = searchParams ? await searchParams : {};
  const previewMode = process.env.IIS_DEMO_PREVIEW === "1";
  const sort =
    params.sort && SORT_OPTIONS.includes(params.sort as (typeof SORT_OPTIONS)[number])
      ? (params.sort as (typeof SORT_OPTIONS)[number])
      : "newest";
  const q = typeof params.q === "string" ? params.q.trim() : "";

  const { rows, error } = await loadHomeRows({ previewMode, sort, q });
  const heroGame = rows[0] ?? null;
  const heroImage = heroGame?.screenshot_url ?? heroGame?.thumbnail_url ?? null;
  const heroBackground = heroImage
    ? `linear-gradient(120deg, rgba(8,12,19,0.88) 0%, rgba(8,12,19,0.45) 52%, rgba(8,12,19,0.9) 100%), url(${heroImage})`
    : "linear-gradient(120deg, #0f172a 0%, #111827 38%, #1f2937 100%)";

  return (
    <section className="arcade-home-page">
      <section className="surface arcade-hero-showcase" style={{ backgroundImage: heroBackground }}>
        <div className="arcade-hero-content">
          <p className="arcade-kicker">IIS ARCADE</p>
          <h1>{heroGame?.name ?? "자동 제작 게임을 바로 플레이하세요"}</h1>
          <p className="arcade-hero-description">
            {heroGame
              ? "지금 생성된 최신 게임을 바로 실행할 수 있습니다."
              : "아직 등록된 게임이 없습니다. 운영실에서 파이프라인을 실행하면 자동으로 등록됩니다."}
          </p>
          {previewMode ? <p className="arcade-preview-note">프리뷰 모드: 샘플 데이터로 화면을 검수 중입니다.</p> : null}
          <div className="arcade-hero-actions">
            {heroGame ? (
              <Link className="button button-primary" href={`/play/${heroGame.id}`}>
                지금 플레이
              </Link>
            ) : (
              <Link className="button button-ghost" href="/admin">
                운영실 이동
              </Link>
            )}
          </div>
        </div>

        <aside className="arcade-hero-side">
          <div className="arcade-hero-stat">
            <span>등록 게임</span>
            <strong>{rows.length}</strong>
          </div>
          <div className="arcade-hero-stat muted">
            <span>운영 모드</span>
            <strong>완전 자동</strong>
          </div>
        </aside>
      </section>

      <form className="surface quick-discover-bar" method="GET">
        <div className="quick-discover-head">
          <h2 className="section-title">빠른 탐색</h2>
        </div>

        <div className="quick-discover-grid">
          <label className="field">
            <span>정렬</span>
            <select className="input" name="sort" defaultValue={sort}>
              {SORT_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {SORT_LABELS[option]}
                </option>
              ))}
            </select>
          </label>

          <label className="field field-search">
            <span>게임 검색</span>
            <input className="input" name="q" defaultValue={q} placeholder="게임 이름으로 검색" />
          </label>

          <button className="button button-primary" type="submit">
            적용
          </button>
        </div>
      </form>

      {error && !previewMode ? (
        <section className="surface arcade-empty-state">
          <h3>데이터를 불러오지 못했습니다</h3>
          <p>{error}</p>
        </section>
      ) : null}

      {rows.length === 0 ? (
        <section className="surface arcade-empty-state">
          <h3>표시할 게임이 없습니다</h3>
          <p>운영실에서 제작을 실행하면 이 화면에 자동으로 반영됩니다.</p>
        </section>
      ) : (
        <section className="arcade-section">
          <div className="arcade-section-head">
            <h3>게임 목록</h3>
            <span>{rows.length}개</span>
          </div>
          <div className="arcade-game-grid featured-grid">
            {rows.map((game) => (
              <GameCard key={game.id} game={game} variant="featured" />
            ))}
          </div>
        </section>
      )}
    </section>
  );
}
