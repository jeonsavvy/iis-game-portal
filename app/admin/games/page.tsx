import Link from "next/link";

import { GameAdminPanel } from "@/components/GameAdminPanel";
import { AccessStateCard } from "@/components/auth/access-state-card";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getAccessDeniedCopy, getLoginRequiredCopy } from "@/lib/auth/access-feedback";
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
          <Button asChild variant="ghost" className="px-0 text-muted-foreground shadow-none">
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
      <Card className="grid gap-4 p-6">
        <h1 className="text-4xl font-semibold tracking-[-0.05em] text-foreground">게임 관리</h1>
        <p className="text-sm leading-7 text-muted-foreground">Supabase 구성이 올바르지 않아 게임 관리 화면을 불러오지 못했습니다.</p>
        <p className="text-sm text-red-600">{error instanceof Error ? error.message : "unknown_error"}</p>
      </Card>
    );
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    const loginCopy = getLoginRequiredCopy("/admin/games");
    return (
      <AccessStateCard
        title="게임 관리"
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
  if (!isMasterAdmin(role)) {
    const deniedCopy = getAccessDeniedCopy(user.email ?? user.id);
    return (
      <AccessStateCard
        title="게임 관리"
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
        <Button asChild variant="ghost" className="px-0 text-muted-foreground shadow-none">
          <Link href="/admin">운영실 홈</Link>
        </Button>
      </div>
      <GameAdminPanel initialGames={initialGames} />
    </section>
  );
}
