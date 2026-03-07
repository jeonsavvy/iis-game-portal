import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

import { isAllowedStaffEmail, normalizeNextPath, parseAllowedStaffEmails } from "@/lib/auth/admin-auth";
import type { Database } from "@/types/database";

type CookieRecord = {
  name: string;
  value: string;
  options?: {
    domain?: string;
    path?: string;
    maxAge?: number;
    expires?: Date;
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: "lax" | "strict" | "none";
  };
};

function buildRedirectResponse(request: NextRequest, pathWithQuery: string): NextResponse {
  const target = new URL(pathWithQuery, request.url);
  return NextResponse.redirect(target);
}

function getSupabaseRouteClient(request: NextRequest, response: NextResponse) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: CookieRecord[]) {
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const nextPath = normalizeNextPath(request.nextUrl.searchParams.get("next"), "/admin");

  if (!code) {
    return buildRedirectResponse(request, "/login?error=missing_code");
  }

  const successResponse = buildRedirectResponse(request, nextPath);
  const supabase = getSupabaseRouteClient(request, successResponse);

  if (!supabase) {
    return buildRedirectResponse(request, "/login?error=config");
  }

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) {
    return buildRedirectResponse(request, "/login?error=exchange_failed");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const allowedEmails = parseAllowedStaffEmails(process.env.ADMIN_ALLOWED_EMAILS);
  if (!isAllowedStaffEmail(user?.email, allowedEmails)) {
    await supabase.auth.signOut();
    successResponse.headers.set("Location", new URL("/login?error=forbidden", request.url).toString());
    return successResponse;
  }

  return successResponse;
}
