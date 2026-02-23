const CONTROL_OR_INVISIBLE_CHAR_RE = /[\u0000-\u001F\u007F\u200B-\u200D\u2060\uFEFF]/g;
const WHITESPACE_RE = /\s+/g;

export function sanitizeTriggerKeyword(value: string): string {
  if (!value) {
    return "";
  }

  const normalized = value.normalize("NFKC");
  return normalized.replace(CONTROL_OR_INVISIBLE_CHAR_RE, "").replace(WHITESPACE_RE, " ").trim();
}

