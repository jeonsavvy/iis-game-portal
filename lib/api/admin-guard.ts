import { NextResponse } from "next/server";

import { canAccessWorkspace, canManageAdmin } from "@/lib/auth/rbac";
import { jsonError } from "@/lib/api/error-response";
import { validateTrustedWriteOrigin } from "@/lib/api/request-origin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AppRole } from "@/types/database";

export type StaffPermission = "workspace:write" | "workspace:read" | "admin:write" | "admin:read";

export type AdminGuardContext = {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  userId: string;
  role: AppRole | null;
};

type AdminGuardReadOptions = {
  errorHeaders?: HeadersInit;
};

type AdminGuardWriteOptions = {
  request: Request;
  errorHeaders?: HeadersInit;
};

function canAccess(permission: StaffPermission, role: AppRole | null): boolean {
  if (permission === "workspace:write" || permission === "workspace:read") {
    return canAccessWorkspace(role);
  }
  return canManageAdmin(role);
}

export async function withAdminGuard(
  permission: "workspace:write" | "admin:write",
  options: AdminGuardWriteOptions,
): Promise<AdminGuardContext | NextResponse>;
export async function withAdminGuard(
  permission: "workspace:read" | "admin:read",
  options?: AdminGuardReadOptions,
): Promise<AdminGuardContext | NextResponse>;
export async function withAdminGuard(
  permission: StaffPermission,
  options?: AdminGuardReadOptions | AdminGuardWriteOptions,
): Promise<AdminGuardContext | NextResponse> {
  if (permission === "workspace:write" || permission === "admin:write") {
    const request = (options as AdminGuardWriteOptions | undefined)?.request;
    if (!request) {
      return jsonError({
        status: 400,
        error: "Request context is required",
        code: "request_context_missing",
        headers: options?.errorHeaders,
      });
    }

    const originValidation = validateTrustedWriteOrigin(request);
    if (!originValidation.ok) {
      return jsonError({
        status: 403,
        error: "Forbidden origin",
        code: originValidation.code,
        headers: options?.errorHeaders,
      });
    }
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return jsonError({ status: 401, error: "Unauthorized", code: "unauthorized", headers: options?.errorHeaders });
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const role = ((profile as { role?: AppRole } | null)?.role ?? null) as AppRole | null;

  if (!canAccess(permission, role)) {
    return jsonError({ status: 403, error: "Forbidden", code: "forbidden", headers: options?.errorHeaders });
  }

  return { supabase, userId: user.id, role };
}
