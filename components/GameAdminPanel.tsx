"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

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
  warnings?: Array<{ code?: string; detail?: string }>;
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

  const nestedDetails = nestedDetail?.details;
  const nestedDetailsRecord = nestedDetails && typeof nestedDetails === "object" ? (nestedDetails as Record<string, unknown>) : null;
  const archive = nestedDetailsRecord?.archive;
  const archiveRecord = archive && typeof archive === "object" ? (archive as Record<string, unknown>) : null;
  const archiveReason = typeof archiveRecord?.reason === "string" ? archiveRecord.reason : null;

  const fromNested =
    archiveReason ||
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
      const warningText =
        data.warnings && data.warnings.length > 0
          ? ` · 경고 ${data.warnings.length}건(${data.warnings.map((item) => item.code ?? "warning").join(", ")})`
          : "";
      setResultMessage(`삭제 완료: ${selectedGame.slug} (${deletedSummary})${warningText}`);

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
    <section className="grid gap-5">
      <Card data-admin-surface="games-header" className="p-6 sm:p-8">
        <div className="space-y-3">
          <h1 className="text-4xl font-bold tracking-[-0.05em] text-foreground">게임 관리</h1>
          <p className="text-sm text-muted-foreground">공개된 게임을 확인하고, 필요할 때만 위험 작업을 실행합니다.</p>
        </div>
      </Card>

      {readOnly ? (
        <Card className="rounded-[1rem] border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-700">
          프리뷰 모드에서는 실제 삭제가 차단되며 UI만 검토할 수 있습니다.
        </Card>
      ) : null}

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <Card data-admin-surface="games-list" className="p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-[1.4rem] font-semibold tracking-[-0.03em] text-foreground">삭제 대상 선택</h2>
              <p className="mt-2 text-sm text-muted-foreground">현재 등록된 게임 중 삭제할 대상을 선택하세요.</p>
            </div>
            <span className="text-sm text-muted-foreground">{games.length}개</span>
          </div>

          {games.length === 0 ? (
            <p className="rounded-[1rem] border border-dashed border-zinc-200 px-4 py-5 text-sm text-muted-foreground">삭제 가능한 게임이 없습니다.</p>
          ) : (
            <div className="grid gap-3">
              {games.map((game) => {
                const active = selectedId === game.id;
                return (
                  <button
                    key={game.id}
                    type="button"
                    onClick={() => {
                      setSelectedId(game.id);
                      setConfirmSlug("");
                      setConfirmChecked(false);
                      setResultMessage("");
                    }}
                    className={`rounded-[1rem] border px-4 py-4 text-left transition ${active ? "border-red-200 bg-red-50" : "border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50"}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-foreground">{game.name}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{game.slug}</p>
                      </div>
                      <span className="text-xs text-muted-foreground">{game.status}</span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span>{game.genre}</span>
                      <span>·</span>
                      <span>{new Date(game.created_at).toLocaleString("ko-KR", { hour12: false })}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </Card>

        <Card data-admin-surface="games-delete" className="p-5">
          <h2 className="text-[1.4rem] font-semibold tracking-[-0.03em] text-foreground">삭제 확인 (되돌릴 수 없음)</h2>

          {selectedGame ? (
            <div className="mt-4 grid gap-4">
              <div className="rounded-[1rem] border border-red-200 bg-red-50 px-4 py-4 text-sm leading-7 text-red-700">
                <p><strong>선택 게임:</strong> {selectedGame.name}</p>
                <p><strong>슬러그:</strong> {selectedGame.slug}</p>
                <p>이 작업은 게임 산출물(DB · 스토리지 · 아카이브)을 영구 삭제합니다.</p>
              </div>

              <label className="grid gap-2 text-sm text-muted-foreground">
                <span>1) 확인을 위해 슬러그를 다시 입력하세요.</span>
                <Input value={confirmSlug} onChange={(event) => setConfirmSlug(event.target.value)} placeholder={selectedGame.slug} />
              </label>

              <label className="flex items-start gap-3 rounded-[1rem] border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-muted-foreground">
                <input type="checkbox" checked={confirmChecked} onChange={(event) => setConfirmChecked(event.target.checked)} className="mt-1" />
                <span>2) 영구 삭제이며 복구할 수 없다는 점을 이해했습니다.</span>
              </label>

              <Button type="button" variant="destructive" disabled={!canDelete || readOnly} onClick={handleDelete}>
                {isPending ? "삭제 처리 중..." : "완전 삭제 실행"}
              </Button>
            </div>
          ) : (
            <p className="mt-4 rounded-[1rem] border border-dashed border-zinc-200 px-4 py-5 text-sm text-muted-foreground">왼쪽 목록에서 삭제할 게임을 선택하세요.</p>
          )}

          {resultMessage ? <p className="mt-4 text-sm leading-7 text-muted-foreground">{resultMessage}</p> : null}
        </Card>
      </section>
    </section>
  );
}
