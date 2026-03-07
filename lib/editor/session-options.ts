type SessionOption = {
  session_id: string;
  title: string;
  updated_at?: string | null;
};

function isGenericTitle(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return !normalized || normalized === "new session" || normalized.startsWith("game #");
}

function sessionSuffix(value: string): string {
  const cleaned = value.trim();
  return cleaned ? cleaned.slice(-4) : "세션";
}

export function normalizeSessionTitle(session: SessionOption): string {
  if (!isGenericTitle(session.title)) {
    return session.title;
  }
  return `새 세션 · ${sessionSuffix(session.session_id)}`;
}
