import Link from "next/link";

import { EditorWorkspace } from "@/components/editor/EditorWorkspace";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { isMasterAdmin } from "@/lib/auth/rbac";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AppRole } from "@/types/database";

export default async function EditorPage() {
  const previewMode = process.env.IIS_DEMO_PREVIEW === "1";
  if (previewMode) {
    return <EditorWorkspace />;
  }

  let supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  try {
    supabase = await createSupabaseServerClient();
  } catch (error) {
    return (
      <Card className="grid gap-4 rounded-[1.85rem] border-white/8 bg-[#111118]/86 p-6">
        <h1 className="font-display text-4xl tracking-[-0.05em] text-foreground">에디터</h1>
        <p className="text-sm leading-7 text-muted-foreground">Supabase 구성이 올바르지 않아 에디터를 열 수 없습니다.</p>
        <p className="text-sm text-red-100">{error instanceof Error ? error.message : "unknown_error"}</p>
      </Card>
    );
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return (
      <Card className="grid gap-4 rounded-[1.85rem] border-white/8 bg-[#111118]/86 p-6">
        <h1 className="font-display text-4xl tracking-[-0.05em] text-foreground">에디터</h1>
        <p className="text-sm leading-7 text-muted-foreground">관리자 로그인 후 접근 가능합니다.</p>
        <Button asChild className="w-fit"><Link href="/login?next=/editor">로그인 페이지로 이동</Link></Button>
      </Card>
    );
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const role = ((profile as { role?: AppRole } | null)?.role ?? null) as AppRole | null;
  if (!isMasterAdmin(role)) {
    return (
      <Card className="grid gap-4 rounded-[1.85rem] border-white/8 bg-[#111118]/86 p-6">
        <h1 className="font-display text-4xl tracking-[-0.05em] text-foreground">에디터</h1>
        <p className="text-sm leading-7 text-muted-foreground">master_admin 권한이 필요합니다. (현재: {user.email ?? user.id})</p>
        <Button asChild className="w-fit" variant="outline"><Link href="/admin">운영실로 이동</Link></Button>
      </Card>
    );
  }

  return <EditorWorkspace />;
}
