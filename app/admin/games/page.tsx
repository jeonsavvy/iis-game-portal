import Link from "next/link";

import { GameAdminPanel } from "@/components/GameAdminPanel";
import { SignOutButton } from "@/components/SignOutButton";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PREVIEW_GAMES } from "@/lib/demo/preview-data";
import { isMasterAdmin } from "@/lib/auth/rbac";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AppRole } from "@/types/database";

export default async function AdminGamesPage() {
  const previewMode = process.env.IIS_DEMO_PREVIEW === "1";
  if (previewMode) {
    return (
      <section className="grid gap-5">
        <div className="flex justify-between gap-3">
          <Button asChild variant="outline">
            <Link href="/admin">운영실 홈</Link>
          </Button>
        </div>
        <GameAdminPanel
          initialGames={PREVIEW_GAMES.map((game) => ({
            id: game.id,
            slug: game.slug,
            name: game.name,
            genre: game.genre_primary ?? game.genre,
            status: game.status,
            created_at: game.created_at,
          }))}
          readOnly
        />
      </section>
    );
  }

  let supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  try {
    supabase = await createSupabaseServerClient();
  } catch (error) {
    return (
      <Card className="grid gap-4 rounded-[1.85rem] border-white/8 bg-[#111118]/86 p-6">
        <h1 className="text-4xl font-bold tracking-[-0.05em] text-foreground">게임 관리</h1>
        <p className="text-sm leading-7 text-muted-foreground">Supabase 구성이 올바르지 않아 게임 관리 화면을 불러오지 못했습니다.</p>
        <p className="text-sm text-red-100">{error instanceof Error ? error.message : "unknown_error"}</p>
      </Card>
    );
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return (
      <Card className="grid gap-4 rounded-[1.85rem] border-white/8 bg-[#111118]/86 p-6">
        <h1 className="text-4xl font-bold tracking-[-0.05em] text-foreground">게임 관리</h1>
        <p className="text-sm leading-7 text-muted-foreground">운영실 접근에는 로그인 필요합니다.</p>
        <Button asChild className="w-fit"><Link href="/login?next=/admin/games">로그인 페이지로 이동</Link></Button>
      </Card>
    );
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const role = ((profile as { role?: AppRole } | null)?.role ?? null) as AppRole | null;
  if (!isMasterAdmin(role)) {
    return (
      <Card className="grid gap-4 rounded-[1.85rem] border-white/8 bg-[#111118]/86 p-6">
        <h1 className="text-4xl font-bold tracking-[-0.05em] text-foreground">게임 관리</h1>
        <p className="text-sm leading-7 text-muted-foreground">master_admin 권한이 필요합니다. (현재 로그인: {user.email ?? user.id})</p>
        <div><SignOutButton /></div>
      </Card>
    );
  }

  const { data } = await supabase
    .from("games_metadata")
    .select("id,slug,name,genre,genre_primary,status,created_at")
    .order("created_at", { ascending: false });

  const games = (data ?? []) as Array<{
    id: string;
    slug: string;
    name: string;
    genre: string;
    genre_primary: string | null;
    status: string;
    created_at: string;
  }>;

  const initialGames = games.map((game) => ({
    id: String(game.id),
    slug: String(game.slug),
    name: String(game.name),
    genre: String(game.genre_primary ?? game.genre),
    status: String(game.status),
    created_at: String(game.created_at),
  }));

  return (
    <section className="grid gap-5">
      <div className="flex justify-between gap-3">
        <Button asChild variant="outline">
          <Link href="/admin">운영실 홈</Link>
        </Button>
        <SignOutButton />
      </div>
      <GameAdminPanel initialGames={initialGames} />
    </section>
  );
}
