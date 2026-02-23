import Link from "next/link";

import { ForgeFlowBoard } from "@/components/ForgeFlowBoard";
import { GameAdminPanel } from "@/components/GameAdminPanel";
import { PipelineTerminal } from "@/components/PipelineTerminal";
import { TokenCostKPI } from "@/components/TokenCostKPI";
// RoleActions removed
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
  const { data: recentGames } = await supabase
    .from("games_metadata")
    .select("id,name,slug,genre,status,created_at")
    .order("created_at", { ascending: false })
    .limit(30);
  const uniquePipelines = new Set(typedLogs.map((log) => log.pipeline_id));
  const statusCounts = typedLogs.reduce<Record<string, number>>((acc, log) => {
    acc[log.status] = (acc[log.status] ?? 0) + 1;
    return acc;
  }, {});
  const latestLog = typedLogs[0] ?? null;

  const tokenStats = {
    flashPromptTokens: 0,
    flashCompletionTokens: 0,
    proPromptTokens: 0,
    proCompletionTokens: 0,
  };

  for (const log of typedLogs) {
    if (log.metadata && typeof log.metadata === "object" && "usage" in log.metadata) {
      const usage = log.metadata.usage as {
        prompt_tokens?: number;
        completion_tokens?: number;
      };
      // Simple heuristic based on model names, you could also track this explicitly
      const model = (log.metadata as { model?: string }).model ?? "";
      if (model.includes("flash")) {
        tokenStats.flashPromptTokens += usage.prompt_tokens ?? 0;
        tokenStats.flashCompletionTokens += usage.completion_tokens ?? 0;
      } else if (model.includes("pro")) {
        tokenStats.proPromptTokens += usage.prompt_tokens ?? 0;
        tokenStats.proCompletionTokens += usage.completion_tokens ?? 0;
      }
    }
  }

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

      <ForgeFlowBoard initialLogs={typedLogs} />

      <section className="console-grid">
        <TriggerForm />
        <ManualApprovalForm />
      </section>

      <TokenCostKPI stats={tokenStats} />

      <GameAdminPanel
        initialGames={
          ((recentGames ?? []) as Array<{
            id: string;
            name: string;
            slug: string;
            genre: string;
            status: string;
            created_at: string;
          }>)
        }
      />
      {/* RoleActions removed */}
      <PipelineTerminal initialLogs={typedLogs} />
    </section>
  );
}
