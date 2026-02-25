"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type AdminGameRow = {
  id: string;
  slug: string;
  name: string;
  genre: string;
  status: string;
  created_at: string;
};

type Props = {
  initialGames: AdminGameRow[];
  readOnly?: boolean;
};

type DeleteResponse = {
  status?: string;
  slug?: string;
  deleted?: Record<string, boolean>;
  reason?: string;
  details?: Record<string, unknown>;
  detail?: Record<string, unknown> | string;
  error?: string;
};

function resolveDeleteErrorMessage(data: DeleteResponse): string {
  const nestedDetail =
    data.detail && typeof data.detail === "object"
      ? (data.detail as Record<string, unknown>)
      : data.details && typeof data.details === "object"
        ? (data.details as Record<string, unknown>)
        : null;

  const fromNested =
    (nestedDetail && typeof nestedDetail.reason === "string" && nestedDetail.reason) ||
    (nestedDetail && typeof nestedDetail.error === "string" && nestedDetail.error) ||
    (typeof data.detail === "string" ? data.detail : null);

  return data.error ?? data.reason ?? fromNested ?? "unknown_error";
}

export function GameAdminPanel({ initialGames, readOnly = false }: Props) {
  const router = useRouter();
  const [games, setGames] = useState(initialGames);
  const [selectedId, setSelectedId] = useState<string>(initialGames[0]?.id ?? "");
  const [confirmSlug, setConfirmSlug] = useState("");
  const [confirmChecked, setConfirmChecked] = useState(false);
  const [resultMessage, setResultMessage] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  const selectedGame = useMemo(() => games.find((game) => game.id === selectedId) ?? null, [games, selectedId]);

  async function handleDelete() {
    if (readOnly) {
      setResultMessage("프리뷰 모드에서는 실제 삭제를 수행하지 않습니다.");
      return;
    }

    if (!selectedGame) {
      setResultMessage("삭제할 게임을 먼저 선택하세요.");
      return;
    }
    if (confirmSlug.trim() !== selectedGame.slug) {
      setResultMessage("슬러그 확인값이 일치하지 않습니다.");
      return;
    }
    if (!confirmChecked) {
      setResultMessage("영구 삭제 확인 체크를 먼저 선택하세요.");
      return;
    }

    setResultMessage("삭제 요청 전송 중...");

    try {
      const response = await fetch("/api/games/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameId: selectedGame.id, confirmSlug: confirmSlug.trim() }),
      });

      const raw = await response.text();
      let data: DeleteResponse = {};
      try {
        data = raw ? (JSON.parse(raw) as DeleteResponse) : {};
      } catch {
        data = { error: raw || "응답 파싱 실패" };
      }

      if (!response.ok) {
        setResultMessage(`삭제 실패 (${response.status}): ${resolveDeleteErrorMessage(data)}`);
        return;
      }

      const deletedSummary = data.deleted
        ? `DB:${data.deleted.db ? "Y" : "N"} · Storage:${data.deleted.storage ? "Y" : "N"} · Archive:${data.deleted.archive ? "Y" : "N"}`
        : "삭제 결과 요약 없음";
      setResultMessage(`삭제 완료: ${selectedGame.slug} (${deletedSummary})`);

      const nextGames = games.filter((game) => game.id !== selectedGame.id);
      setGames(nextGames);
      setSelectedId(nextGames[0]?.id ?? "");
      setConfirmSlug("");
      setConfirmChecked(false);
      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      setResultMessage(`삭제 실패: ${error instanceof Error ? error.message : "unknown_error"}`);
    }
  }

  const canDelete = Boolean(selectedGame && confirmSlug.trim() === selectedGame.slug && confirmChecked && !isPending);

  return (
    <section className="surface ops-danger-shell">
      <div className="section-head compact">
        <div>
          <p className="eyebrow">Danger Zone</p>
          <h3 className="section-title">완전 삭제 (DB · 스토리지 · 아카이브)</h3>
        </div>
        <p className="section-subtitle">운영 로그는 보존하고, 선택한 게임 산출물만 완전 제거합니다.</p>
      </div>

      {readOnly ? (
        <div className="danger-note" role="status">
          <p>프리뷰 모드: 이 화면은 위험 액션 UX 점검용이며 실제 삭제 요청은 차단됩니다.</p>
        </div>
      ) : null}

      <div className="ops-danger-grid">
        <div className="surface inset-card game-admin-list-card">
          <div className="game-admin-list-head">
            <h4 className="subsection-title">삭제 대상 선택</h4>
            <span className="muted-text">{games.length}개</span>
          </div>
          {games.length === 0 ? (
            <p className="muted-text">삭제 가능한 게임이 없습니다.</p>
          ) : (
            <div className="game-admin-list" role="list">
              {games.map((game) => (
                <button
                  key={game.id}
                  type="button"
                  className={`game-admin-row ${selectedId === game.id ? "is-selected" : ""}`}
                  onClick={() => {
                    setSelectedId(game.id);
                    setConfirmSlug("");
                    setConfirmChecked(false);
                    setResultMessage("");
                  }}
                >
                  <div className="game-admin-row-main">
                    <strong>{game.name}</strong>
                    <span>{game.slug}</span>
                  </div>
                  <div className="game-admin-row-meta">
                    <span>{game.genre}</span>
                    <span>{new Date(game.created_at).toLocaleString("ko-KR")}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="surface inset-card game-admin-delete-card">
          <h4 className="subsection-title">삭제 확인 (되돌릴 수 없음)</h4>

          {selectedGame ? (
            <>
              <div className="danger-note">
                <p>
                  <strong>선택 게임:</strong> {selectedGame.name}
                </p>
                <p>
                  <strong>슬러그:</strong> {selectedGame.slug}
                </p>
                <p>이 작업은 게임 산출물(DB/스토리지/아카이브)을 영구 삭제합니다.</p>
              </div>

              <label className="field">
                <span>
                  1) 확인을 위해 슬러그 입력: <strong>{selectedGame.slug}</strong>
                </span>
                <input
                  className="input"
                  value={confirmSlug}
                  onChange={(event) => setConfirmSlug(event.target.value)}
                  placeholder={selectedGame.slug}
                />
              </label>

              <label className="danger-checkbox">
                <input type="checkbox" checked={confirmChecked} onChange={(event) => setConfirmChecked(event.target.checked)} />
                <span>2) 이 작업이 영구 삭제임을 이해했고, 복구 불가에 동의합니다.</span>
              </label>

              <button type="button" className="button button-danger button-block" disabled={!canDelete || readOnly} onClick={handleDelete}>
                {isPending ? "삭제 처리 중..." : "완전 삭제 실행"}
              </button>
            </>
          ) : (
            <p className="muted-text">왼쪽 목록에서 삭제할 게임을 선택하세요.</p>
          )}

          {resultMessage ? <p className="admin-result-text">{resultMessage}</p> : null}
        </div>
      </div>
    </section>
  );
}
