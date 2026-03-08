import Link from "next/link";

import { EditorWorkspace } from "@/components/editor/EditorWorkspace";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
    return <EditorWorkspace initialPrompt={initialPrompt} />;
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
    return (
      <Card className="grid gap-4 p-6">
        <h1 className="text-4xl font-semibold tracking-[-0.05em] text-foreground">내 작업공간</h1>
        <p className="text-sm leading-7 text-muted-foreground">작업공간은 로그인 후 사용할 수 있습니다.</p>
        <Button asChild className="w-fit">
          <Link href="/login?next=/workspace">로그인하고 계속하기</Link>
        </Button>
      </Card>
    );
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const role = ((profile as { role?: AppRole } | null)?.role ?? null) as AppRole | null;
  if (!canAccessWorkspace(role)) {
    return (
      <Card className="grid gap-4 p-6">
        <h1 className="text-4xl font-semibold tracking-[-0.05em] text-foreground">내 작업공간</h1>
        <p className="text-sm leading-7 text-muted-foreground">현재는 승인된 제작자와 운영자만 작업공간을 사용할 수 있습니다.</p>
        <Button asChild className="w-fit" variant="outline">
          <Link href="/create">AI로 게임 만들기 안내 보기</Link>
        </Button>
      </Card>
    );
  }

  return <EditorWorkspace initialPrompt={initialPrompt} />;
}
