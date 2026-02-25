import { NextResponse } from "next/server";

import { canInsertAdminConfig, canReadPipelineLogs } from "@/lib/auth/rbac";
import { jsonError } from "@/lib/api/error-response";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AppRole } from "@/types/database";

type AdminPermission = "pipeline:write" | "pipeline:read";

type AdminGuardContext = {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  userId: string;
  role: AppRole | null;
};

function canAccess(permission: AdminPermission, role: AppRole | null): boolean {
  if (permission === "pipeline:write") {
    return canInsertAdminConfig(role);
  }
  return canReadPipelineLogs(role);
}

export async function withAdminGuard(
  permission: AdminPermission,
  options?: { errorHeaders?: HeadersInit },
): Promise<AdminGuardContext | NextResponse> {
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
