import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const supabase = await createSupabaseServerClient();

  const { data: game, error } = await supabase.from("games_metadata").select("*").eq("id", id).eq("status", "active").single();
  if (error || !game) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }

  const typedGame = game as unknown as Database["public"]["Tables"]["games_metadata"]["Row"];
  let upstream: Response;
  try {
    upstream = await fetch(typedGame.url, { cache: "no-store" });
  } catch (exc) {
    return NextResponse.json({ error: `artifact_fetch_failed: ${String(exc)}` }, { status: 502 });
  }

  const body = await upstream.arrayBuffer();
  const contentType = upstream.headers.get("content-type") ?? "";
  const isHtml = contentType.includes("text/html") || typedGame.url.endsWith(".html");

  return new NextResponse(body, {
    status: upstream.status,
    headers: {
      "content-type": isHtml ? "text/html; charset=utf-8" : contentType || "application/octet-stream",
      "cache-control": "no-store",
      "x-iis-artifact-proxy": "1",
    },
  });
}
