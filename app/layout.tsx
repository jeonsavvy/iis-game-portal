import type { Metadata } from "next";
import Link from "next/link";

import "./globals.css";
import { SurfaceBackdrop } from "@/components/SurfaceBackdrop";

function resolveMetadataBase(rawUrl: string | undefined): URL | undefined {
  const candidate = rawUrl?.trim() || (process.env.NODE_ENV === "production" ? "" : "http://localhost:3000");
  if (!candidate) {
    return undefined;
  }

  try {
    const parsedUrl = new URL(candidate);
    if (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") {
      return undefined;
    }
    return parsedUrl;
  } catch {
    return undefined;
  }
}

export const metadata: Metadata = {
  metadataBase: resolveMetadataBase(process.env.NEXT_PUBLIC_SITE_URL),
  title: "IIS Game Studio",
  description: "AI 게임 에디터 & 아케이드",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>
        <SurfaceBackdrop />
        <nav className="topbar">
          <div className="brand-block">
            <strong>IIS Arcade</strong>
          </div>
          <div className="nav-links">
            <Link className="nav-link" href="/">
              홈
            </Link>
            <Link className="nav-link" href="/editor">
              🛠️ 에디터
            </Link>
            <Link className="nav-link" href="/admin">
              운영실
            </Link>
          </div>
        </nav>
        <main className="main-shell">{children}</main>
        <footer style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)", fontSize: "0.875rem" }}>
          © iis
        </footer>
      </body>
    </html>
  );
}
