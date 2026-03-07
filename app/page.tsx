import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HomeFeaturedStrip } from "@/components/home/home-featured-strip";
import { HomeFilters } from "@/components/home/home-filters";
import { HomeGameGrid } from "@/components/home/home-game-grid";
import { HomeHero } from "@/components/home/home-hero";
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

async function loadHomeRows({ previewMode, sort, q }: { previewMode: boolean; sort: (typeof SORT_OPTIONS)[number]; q: string }): Promise<HomeDataResult> {
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
  const sort = params.sort && SORT_OPTIONS.includes(params.sort as (typeof SORT_OPTIONS)[number]) ? (params.sort as (typeof SORT_OPTIONS)[number]) : "newest";
  const q = typeof params.q === "string" ? params.q.trim() : "";

  const { rows, error } = await loadHomeRows({ previewMode, sort, q });
  const heroGame = rows[0] ?? null;
  const heroImage = heroGame?.screenshot_url ?? heroGame?.thumbnail_url ?? null;

  return (
    <section className="grid gap-5">
      <HomeHero game={heroGame} previewMode={previewMode} count={rows.length} backgroundImage={heroImage} />
      <HomeFeaturedStrip totalCount={rows.length} previewMode={previewMode} />
      <HomeFilters sort={sort} sortLabels={SORT_LABELS} q={q} />

      {error && !previewMode ? (
        <Card className="rounded-[1.85rem] border-red-400/20 bg-red-400/10">
          <CardHeader>
            <CardTitle>데이터를 불러오지 못했습니다</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-red-100">{error}</p>
          </CardContent>
        </Card>
      ) : null}

      {rows.length === 0 ? (
        <Card className="rounded-[1.85rem] border-white/8 bg-[#101118]/82">
          <CardHeader>
            <CardTitle>표시할 게임이 없습니다</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">조금 뒤에 다시 확인해 주세요.</p>
          </CardContent>
        </Card>
      ) : (
        <HomeGameGrid rows={rows} />
      )}
    </section>
  );
}
