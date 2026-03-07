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
      <Card className="rounded-[1.5rem] border-white/10 bg-[#111118]/90 p-6 sm:p-8">
        <div className="space-y-3">
          <h1 className="text-4xl font-bold tracking-[-0.05em] text-foreground">운영실</h1>
          <p className="text-sm leading-7 text-muted-foreground">공개 서비스와 분리된 운영 허브입니다. 세션 운영과 게임 관리를 각각의 화면으로 나누었습니다.</p>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {sections.map((section) => (
            <Card key={section.href} className="rounded-[1.2rem] border-white/8 bg-white/[0.03] p-5">
              <h2 className="text-[1.4rem] font-bold tracking-[-0.04em] text-foreground">{section.title}</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">{section.description}</p>
              <Button asChild className="mt-5">
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
      <Card className="grid gap-4 rounded-[1.85rem] border-white/8 bg-[#111118]/86 p-6">
        <h1 className="text-4xl font-bold tracking-[-0.05em] text-foreground">운영실</h1>
        <p className="text-sm leading-7 text-muted-foreground">Supabase 구성이 올바르지 않아 운영실을 불러오지 못했습니다.</p>
        <p className="text-sm text-red-100">{error instanceof Error ? error.message : "unknown_error"}</p>
      </Card>
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return (
      <Card className="grid gap-4 rounded-[1.85rem] border-white/8 bg-[#111118]/86 p-6">
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
      <Card className="grid gap-4 rounded-[1.85rem] border-white/8 bg-[#111118]/86 p-6">
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
