import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function hasSupabaseAuthCookie(request: NextRequest): boolean {
  const cookieNames = request.cookies.getAll().map((cookie) => cookie.name);
  return cookieNames.some(
    (name) =>
      (name.startsWith("sb-") && name.endsWith("-auth-token")) ||
      name.includes("supabase-auth-token") ||
      name.includes("sb-access-token"),
  );
}

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/admin") && !hasSupabaseAuthCookie(request)) {
    const redirectUrl = request.nextUrl.clone();
    const nextPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;
    redirectUrl.pathname = "/login";
    redirectUrl.search = "";
    redirectUrl.searchParams.set("next", nextPath);
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
