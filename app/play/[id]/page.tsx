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
  const proxiedArtifactUrl = `/api/games/${typedGame.id}/artifact`;

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
            <span className="muted-text">ForgeFlow Publish URL</span>
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
              <div>
                <dt>원본 URL</dt>
                <dd title={typedGame.url} style={{ wordBreak: "break-all" }}>
                  {typedGame.url}
                </dd>
              </div>
            </dl>
          </section>

          <section className="surface side-card">
            <p className="eyebrow">제작 메모</p>
            <h2 className="section-title">생성 파이프라인 요약</h2>
            <ul className="bullet-list">
              <li>ForgeFlow 멀티에이전트 파이프라인으로 생성된 웹게임 결과물</li>
              <li>Studio Console에서 트리거/승인/로그 기반 운영 추적 가능</li>
              <li>Supabase 카탈로그/스토리지 + Archive 레포 동기화 구조</li>
            </ul>
          </section>
        </aside>
      </div>
    </section>
  );
}
