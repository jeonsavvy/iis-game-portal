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
import { sanitizePipelineLog } from "@/lib/pipeline/log-sanitizer";
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
  collabRoomV2Enabled,
}: {
  roleLabel: string;
  identityLabel: string;
  logs: PipelineLog[];
  games: RecentGameRow[];
  tokenSummary: TokenUsageSummary;
  tokenRows: TokenUsageByGameRow[];
  previewMode: boolean;
  collabRoomV2Enabled: boolean;
}) {
  return (
    <section className="console-page">
      <section className="surface console-hero">
        <div className="console-hero-copy">
          <h1 className="hero-title">운영실</h1>
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

      <StudioControlDeck initialLogs={logs} previewMode={previewMode} collabRoomV2Enabled={collabRoomV2Enabled} />

      <TokenCostKPI summary={tokenSummary} rows={tokenRows} />

      <GameAdminPanel initialGames={games} readOnly={previewMode} />
    </section>
  );
}

export default async function AdminPage() {
  const previewMode = process.env.IIS_DEMO_PREVIEW === "1";
  const collabRoomV2Enabled = !["0", "false", "off"].includes((process.env.OPS_COLLAB_ROOM_V2 || "").trim().toLowerCase());
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
      collabRoomV2Enabled,
    });
  }

  let supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  try {
    supabase = await createSupabaseServerClient();
  } catch (error) {
    return (
      <section className="card" style={{ display: "grid", gap: 8 }}>
        <h1 style={{ margin: 0 }}>운영실</h1>
        <p style={{ margin: 0 }}>Supabase 구성이 올바르지 않아 운영실을 불러오지 못했습니다.</p>
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
        <h1 style={{ margin: 0 }}>운영실</h1>
        <p style={{ margin: 0 }}>운영실에 접근하려면 로그인이 필요합니다.</p>
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
        <h1 style={{ margin: 0 }}>운영실</h1>
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

  const { data: logs } = await supabase
    .from("pipeline_logs")
    .select("id,pipeline_id,stage,status,agent_name,message,reason,attempt,metadata,created_at")
    .order("created_at", { ascending: false })
    .limit(80);

  const typedLogs = (logs ?? []) as PipelineLog[];
  const consoleLogs = typedLogs.map(sanitizePipelineLog);
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
    logs: consoleLogs,
    games: recentGamesRows,
    tokenSummary: tokenReport.summary,
    tokenRows: tokenReport.rows,
    previewMode: false,
    collabRoomV2Enabled,
  });
}
