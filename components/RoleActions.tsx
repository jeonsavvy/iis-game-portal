import type { AppRole } from "@/types/database";

export function RoleActions({ role }: { role: AppRole }) {
  return (
    <section className="card admin-actions">
      <h3>마스터 관리자 제어</h3>
      <p>단일 운영자 모드가 활성화되어 있습니다. ({role})</p>
      <button className="button" disabled type="button">
        실패 파이프라인 재실행 (예정)
      </button>
      <button className="button" disabled type="button">
        연동 키 교체 (예정)
      </button>
    </section>
  );
}
