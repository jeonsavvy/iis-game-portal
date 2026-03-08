import { AlertTriangle, Info, LoaderCircle } from "lucide-react";

export function EditorStatusBanners({ error, isRestoring, restoreWarning, onDismissError, onDismissRestoreWarning }: { error: string | null; isRestoring: boolean; restoreWarning: string | null; onDismissError: () => void; onDismissRestoreWarning: () => void; }) {
  return (
    <div className="grid gap-3">
      {error ? (
        <Banner icon={<AlertTriangle className="size-4" />} tone="error" onDismiss={onDismissError}>{error}</Banner>
      ) : null}
      {isRestoring ? (
        <Banner icon={<LoaderCircle className="size-4 animate-spin" />} tone="info">세션 상태를 복원하는 중입니다...</Banner>
      ) : null}
      {restoreWarning && !error ? (
        <Banner icon={<Info className="size-4" />} tone="warning" onDismiss={onDismissRestoreWarning}>{restoreWarning}</Banner>
      ) : null}
    </div>
  );
}

function Banner({ children, icon, tone, onDismiss }: { children: string; icon: React.ReactNode; tone: "error" | "warning" | "info"; onDismiss?: () => void; }) {
  const styles = tone === "error" ? "border-red-200 bg-red-50 text-red-700" : tone === "warning" ? "border-amber-200 bg-amber-50 text-amber-700" : "border-cyan-200 bg-cyan-50 text-cyan-700";
  return (
    <div className={`flex items-start justify-between gap-3 rounded-[1.4rem] border px-4 py-3 text-sm leading-6 ${styles}`}>
      <div className="flex items-start gap-3">
        <span className="mt-1">{icon}</span>
        <p>{children}</p>
      </div>
      {onDismiss ? <button type="button" onClick={onDismiss} className="cursor-pointer text-xs uppercase tracking-[0.18em]">닫기</button> : null}
    </div>
  );
}
