import Link from "next/link";

import { PREVIEW_GAMES, PREVIEW_SESSION_EVENTS, PREVIEW_SESSIONS } from "@/lib/demo/preview-data";
import { SignOutButton } from "@/components/SignOutButton";
import { AccessStateCard } from "@/components/auth/access-state-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getAccessDeniedCopy, getLoginRequiredCopy } from "@/lib/auth/access-feedback";
import { resolveGenreLabel } from "@/lib/games/presentation";
import { isMasterAdmin } from "@/lib/auth/rbac";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AppRole } from "@/types/database";

type DashboardSessionRow = {
  session_id: string;
  title: string;
  genre: string;
  status: string;
  score: number;
  updated_at?: string | null;
  latestError: string | null;
  runStatus: string;
};

type DashboardQueueEvent = {
  id: string;
  event_type: string;
  summary?: string;
};

type DashboardGameRow = {
  id: string;
  slug: string;
  name: string;
  genre: string;
  status: string;
  created_at: string;
};

type DashboardData = {
  totalSessions: number;
  activeSessions: number;
  approvalQueueCount: number;
  recentSessions: DashboardSessionRow[];
  recentGames: DashboardGameRow[];
  issueQueue: DashboardQueueEvent[];
  approvalQueue: DashboardQueueEvent[];
};

function latestRunStatus(events: Array<{ event_type?: string | null }>): string {
  const runEvent = events.find((event) =>
    ["prompt_run_failed", "prompt_run_succeeded", "prompt_run_cancelled", "prompt_run_started", "prompt_run_queued"].includes(String(event.event_type ?? "")),
  );
  if (!runEvent) return "idle";
  if (runEvent.event_type === "prompt_run_failed") return "failed";
  if (runEvent.event_type === "prompt_run_succeeded") return "succeeded";
  if (runEvent.event_type === "prompt_run_cancelled") return "cancelled";
  if (runEvent.event_type === "prompt_run_started") return "running";
  return "queued";
}

function labelForRunStatus(status: string): string {
  return {
    idle: "대기",
    queued: "대기열",
    running: "실행 중",
    succeeded: "완료",
    failed: "실패",
    cancelled: "취소됨",
  }[status] ?? status;
}

function labelForSessionStatus(status: string): string {
  return {
    active: "작업 중",
    published: "퍼블리시 완료",
    cancelled: "취소됨",
    failed: "실패",
  }[status] ?? status;
}

function labelForEvent(eventType: string): string {
  return {
    issue_reported: "이슈 등록",
    fix_proposed: "수정안 제안",
    fix_applied: "수정안 적용",
    publish_blocked_unapproved: "승인 대기",
    publish_approved: "승인 완료",
    publish_success: "퍼블리시 완료",
  }[eventType] ?? eventType;
}

function formatDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("ko-KR", { hour12: false, month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

async function loadDashboardData(previewMode: boolean): Promise<DashboardData> {
  if (previewMode) {
    const eventRows = Object.values(PREVIEW_SESSION_EVENTS).flat() as Array<{ id: string; event_type: string; summary?: string; error_code?: string | null }>;
    const recentSessions = PREVIEW_SESSIONS.map((session) => {
      const events = (PREVIEW_SESSION_EVENTS[session.session_id] ?? []) as Array<{ event_type?: string | null; error_code?: string | null }>;
      return {
        ...session,
        latestError: events.find((event) => event.error_code)?.error_code ?? null,
        runStatus: latestRunStatus(events),
      };
    });
    const recentGames = PREVIEW_GAMES.filter((game) => game.status === "active")
      .slice()
      .sort((left, right) => Date.parse(right.created_at) - Date.parse(left.created_at))
      .slice(0, 5)
      .map((game) => ({
        id: game.id,
        slug: game.slug,
        name: game.name,
        genre: game.genre_primary ?? game.genre,
        status: game.status,
        created_at: game.created_at,
      }));
    return {
      totalSessions: PREVIEW_SESSIONS.length,
      activeSessions: PREVIEW_SESSIONS.filter((session) => session.status === "active").length,
      approvalQueueCount: eventRows.filter((event) => ["publish_blocked_unapproved", "publish_approved"].includes(event.event_type)).length,
      recentSessions,
      recentGames,
      issueQueue: eventRows.filter((event) => ["issue_reported", "fix_proposed", "fix_applied"].includes(event.event_type)).slice(0, 4),
      approvalQueue: eventRows.filter((event) => ["publish_blocked_unapproved", "publish_approved", "publish_success"].includes(event.event_type)).slice(0, 4),
    };
  }

  const supabase = await createSupabaseServerClient();
  const [
    sessionsCountResult,
    activeSessionsCountResult,
    recentSessionsResult,
    recentGamesResult,
  ] = await Promise.all([
    supabase.from("sessions").select("id", { count: "exact", head: true }),
    supabase.from("sessions").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("sessions").select("id,title,genre,status,score,created_at,updated_at").order("updated_at", { ascending: false }).limit(8),
    supabase.from("games_metadata").select("id,slug,name,genre,genre_primary,status,created_at").order("created_at", { ascending: false }).limit(5),
  ]);

  const sessions = ((recentSessionsResult.data ?? []) as Array<{ id: string; title: string; genre: string; status: string; score: number; created_at: string; updated_at: string }>).map((session) => ({
    session_id: session.id,
    title: session.title,
    genre: session.genre,
    status: session.status,
    score: session.score,
    created_at: session.created_at,
    updated_at: session.updated_at,
  }));

  const eventEntries = await Promise.all(
    sessions.map(async (session) => {
      const result = await supabase
        .from("session_events")
        .select("id,event_type,summary,error_code,created_at")
        .eq("session_id", session.session_id)
        .order("created_at", { ascending: false })
        .limit(40);
      return [session.session_id, (result.data ?? []) as Array<{ id: string; event_type: string; summary?: string; error_code?: string | null; created_at: string }>] as const;
    }),
  );
  const eventsBySession = Object.fromEntries(eventEntries);
  const flattenedEvents = Object.values(eventsBySession).flat();

  return {
    totalSessions: sessionsCountResult.count ?? sessions.length,
    activeSessions: activeSessionsCountResult.count ?? sessions.filter((session) => session.status === "active").length,
    approvalQueueCount: flattenedEvents.filter((event) => ["publish_blocked_unapproved", "publish_approved"].includes(event.event_type)).length,
    recentSessions: sessions.map((session) => ({
      ...session,
      latestError: (eventsBySession[session.session_id] ?? []).find((event) => event.error_code)?.error_code ?? null,
      runStatus: latestRunStatus(eventsBySession[session.session_id] ?? []),
    })),
    recentGames: ((recentGamesResult.data ?? []) as Array<{ id: string; slug: string; name: string; genre: string; genre_primary: string | null; status: string; created_at: string }>).map((game) => ({
      id: game.id,
      slug: game.slug,
      name: game.name,
      genre: game.genre_primary ?? game.genre,
      status: game.status,
      created_at: game.created_at,
    })),
    issueQueue: flattenedEvents.filter((event) => ["issue_reported", "fix_proposed", "fix_applied"].includes(event.event_type)).slice(0, 4),
    approvalQueue: flattenedEvents.filter((event) => ["publish_blocked_unapproved", "publish_approved", "publish_success"].includes(event.event_type)).slice(0, 4),
  };
}

function DashboardStat({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <Card data-admin-surface={`stat-${label}`} className="p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <strong className="mt-3 block text-3xl font-semibold tracking-[-0.05em] text-foreground">{value}</strong>
      <p className="mt-2 text-sm text-muted-foreground">{detail}</p>
    </Card>
  );
}

function AdminDashboard({ previewMode, data }: { previewMode: boolean; data: DashboardData }) {
  return (
    <section className="grid gap-5">
      <div className="flex justify-end">{previewMode ? null : <SignOutButton />}</div>
      <Card data-admin-surface="hub" className="p-6 sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <Badge variant="outline" className="w-fit">operations</Badge>
            <h1 className="text-4xl font-semibold tracking-[-0.05em] text-foreground">운영실</h1>
            <p className="text-sm leading-6 text-muted-foreground">세션 흐름과 공개 게임 상태를 한 화면에서 읽는 운영 대시보드입니다.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href="/admin/sessions">세션 운영실 열기</Link>
            </Button>
            <Button asChild>
              <Link href="/admin/games">게임 관리 열기</Link>
            </Button>
          </div>
        </div>
      </Card>

      <section className="grid gap-4 md:grid-cols-3">
        <DashboardStat label="세션" value={`${data.totalSessions}`} detail="현재 읽을 수 있는 전체 세션" />
        <DashboardStat label="작업 중" value={`${data.activeSessions}`} detail="진행 중 상태의 세션 수" />
        <DashboardStat label="승인 흐름" value={`${data.approvalQueueCount}`} detail="퍼블리시 승인 관련 이벤트 수" />
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(19rem,0.9fr)]">
        <Card data-admin-surface="dashboard-sessions" className="p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-[1.35rem] font-semibold tracking-[-0.03em] text-foreground">최근 세션</h2>
              <p className="mt-1 text-sm text-muted-foreground">가장 최근에 갱신된 세션과 실행 상태를 바로 확인합니다.</p>
            </div>
            <Badge variant="secondary">{data.recentSessions.length}</Badge>
          </div>
          <div className="grid gap-3">
            {data.recentSessions.map((session) => (
              <Link
                key={session.session_id}
                href={`/admin/sessions`}
                className="rounded-[1.2rem] border border-[#1b1337]/8 bg-white/88 px-4 py-4 transition hover:border-[#1b1337]/14"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-foreground">{session.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{labelForSessionStatus(session.status)} · {session.genre || "general"}</p>
                  </div>
                  <Badge variant={session.latestError ? "destructive" : "outline"}>{labelForRunStatus(session.runStatus)}</Badge>
                </div>
                {session.latestError ? <p className="mt-2 text-xs text-red-600">최근 오류: {session.latestError}</p> : null}
              </Link>
            ))}
          </div>
        </Card>

        <Card data-admin-surface="dashboard-games" className="p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-[1.35rem] font-semibold tracking-[-0.03em] text-foreground">최근 게임</h2>
              <p className="mt-1 text-sm text-muted-foreground">최근 등록된 공개 게임 상태를 빠르게 점검합니다.</p>
            </div>
            <Badge variant="secondary">{data.recentGames.length}</Badge>
          </div>
          <div className="grid gap-3">
            {data.recentGames.map((game) => (
              <Link
                key={game.id}
                href="/admin/games"
                className="rounded-[1.2rem] border border-[#1b1337]/8 bg-white/88 px-4 py-4 transition hover:border-[#1b1337]/14"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-foreground">{game.name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {resolveGenreLabel({ genre: game.genre, genre_primary: game.genre, genre_tags: [game.genre] } as never)}
                    </p>
                  </div>
                  <Badge variant="outline">{game.status}</Badge>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{formatDate(game.created_at)}</p>
              </Link>
            ))}
          </div>
        </Card>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <Card data-admin-surface="dashboard-issue-queue" className="p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-[1.3rem] font-semibold tracking-[-0.03em] text-foreground">수정 요청 대기</h2>
            <Badge variant="secondary">{data.issueQueue.length}</Badge>
          </div>
          <div className="grid gap-3">
            {data.issueQueue.length === 0 ? (
              <p className="rounded-[1rem] border border-dashed border-[#1b1337]/10 px-4 py-5 text-sm text-muted-foreground">현재 대기 중인 수정 요청이 없습니다.</p>
            ) : (
              data.issueQueue.map((event) => (
                <div key={event.id} className="rounded-[1rem] border border-[#1b1337]/8 bg-white/88 px-4 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">{labelForEvent(event.event_type)}</p>
                  <p className="mt-2 text-sm leading-6 text-foreground">{event.summary}</p>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card data-admin-surface="dashboard-approval-queue" className="p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-[1.3rem] font-semibold tracking-[-0.03em] text-foreground">퍼블리시 흐름</h2>
            <Badge variant="secondary">{data.approvalQueue.length}</Badge>
          </div>
          <div className="grid gap-3">
            {data.approvalQueue.length === 0 ? (
              <p className="rounded-[1rem] border border-dashed border-[#1b1337]/10 px-4 py-5 text-sm text-muted-foreground">현재 대기 중인 승인 이벤트가 없습니다.</p>
            ) : (
              data.approvalQueue.map((event) => (
                <div key={event.id} className="rounded-[1rem] border border-[#1b1337]/8 bg-white/88 px-4 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">{labelForEvent(event.event_type)}</p>
                  <p className="mt-2 text-sm leading-6 text-foreground">{event.summary}</p>
                </div>
              ))
            )}
          </div>
        </Card>
      </section>
    </section>
  );
}

export default async function AdminPage() {
  const previewMode = process.env.IIS_DEMO_PREVIEW === "1";
  if (previewMode) {
    const dashboardData = await loadDashboardData(true);
    return <AdminDashboard previewMode data={dashboardData} />;
  }

  let supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  try {
    supabase = await createSupabaseServerClient();
  } catch (error) {
    return (
      <Card className="grid gap-4 p-6">
        <h1 className="text-4xl font-semibold tracking-[-0.05em] text-foreground">운영실</h1>
        <p className="text-sm leading-7 text-muted-foreground">Supabase 구성이 올바르지 않아 운영실을 불러오지 못했습니다.</p>
        <p className="text-sm text-red-600">{error instanceof Error ? error.message : "unknown_error"}</p>
      </Card>
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    const loginCopy = getLoginRequiredCopy("/admin");
    return (
      <AccessStateCard
        title="운영실"
        message={loginCopy.message}
        actions={(
          <Button asChild className="w-fit">
            <Link href={loginCopy.href}>{loginCopy.ctaLabel}</Link>
          </Button>
        )}
      />
    );
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const role = ((profile as { role?: AppRole } | null)?.role ?? null) as AppRole | null;
  if (!isMasterAdmin(role)) {
    const deniedCopy = getAccessDeniedCopy(user.email ?? user.id);
    return (
      <AccessStateCard
        title="운영실"
        message={deniedCopy.message}
        detail={deniedCopy.detail}
        actions={(
          <>
            <Button asChild className="w-fit" variant="outline">
              <Link href={deniedCopy.primaryHref}>{deniedCopy.primaryCtaLabel}</Link>
            </Button>
            <SignOutButton />
          </>
        )}
      />
    );
  }

  const dashboardData = await loadDashboardData(false);
  return <AdminDashboard previewMode={false} data={dashboardData} />;
}
