import Link from "next/link";

import { SignOutButton } from "@/components/SignOutButton";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { isMasterAdmin } from "@/lib/auth/rbac";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AppRole } from "@/types/database";

function AdminHub({ previewMode }: { previewMode: boolean }) {
  const sections = [
    {
      href: "/admin/sessions",
      title: "세션 운영 보기",
      description: "생성 세션 상태, 이벤트 타임라인, 퍼블리시 승인 흐름을 확인합니다.",
    },
    {
      href: "/admin/games",
      title: "게임 관리 보기",
      description: "공개 게임 목록과 위험 작업(삭제)을 분리된 화면에서 관리합니다.",
    },
  ];

  return (
    <section className="grid gap-5">
      <div className="flex justify-end">{previewMode ? null : <SignOutButton />}</div>
      <Card data-admin-surface="hub" className="p-6 sm:p-8">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-[-0.05em] text-foreground">운영실</h1>
          <p className="text-sm text-muted-foreground">세션 운영과 게임 관리를 여기서 나눠서 봅니다.</p>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {sections.map((section, index) => (
            <Card key={section.href} data-admin-surface={`hub-section-${index + 1}`} className="border-zinc-200 p-5 shadow-none">
              <h2 className="text-[1.3rem] font-semibold tracking-[-0.03em] text-foreground">{section.title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{section.description}</p>
              <Button asChild className="mt-5 rounded-lg">
                <Link href={section.href}>{section.title}</Link>
              </Button>
            </Card>
          ))}
        </div>
      </Card>
    </section>
  );
}

export default async function AdminPage() {
  const previewMode = process.env.IIS_DEMO_PREVIEW === "1";
  if (previewMode) {
    return <AdminHub previewMode />;
  }

  let supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  try {
    supabase = await createSupabaseServerClient();
  } catch (error) {
    return (
      <Card className="grid gap-4 p-6">
        <h1 className="text-4xl font-bold tracking-[-0.05em] text-foreground">운영실</h1>
        <p className="text-sm leading-7 text-muted-foreground">Supabase 구성이 올바르지 않아 운영실을 불러오지 못했습니다.</p>
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
        <h1 className="text-4xl font-bold tracking-[-0.05em] text-foreground">운영실</h1>
        <p className="text-sm leading-7 text-muted-foreground">운영실 접근에는 로그인 필요합니다.</p>
        <Button asChild className="w-fit">
          <Link href="/login?next=/admin">로그인 페이지로 이동</Link>
        </Button>
      </Card>
    );
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const role = ((profile as { role?: AppRole } | null)?.role ?? null) as AppRole | null;
  if (!isMasterAdmin(role)) {
    return (
      <Card className="grid gap-4 p-6">
        <h1 className="text-4xl font-bold tracking-[-0.05em] text-foreground">운영실</h1>
        <p className="text-sm leading-7 text-muted-foreground">master_admin 권한이 필요합니다. (현재 로그인: {user.email ?? user.id})</p>
        <div>
          <SignOutButton />
        </div>
      </Card>
    );
  }

  return <AdminHub previewMode={false} />;
}
