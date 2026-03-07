import { NextResponse } from "next/server";

import { withAdminGuard, type AdminGuardContext, type StaffPermission } from "@/lib/api/admin-guard";
import { ensureNoStoreHeaders } from "@/lib/api/response-headers";
import { coreEngineUnavailableError, jsonError } from "@/lib/api/error-response";

type AdminWriteHandler = (auth: AdminGuardContext) => Promise<NextResponse>;

type AdminWriteRouteOptions = {
  permission?: Extract<StaffPermission, "workspace:write" | "admin:write">;
};

export async function runAdminWriteRoute(request: Request, handler: AdminWriteHandler, options: AdminWriteRouteOptions = {}): Promise<NextResponse> {
  try {
    const auth = await withAdminGuard(options.permission ?? "workspace:write", { request });
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
