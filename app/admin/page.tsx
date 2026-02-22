import Link from "next/link";

import { ForgeFlowBoard } from "@/components/ForgeFlowBoard";
import { PipelineTerminal } from "@/components/PipelineTerminal";
import { RoleActions } from "@/components/RoleActions";
import { SignOutButton } from "@/components/SignOutButton";
import { TriggerForm } from "@/components/TriggerForm";
import { ManualApprovalForm } from "@/components/ManualApprovalForm";
import { canReadPipelineLogs } from "@/lib/auth/rbac";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AppRole } from "@/types/database";
import type { PipelineLog } from "@/types/pipeline";

export default async function AdminPage() {
  const supabase = await createSupabaseServerClient();

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

  const { data: logs } = await supabase
    .from("pipeline_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(180);

  const typedLogs = (logs ?? []) as PipelineLog[];
  const uniquePipelines = new Set(typedLogs.map((log) => log.pipeline_id));
  const statusCounts = typedLogs.reduce<Record<string, number>>((acc, log) => {
    acc[log.status] = (acc[log.status] ?? 0) + 1;
    return acc;
  }, {});
  const latestLog = typedLogs[0] ?? null;

  return (
    <section className="console-page">
      <section className="surface console-hero">
        <div className="console-hero-copy">
          <p className="eyebrow">운영 관제</p>
          <h1 className="hero-title">Studio Console</h1>
          <p className="section-subtitle">
            ForgeFlow 멀티에이전트 파이프라인을 실행·승인·관찰하는 운영 대시보드입니다.
          </p>
          <p className="muted-text">권한: {validatedRole} · {user.email ?? user.id}</p>
        </div>
        <div className="console-hero-actions">
          <Link className="button button-ghost" href="/">
            포털 홈 보기
          </Link>
          <SignOutButton />
        </div>
      </section>

      <section className="console-kpis">
        <article className="surface kpi-card">
          <p className="eyebrow">파이프라인</p>
          <h3>{uniquePipelines.size}</h3>
          <p className="kpi-desc">최근 로그에서 관측된 실행 수</p>
        </article>
        <article className="surface kpi-card">
          <p className="eyebrow">실행중 로그</p>
          <h3>{statusCounts.running ?? 0}</h3>
          <p className="kpi-desc">실시간 처리 중 이벤트 수</p>
        </article>
        <article className="surface kpi-card">
          <p className="eyebrow">성공 로그</p>
          <h3>{statusCounts.success ?? 0}</h3>
          <p className="kpi-desc">성공 이벤트 누적(현재 조회 범위)</p>
        </article>
        <article className="surface kpi-card">
          <p className="eyebrow">최근 업데이트</p>
          <h3>{latestLog ? new Date(latestLog.created_at).toLocaleTimeString() : "-"}</h3>
          <p className="kpi-desc">{latestLog ? `${latestLog.stage} / ${latestLog.agent_name}` : "아직 로그 없음"}</p>
        </article>
      </section>

      <ForgeFlowBoard initialLogs={typedLogs} />

      <section className="console-grid">
        <TriggerForm />
        <ManualApprovalForm />
      </section>

      <RoleActions role={validatedRole} />
      <PipelineTerminal initialLogs={typedLogs} />
    </section>
  );
}
