import { notFound } from "next/navigation";
import Link from "next/link";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: game } = await supabase.from("games_metadata").select("*").eq("id", id).single();

  if (!game) return { title: "Game Not Found" };
  const typedGame = game as unknown as Database["public"]["Tables"]["games_metadata"]["Row"];

  const ogImage = typedGame.screenshot_url || typedGame.thumbnail_url || undefined;

  return {
    title: `${typedGame.name} - IIS Arcade`,
    description: typedGame.ai_review || `Play ${typedGame.name}, a fun ${typedGame.genre} game on IIS Arcade.`,
    openGraph: {
      title: `${typedGame.name} - IIS Arcade`,
      description: typedGame.ai_review || `Play ${typedGame.name}, a fun ${typedGame.genre} game on IIS Arcade.`,
      images: ogImage ? [ogImage] : [],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: typedGame.name,
      description: typedGame.ai_review || undefined,
      images: ogImage ? [ogImage] : [],
    }
  };
}

export default async function PlayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: game } = await supabase.from("games_metadata").select("*").eq("id", id).single();
  if (!game) {
    notFound();
  }

  const typedGame = game as unknown as Database["public"]["Tables"]["games_metadata"]["Row"];
  const proxiedArtifactUrl = `/api/games/${typedGame.id}/artifact/index.html`;

  return (
    <section className="play-page">
      <div className="play-header">
        <div>
          <p className="eyebrow">게임 플레이</p>
          <h1 className="hero-title">{typedGame.name}</h1>
          <p className="section-subtitle">
            {typedGame.genre} · {typedGame.slug} · 생성일 {new Date(typedGame.created_at).toLocaleString("ko-KR")}
          </p>
        </div>
        <div className="play-header-actions">
          <Link className="button button-ghost" href="/">
            포털로 돌아가기
          </Link>
          <a className="button button-primary" href={proxiedArtifactUrl} target="_blank" rel="noreferrer">
            새 탭에서 열기
          </a>
        </div>
      </div>

      <div className="play-layout">
        <div className="surface game-stage-shell">
          <div className="game-stage-topbar">
            <span className="status-chip tone-success">게시됨</span>
          </div>
          <div className="game-frame-wrap">
            <iframe
              src={proxiedArtifactUrl}
              title={typedGame.name}
              width="100%"
              height="100%"
              style={{ border: 0 }}
              sandbox="allow-scripts allow-same-origin allow-forms"
            />
          </div>
        </div>

        <aside className="play-side-panel">
          <section className="surface side-card">
            <p className="eyebrow">메타 정보</p>
            <dl className="meta-list">
              <div>
                <dt>게임명</dt>
                <dd>{typedGame.name}</dd>
              </div>
            </dl>
          </section>

          <section className="surface side-card">
            <p className="eyebrow">에이전트 리뷰</p>
            <h2 className="section-title">AI 게임 디자이너 코멘트</h2>
            {typedGame.ai_review ? (
              <p className="ai-review-text" style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
                {typedGame.ai_review}
              </p>
            ) : (
              <p className="muted-text">리뷰 생성 대기 중이거나 생성에 실패했습니다. 최신 파이프라인 로그를 확인해주세요.</p>
            )}
          </section>
        </aside>
      </div>
    </section>
  );
}
