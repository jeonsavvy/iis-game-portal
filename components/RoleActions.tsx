import type { AppRole } from "@/types/database";

export function RoleActions({ role }: { role: AppRole }) {
  return (
    <section className="surface admin-actions-shell">
      <div className="section-head compact">
        <div>
          <p className="eyebrow">운영 도구</p>
          <h3 className="section-title">마스터 관리자 제어</h3>
        </div>
        <p className="section-subtitle">단일 운영자 모드 활성화 ({role})</p>
      </div>

      <div className="admin-actions-grid">
        <article className="surface inset-card">
          <h4 className="subsection-title">복구 작업</h4>
          <p className="muted-text">실패 파이프라인 재실행/큐 재정렬 기능 예정</p>
          <button className="button button-ghost button-block" disabled type="button">
            실패 파이프라인 재실행 (예정)
          </button>
        </article>
        <article className="surface inset-card">
          <h4 className="subsection-title">시크릿 운영</h4>
          <p className="muted-text">연동 키 회전, 토큰 검증, 런타임 상태 점검 기능 예정</p>
          <button className="button button-ghost button-block" disabled type="button">
            연동 키 교체 (예정)
          </button>
        </article>
      </div>
    </section>
  );
}
