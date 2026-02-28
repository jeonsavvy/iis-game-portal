import Link from "next/link";

import { GameAdminPanel } from "@/components/GameAdminPanel";
import { SignOutButton } from "@/components/SignOutButton";
import { StudioControlDeck } from "@/components/StudioControlDeck";
import { TokenCostKPI } from "@/components/TokenCostKPI";
import {
  buildTokenUsageReport,
  parsePipelineUsageSummary,
  type PipelineUsageSummaryRecord,
  type RecentGameRow,
  type TokenUsageByGameRow,
  type TokenUsageSummary,
} from "@/lib/admin/token-usage";
import { canReadPipelineLogs } from "@/lib/auth/rbac";
import { PREVIEW_GAMES, PREVIEW_PIPELINE_LOGS, PREVIEW_TOKEN_ROWS, PREVIEW_TOKEN_SUMMARY } from "@/lib/demo/preview-data";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AppRole } from "@/types/database";
import type { PipelineLog } from "@/types/pipeline";

function renderAdminSurface({
  roleLabel,
  identityLabel,
  logs,
  games,
  tokenSummary,
  tokenRows,
  previewMode,
}: {
  roleLabel: string;
  identityLabel: string;
  logs: PipelineLog[];
  games: RecentGameRow[];
  tokenSummary: TokenUsageSummary;
  tokenRows: TokenUsageByGameRow[];
  previewMode: boolean;
}) {
  return (
    <section className="console-page">
      <section className="surface console-hero">
        <div className="console-hero-copy">
          <p className="eyebrow">운영 센터</p>
          <h1 className="hero-title">게임 제작 운영 콘솔</h1>
          <p className="section-subtitle">자동 제작 파이프라인의 실행 상태를 확인하고, 필요할 때 일시정지·재개·중단·재시도를 제어합니다.</p>
          <p className="muted-text">권한: {roleLabel} · {identityLabel}</p>
          {previewMode ? <p className="muted-text">프리뷰 모드: 실서버 호출 없이 샘플 데이터로 협업 인터페이스를 검수합니다.</p> : null}
        </div>
        <div className="console-hero-actions">
          <Link className="button button-ghost" href="/">
            포털 홈 보기
          </Link>
          {previewMode ? null : <SignOutButton />}
        </div>
      </section>

      <StudioControlDeck initialLogs={logs} previewMode={previewMode} />

      <TokenCostKPI summary={tokenSummary} rows={tokenRows} />

      <GameAdminPanel initialGames={games} readOnly={previewMode} />
    </section>
  );
}

export default async function AdminPage() {
  const previewMode = process.env.IIS_DEMO_PREVIEW === "1";
  const previewGames: RecentGameRow[] = PREVIEW_GAMES.map((game) => ({
    id: game.id,
    name: game.name,
    slug: game.slug,
    genre: game.genre,
    status: game.status,
    created_at: game.created_at,
  }));

  if (previewMode) {
    return renderAdminSurface({
      roleLabel: "preview_operator",
      identityLabel: "preview@iis.local",
      logs: PREVIEW_PIPELINE_LOGS,
      games: previewGames,
      tokenSummary: PREVIEW_TOKEN_SUMMARY,
      tokenRows: PREVIEW_TOKEN_ROWS,
      previewMode: true,
    });
  }

  let supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  try {
    supabase = await createSupabaseServerClient();
  } catch (error) {
    return (
      <section className="card" style={{ display: "grid", gap: 8 }}>
        <h1 style={{ margin: 0 }}>스튜디오 콘솔</h1>
        <p style={{ margin: 0 }}>Supabase 구성이 올바르지 않아 콘솔을 불러오지 못했습니다.</p>
        <p style={{ margin: 0, color: "var(--muted)" }}>{error instanceof Error ? error.message : "unknown_error"}</p>
      </section>
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <section className="card" style={{ display: "grid", gap: 8 }}>
        <h1 style={{ margin: 0 }}>스튜디오 콘솔</h1>
        <p style={{ margin: 0 }}>스튜디오 콘솔에 접근하려면 로그인이 필요합니다.</p>
        <Link className="button" href="/login?next=/admin">
          로그인 페이지로 이동
        </Link>
      </section>
    );
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const role = ((profile as { role?: AppRole } | null)?.role ?? null) as AppRole | null;

  if (!canReadPipelineLogs(role)) {
    return (
      <section className="card" style={{ display: "grid", gap: 8 }}>
        <h1 style={{ margin: 0 }}>스튜디오 콘솔</h1>
        <p style={{ margin: 0 }}>
          접근 권한이 없습니다. master_admin 권한이 필요합니다. (현재 로그인: {user.email ?? user.id})
        </p>
        <div>
          <SignOutButton />
        </div>
      </section>
    );
  }

  const validatedRole = role as AppRole;

  const { data: logs } = await supabase.from("pipeline_logs").select("*").order("created_at", { ascending: false }).limit(180);

  const typedLogs = (logs ?? []) as PipelineLog[];
  const { data: recentGames } = await supabase
    .from("games_metadata")
    .select("id,name,slug,genre,status,created_at")
    .order("created_at", { ascending: false })
    .limit(30);
  const recentGamesRows = (recentGames ?? []) as RecentGameRow[];
  const uniquePipelines = new Set(typedLogs.map((log) => log.pipeline_id));
  const pipelineIdList = Array.from(uniquePipelines);
  const { data: pipelineRows } =
    pipelineIdList.length > 0
      ? await supabase.from("admin_config").select("id,keyword,payload").in("id", pipelineIdList)
      : { data: [] };
  const pipelineKeywordById = new Map(
    ((pipelineRows ?? []) as Array<{ id: string; keyword: string; payload: unknown }>).map((row) => [row.id, row.keyword]),
  );
  const pipelineUsageSummaryById = new Map(
    ((pipelineRows ?? []) as Array<{ id: string; keyword: string; payload: unknown }>)
      .map((row) => [row.id, parsePipelineUsageSummary(row.payload)] as const)
      .filter((entry): entry is readonly [string, PipelineUsageSummaryRecord] => Boolean(entry[1])),
  );
  const tokenReport = buildTokenUsageReport(typedLogs, recentGamesRows, pipelineKeywordById, pipelineUsageSummaryById);

  return renderAdminSurface({
    roleLabel: validatedRole,
    identityLabel: user.email ?? user.id,
    logs: typedLogs,
    games: recentGamesRows,
    tokenSummary: tokenReport.summary,
    tokenRows: tokenReport.rows,
    previewMode: false,
  });
}
