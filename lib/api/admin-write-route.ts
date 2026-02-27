import { NextResponse } from "next/server";

import { withAdminGuard, type AdminGuardContext } from "@/lib/api/admin-guard";
import { ensureNoStoreHeaders } from "@/lib/api/response-headers";
import { coreEngineUnavailableError, jsonError } from "@/lib/api/error-response";

type AdminWriteHandler = (auth: AdminGuardContext) => Promise<NextResponse>;

export async function runAdminWriteRoute(request: Request, handler: AdminWriteHandler): Promise<NextResponse> {
  try {
    const auth = await withAdminGuard("pipeline:write", { request });
    if (auth instanceof NextResponse) {
      return ensureNoStoreHeaders(auth);
    }
    const response = await handler(auth);
    return ensureNoStoreHeaders(response);
  } catch (error) {
    if (error instanceof SyntaxError) {
      const response = jsonError({
        status: 400,
        error: "Invalid JSON body",
        code: "invalid_json_body",
      });
      return ensureNoStoreHeaders(response);
    }
    const response = coreEngineUnavailableError(error);
    return ensureNoStoreHeaders(response);
  }
}
