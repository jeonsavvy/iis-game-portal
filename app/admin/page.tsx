import Link from "next/link";

import { SessionObservatory } from "@/components/admin/SessionObservatory";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SignOutButton } from "@/components/SignOutButton";
import { isMasterAdmin } from "@/lib/auth/rbac";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AppRole } from "@/types/database";

export default async function AdminPage() {
  const previewMode = process.env.IIS_DEMO_PREVIEW === "1";
  if (previewMode) {
    return <SessionObservatory previewMode />;
  }

  let supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  try {
    supabase = await createSupabaseServerClient();
  } catch (error) {
    return (
      <Card className="grid gap-4 rounded-[1.85rem] border-white/8 bg-[#111118]/86 p-6">
        <h1 className="font-display text-4xl tracking-[-0.05em] text-foreground">운영실</h1>
        <p className="text-sm leading-7 text-muted-foreground">Supabase 구성이 올바르지 않아 운영실을 불러오지 못했습니다.</p>
        <p className="text-sm text-red-100">{error instanceof Error ? error.message : "unknown_error"}</p>
      </Card>
    );
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return (
      <Card className="grid gap-4 rounded-[1.85rem] border-white/8 bg-[#111118]/86 p-6">
        <h1 className="font-display text-4xl tracking-[-0.05em] text-foreground">운영실</h1>
        <p className="text-sm leading-7 text-muted-foreground">운영실 접근에는 로그인 필요합니다.</p>
        <Button asChild className="w-fit"><Link href="/login?next=/admin">로그인 페이지로 이동</Link></Button>
      </Card>
    );
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const role = ((profile as { role?: AppRole } | null)?.role ?? null) as AppRole | null;
  if (!isMasterAdmin(role)) {
    return (
      <Card className="grid gap-4 rounded-[1.85rem] border-white/8 bg-[#111118]/86 p-6">
        <h1 className="font-display text-4xl tracking-[-0.05em] text-foreground">운영실</h1>
        <p className="text-sm leading-7 text-muted-foreground">master_admin 권한이 필요합니다. (현재 로그인: {user.email ?? user.id})</p>
        <div><SignOutButton /></div>
      </Card>
    );
  }

  return (
    <section className="grid gap-5">
      <div className="flex justify-end"><SignOutButton /></div>
      <SessionObservatory />
    </section>
  );
}
