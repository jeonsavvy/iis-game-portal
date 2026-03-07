import Link from "next/link";

import { SessionObservatory } from "@/components/admin/SessionObservatory";
import { SignOutButton } from "@/components/SignOutButton";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { isMasterAdmin } from "@/lib/auth/rbac";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AppRole } from "@/types/database";

export default async function AdminSessionsPage() {
  const previewMode = process.env.IIS_DEMO_PREVIEW === "1";
  if (previewMode) {
    return (
      <section className="grid gap-5">
        <div className="flex justify-between gap-3">
          <Button asChild variant="outline">
            <Link href="/admin">운영실 홈</Link>
          </Button>
        </div>
        <SessionObservatory previewMode />
      </section>
    );
  }

  let supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  try {
    supabase = await createSupabaseServerClient();
  } catch (error) {
    return (
      <Card className="grid gap-4 p-6">
        <h1 className="text-4xl font-bold tracking-[-0.05em] text-foreground">세션 운영실</h1>
        <p className="text-sm leading-7 text-muted-foreground">Supabase 구성이 올바르지 않아 세션 운영실을 불러오지 못했습니다.</p>
        <p className="text-sm text-red-600">{error instanceof Error ? error.message : "unknown_error"}</p>
      </Card>
    );
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return (
      <Card className="grid gap-4 p-6">
        <h1 className="text-4xl font-bold tracking-[-0.05em] text-foreground">세션 운영실</h1>
        <p className="text-sm leading-7 text-muted-foreground">운영실 접근에는 로그인 필요합니다.</p>
        <Button asChild className="w-fit"><Link href="/login?next=/admin/sessions">로그인 페이지로 이동</Link></Button>
      </Card>
    );
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const role = ((profile as { role?: AppRole } | null)?.role ?? null) as AppRole | null;
  if (!isMasterAdmin(role)) {
    return (
      <Card className="grid gap-4 p-6">
        <h1 className="text-4xl font-bold tracking-[-0.05em] text-foreground">세션 운영실</h1>
        <p className="text-sm leading-7 text-muted-foreground">master_admin 권한이 필요합니다. (현재 로그인: {user.email ?? user.id})</p>
        <div><SignOutButton /></div>
      </Card>
    );
  }

  return (
    <section className="grid gap-5">
      <div className="flex justify-between gap-3">
        <Button asChild variant="outline" className="rounded-lg">
          <Link href="/admin">운영실 홈</Link>
        </Button>
        <SignOutButton />
      </div>
      <SessionObservatory />
    </section>
  );
}
