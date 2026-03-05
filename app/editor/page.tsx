import Link from "next/link";

import { EditorWorkspace } from "@/components/editor/EditorWorkspace";
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
      <section className="card" style={{ display: "grid", gap: 8 }}>
        <h1 style={{ margin: 0 }}>에디터</h1>
        <p style={{ margin: 0 }}>Supabase 구성이 올바르지 않아 에디터를 열 수 없습니다.</p>
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
        <h1 style={{ margin: 0 }}>에디터</h1>
        <p style={{ margin: 0 }}>관리자 로그인 후 접근 가능합니다.</p>
        <Link className="button" href="/login?next=/editor">
          로그인 페이지로 이동
        </Link>
      </section>
    );
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const role = ((profile as { role?: AppRole } | null)?.role ?? null) as AppRole | null;

  if (!isMasterAdmin(role)) {
    return (
      <section className="card" style={{ display: "grid", gap: 8 }}>
        <h1 style={{ margin: 0 }}>에디터</h1>
        <p style={{ margin: 0 }}>master_admin 권한이 필요합니다. (현재: {user.email ?? user.id})</p>
        <Link className="button" href="/admin">
          운영실로 이동
        </Link>
      </section>
    );
  }

  return <EditorWorkspace />;
}
