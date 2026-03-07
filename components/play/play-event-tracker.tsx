"use client";

import { useEffect } from "react";

export function PlayEventTracker({ slug }: { slug: string }) {
  useEffect(() => {
    void fetch(`/api/games/${encodeURIComponent(slug)}/play-event`, {
      method: "POST",
      cache: "no-store",
    }).catch(() => undefined);
  }, [slug]);

  return null;
}
