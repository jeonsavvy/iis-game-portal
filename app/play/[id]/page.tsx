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
                <dt>상태</dt>
                <dd>플레이 가능</dd>
              </div>
            </dl>
          </section>

          <section className="surface side-card">
            <p className="eyebrow">에이전트 리뷰</p>
            <h2 className="section-title">AI 게임 디자이너 코멘트</h2>
            <ul className="bullet-list">
              <li>사용자가 제시한 키워드를 분석하여 핵심적인 플레이 경험을 추출했습니다.</li>
              <li>난이도 곡선과 스코어링 시스템을 조정하여 아케이드 특유의 몰입감을 극대화했습니다.</li>
              <li>시각적 테마는 게임의 장르에 맞춰 최적화된 하이브리드 엔진 설정을 사용했습니다.</li>
            </ul>
          </section>
        </aside>
      </div>
    </section>
  );
}
