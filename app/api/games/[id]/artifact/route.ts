import { NextResponse } from "next/server";

import { ensureArtifactSecurityHeaders, ensureNoStoreHeaders } from "@/lib/api/response-headers";
import { proxyArtifactResponse, resolveArtifactTarget } from "@/lib/games/artifact-proxy";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const target = await resolveArtifactTarget(id, "index.html");
  if (target instanceof NextResponse) {
    return ensureArtifactSecurityHeaders(ensureNoStoreHeaders(target));
  }
  const response = await proxyArtifactResponse(target);
  return ensureArtifactSecurityHeaders(ensureNoStoreHeaders(response));
}
