import { NextResponse } from "next/server";

import { proxyArtifactResponse, resolveArtifactTarget } from "@/lib/games/artifact-proxy";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string; asset: string[] }> },
) {
  const { id, asset } = await context.params;
  const requestedAsset = asset.join("/");
  const target = await resolveArtifactTarget(id, requestedAsset);
  if (target instanceof NextResponse) {
    return target;
  }
  return proxyArtifactResponse(target);
}
