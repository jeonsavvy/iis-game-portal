import { NextResponse } from "next/server";

import { proxyArtifactResponse, resolveArtifactTarget } from "@/lib/games/artifact-proxy";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const target = await resolveArtifactTarget(id, "index.html");
  if (target instanceof NextResponse) {
    return target;
  }
  return proxyArtifactResponse(target);
}
