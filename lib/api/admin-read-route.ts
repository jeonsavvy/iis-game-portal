import { NextResponse } from "next/server";

import { withAdminGuard, type AdminGuardContext, type StaffPermission } from "@/lib/api/admin-guard";
import { ensureNoStoreHeaders } from "@/lib/api/response-headers";
import { coreEngineUnavailableError } from "@/lib/api/error-response";

type AdminReadHandler = (auth: AdminGuardContext) => Promise<NextResponse>;

type AdminReadRouteOptions = {
  errorHeaders?: HeadersInit;
  permission?: Extract<StaffPermission, "workspace:read" | "admin:read">;
};

export async function runAdminReadRoute(
  handler: AdminReadHandler,
  options: AdminReadRouteOptions = {},
): Promise<NextResponse> {
  try {
    const auth = await withAdminGuard(options.permission ?? "workspace:read", { errorHeaders: options.errorHeaders });
    if (auth instanceof NextResponse) {
      return ensureNoStoreHeaders(auth);
    }
    const response = await handler(auth);
    return ensureNoStoreHeaders(response);
  } catch (error) {
    const response = coreEngineUnavailableError(error, options.errorHeaders);
    return ensureNoStoreHeaders(response);
  }
}
