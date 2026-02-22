import { notFound } from "next/navigation";
import Link from "next/link";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export default async function PlayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: game } = await supabase.from("games_metadata").select("*").eq("id", id).single();
  if (!game) {
    notFound();
  }

  const typedGame = game as unknown as Database["public"]["Tables"]["games_metadata"]["Row"];

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
          <a className="button button-primary" href={typedGame.url} target="_blank" rel="noreferrer">
            새 탭에서 열기
          </a>
        </div>
      </div>

      <div className="play-layout">
        <div className="surface game-stage-shell">
          <div className="game-stage-topbar">
            <span className="status-chip tone-success">게시됨</span>
            <span className="muted-text">ForgeFlow Publish URL</span>
          </div>
          <div className="game-frame-wrap">
            <iframe
              src={typedGame.url}
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
            <h2 className="section-title">게임 상세</h2>
            <dl className="meta-list">
              <div>
                <dt>게임명</dt>
                <dd>{typedGame.name}</dd>
              </div>
              <div>
                <dt>장르</dt>
                <dd>{typedGame.genre}</dd>
              </div>
              <div>
                <dt>슬러그</dt>
                <dd>{typedGame.slug}</dd>
              </div>
              <div>
                <dt>상태</dt>
                <dd>{typedGame.status}</dd>
              </div>
            </dl>
          </section>

          <section className="surface side-card">
            <p className="eyebrow">스튜디오 메모</p>
            <h2 className="section-title">포트폴리오 포인트</h2>
            <ul className="bullet-list">
              <li>AI 멀티에이전트 파이프라인으로 생성된 웹게임 결과물을 즉시 배포/플레이</li>
              <li>Studio Console에서 트리거/수동 승인/실시간 로그 기반 운영</li>
              <li>Supabase 기반 카탈로그/저장소/권한 구조 연동</li>
            </ul>
          </section>

          <section className="surface side-card">
            <p className="eyebrow">후원</p>
            <h2 className="section-title">프로젝트 응원하기</h2>
            <p className="section-subtitle">상단 GNB의 PayPal 후원 링크를 통해 프로젝트를 응원할 수 있습니다.</p>
          </section>
        </aside>
      </div>
    </section>
  );
}
