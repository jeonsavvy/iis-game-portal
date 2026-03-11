import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { jsonError } from "@/lib/api/error-response";
import { validateTrustedWriteOrigin } from "@/lib/api/request-origin";
import { canUseStaffLogin, normalizeNextPath, normalizeStaffEmail } from "@/lib/auth/admin-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database";
import type { AppRole } from "@/types/database";

function buildCallbackUrl(request: Request, nextPath: string): string {
  const url = new URL("/auth/callback", request.url);
  url.searchParams.set("next", nextPath);
  return url.toString();
}

function createSupabaseOtpClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  return createClient<Database>(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function POST(request: Request) {
  const originValidation = validateTrustedWriteOrigin(request);
  if (!originValidation.ok) {
    return jsonError({ status: 403, error: "Forbidden origin", code: originValidation.code });
  }

  try {
    const body = await request.json() as { email?: string; nextPath?: string };
    const email = normalizeStaffEmail(body.email);
    const nextPath = normalizeNextPath(body.nextPath, "/workspace");

    if (!email) {
      return jsonError({ status: 400, error: "Email is required", code: "invalid_email" });
    }

    const supabaseAdmin = createSupabaseAdminClient();
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("email", email)
      .maybeSingle();

    if (profileError) {
      return jsonError({ status: 502, error: "Profile lookup failed", detail: profileError.message, code: "profile_lookup_failed" });
    }

    const role = ((profile as { role?: AppRole } | null)?.role ?? null) as AppRole | null;
    if (!canUseStaffLogin(role)) {
      return jsonError({
        status: 403,
        error: "승인되지 않은 계정입니다. 관리자 승인 후 다시 시도해주세요.",
        code: "forbidden",
      });
    }

    const supabase = createSupabaseOtpClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: buildCallbackUrl(request, nextPath),
      },
    });

    if (error) {
      return jsonError({ status: 502, error: "Login link unavailable", detail: error.message, code: "login_link_unavailable" });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "unknown_error";
    if (/Missing NEXT_PUBLIC_SUPABASE_URL|Missing NEXT_PUBLIC_SUPABASE_ANON_KEY|Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY/.test(detail)) {
      return jsonError({ status: 503, error: "Login config unavailable", detail, code: "config" });
    }
    return jsonError({ status: 502, error: "Login request unavailable", detail, code: "login_request_unavailable" });
  }
}
