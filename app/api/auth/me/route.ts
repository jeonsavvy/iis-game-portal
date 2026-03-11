import { NextResponse } from "next/server";

import { canAccessWorkspace, isMasterAdmin } from "@/lib/auth/rbac";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AppRole } from "@/types/database";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({
        authenticated: false,
        email: null,
        role: null,
        canAccessWorkspace: false,
        canAccessAdmin: false,
      });
    }

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    const role = ((profile as { role?: AppRole } | null)?.role ?? null) as AppRole | null;

    return NextResponse.json({
      authenticated: true,
      email: user.email ?? null,
      role,
      canAccessWorkspace: canAccessWorkspace(role),
      canAccessAdmin: isMasterAdmin(role),
    });
  } catch {
    return NextResponse.json({
      authenticated: false,
      email: null,
      role: null,
      canAccessWorkspace: false,
      canAccessAdmin: false,
    });
  }
}
