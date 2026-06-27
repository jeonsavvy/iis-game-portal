"use client";

import { Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

const CONFIRMATION_TEXT = "탈퇴";

type DeleteAccountButtonProps = {
  disabledReason?: string | null;
};

type ApiErrorPayload = {
  error?: string;
  detail?: unknown;
  code?: string;
};

function readErrorMessage(payload: ApiErrorPayload | null): string {
  if (!payload) return "계정 탈퇴 처리에 실패했습니다.";
  if (typeof payload.error === "string" && payload.error.trim()) return payload.error;
  if (typeof payload.detail === "string" && payload.detail.trim()) return payload.detail;
  return "계정 탈퇴 처리에 실패했습니다.";
}

export function DeleteAccountButton({ disabledReason }: DeleteAccountButtonProps) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canDelete = confirmation === CONFIRMATION_TEXT && !loading && !disabledReason;

  const handleDelete = async () => {
    if (!canDelete) return;

    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/account", {
        method: "DELETE",
        headers: {
          "content-type": "application/json",
        },
      });
      const payload = (await response.json().catch(() => null)) as ApiErrorPayload | null;
      if (!response.ok) {
        throw new Error(readErrorMessage(payload));
      }

      await supabase.auth.signOut().catch(() => undefined);
      window.location.assign("/");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "계정 탈퇴 처리에 실패했습니다.");
      setLoading(false);
    }
  };

  return (
    <div className="basis-full sm:basis-auto">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => {
          setOpen((current) => !current);
          setConfirmation("");
          setError(null);
        }}
        disabled={Boolean(disabledReason)}
        title={disabledReason ?? undefined}
        className="text-destructive hover:text-destructive"
      >
        <Trash2 className="size-4" />
        계정 탈퇴
      </Button>
      {disabledReason ? <p className="mt-1 max-w-[18rem] text-right text-xs text-muted-foreground">{disabledReason}</p> : null}
      {open && !disabledReason ? (
        <div className="mt-2 w-full max-w-[24rem] rounded-2xl border border-destructive/20 bg-white/92 p-3 text-left shadow-[0_18px_45px_rgba(27,19,55,0.12)]">
          <p className="text-sm font-semibold text-destructive">계정 탈퇴</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            제작 세션/프롬프트 기록과 계정을 삭제합니다. 공개 게임은 유지하되 작성자 계정 연결은 제거됩니다.
            계속하려면 <span className="font-semibold text-foreground">{CONFIRMATION_TEXT}</span>를 입력하세요.
          </p>
          <input
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            placeholder={CONFIRMATION_TEXT}
            aria-label="계정 탈퇴 확인 문구"
            className="mt-3 h-9 w-full rounded-full border border-[#1b1337]/12 bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}
          <div className="mt-3 flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setOpen(false);
                setConfirmation("");
                setError(null);
              }}
              disabled={loading}
              className="flex-1"
            >
              취소
            </Button>
            <Button type="button" variant="destructive" size="sm" onClick={handleDelete} disabled={!canDelete} className="flex-1">
              {loading ? "처리 중..." : "영구 탈퇴"}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
