const STATIC_OPTIMIZED_HOSTS = new Set(["images.unsplash.com"]);

function getSupabaseHostname(): string | null {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!raw) {
    return null;
  }
  try {
    const url = new URL(raw);
    return url.hostname.toLowerCase();
  } catch {
    return null;
  }
}

function isOptimizableHttpImage(src: string): boolean {
  try {
    const url = new URL(src);
    if (!["http:", "https:"].includes(url.protocol)) {
      return false;
    }
    const hostname = url.hostname.toLowerCase();
    const supabaseHostname = getSupabaseHostname();
    if (supabaseHostname && hostname === supabaseHostname) {
      return true;
    }
    return STATIC_OPTIMIZED_HOSTS.has(hostname);
  } catch {
    return false;
  }
}

export function shouldUseUnoptimizedImage(src: string): boolean {
  const normalized = src.trim().toLowerCase();
  if (!normalized) {
    return true;
  }

  if (normalized.startsWith("data:") || normalized.startsWith("blob:")) {
    return true;
  }

  if (normalized.startsWith("/")) {
    return normalized.endsWith(".svg");
  }

  return !isOptimizableHttpImage(src);
}
