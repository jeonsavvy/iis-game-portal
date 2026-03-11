// 제작 작업공간 진입점입니다.
// 인증과 역할 검사를 이 레벨에서 끝내고, 통과한 사용자만 편집 UI를 보게 합니다.

import Link from "next/link";

import { AccessStateCard } from "@/components/auth/access-state-card";
import { EditorWorkspace } from "@/components/editor/EditorWorkspace";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getAccessDeniedCopy, getLoginRequiredCopy } from "@/lib/auth/access-feedback";
import { canAccessWorkspace } from "@/lib/auth/rbac";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AppRole } from "@/types/database";

type WorkspaceSearchParams = {
  prompt?: string;
};

export default async function WorkspacePage({ searchParams }: { searchParams?: Promise<WorkspaceSearchParams> }) {
  const params = searchParams ? await searchParams : {};
  const initialPrompt = typeof params.prompt === "string" ? params.prompt.trim() : "";
  const previewMode = process.env.IIS_DEMO_PREVIEW === "1";
  if (previewMode) {
    return <EditorWorkspace initialPrompt={initialPrompt} accountEmail={null} />;
  }

  let supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  try {
    supabase = await createSupabaseServerClient();
  } catch (error) {
    return (
      <Card className="grid gap-4 p-6">
        <h1 className="text-4xl font-semibold tracking-[-0.05em] text-foreground">내 작업공간</h1>
        <p className="text-sm leading-7 text-muted-foreground">Supabase 구성이 올바르지 않아 작업공간을 열 수 없습니다.</p>
        <p className="text-sm text-red-600">{error instanceof Error ? error.message : "unknown_error"}</p>
      </Card>
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    const loginCopy = getLoginRequiredCopy("/workspace");
    return (
      <AccessStateCard
        title="내 작업공간"
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
  if (!canAccessWorkspace(role)) {
    const deniedCopy = getAccessDeniedCopy(user.email ?? user.id);
    return (
      <AccessStateCard
        title="내 작업공간"
        message={deniedCopy.message}
        detail={deniedCopy.detail}
        actions={(
          <Button asChild className="w-fit" variant="outline">
            <Link href={deniedCopy.primaryHref}>{deniedCopy.primaryCtaLabel}</Link>
          </Button>
        )}
      />
    );
  }

  return <EditorWorkspace initialPrompt={initialPrompt} accountEmail={user.email ?? null} />;
}
