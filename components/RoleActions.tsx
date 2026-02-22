import type { AppRole } from "@/types/database";

export function RoleActions({ role }: { role: AppRole }) {
  return (
    <section className="surface admin-actions-shell">
      <div className="section-head compact">
        <div>
          <p className="eyebrow">운영 가이드</p>
          <h3 className="section-title">마스터 관리자 작업 메모</h3>
        </div>
        <p className="section-subtitle">단일 운영자 모드 활성화 ({role})</p>
      </div>

      <div className="admin-actions-grid">
        <article className="surface inset-card">
          <h4 className="subsection-title">실패 파이프라인 대응</h4>
          <ul className="bullet-list compact">
            <li>Mission Board에서 실패 단계와 마지막 메시지 확인</li>
            <li>필요 시 QA 기준/모델 설정 점검 후 새 파이프라인 재실행</li>
            <li>긴 작업 단계는 실시간 로그 또는 폴링 보조모드로 추적</li>
          </ul>
        </article>
        <article className="surface inset-card">
          <h4 className="subsection-title">운영자 안전수칙</h4>
          <ul className="bullet-list compact">
            <li>게임 삭제는 아래 게임 운영 패널에서 슬러그 확인 후 실행</li>
            <li>코어 엔진 런타임 변경은 EC2에서 `git pull / systemctl restart` 순서 유지</li>
            <li>후원 CTA는 GNB 단일 노출 정책 유지 (중복 배치 금지)</li>
          </ul>
        </article>
      </div>
    </section>
  );
}
