import type { Metadata } from "next";
import { Noto_Sans_KR } from "next/font/google";

import { GlobalNav } from "@/components/layout/global-nav";
import { PageShell } from "@/components/layout/page-shell";
import { PageTransition } from "@/components/layout/page-transition";
import { SurfaceBackdrop } from "@/components/layout/surface-backdrop";

import "./globals.css";

const bodyFont = Noto_Sans_KR({ subsets: ["latin"], variable: "--font-noto-sans-kr", weight: ["400", "500", "700"] });

function resolveMetadataBase(rawUrl: string | undefined): URL | undefined {
  const candidate = rawUrl?.trim() || (process.env.NODE_ENV === "production" ? "" : "http://localhost:3000");
  if (!candidate) return undefined;

  try {
    const parsedUrl = new URL(candidate);
    if (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") return undefined;
    return parsedUrl;
  } catch {
    return undefined;
  }
}

export const metadata: Metadata = {
  metadataBase: resolveMetadataBase(process.env.NEXT_PUBLIC_SITE_URL),
  title: "iis | AI 게임 제작·플레이 플랫폼",
  description: "AI로 게임을 만들고, 바로 플레이하고, 인기 게임을 탐색하는 iis 플랫폼",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" className="dark">
      <body className={bodyFont.variable}>
        <SurfaceBackdrop />
        <GlobalNav />
        <PageShell>
          <PageTransition>{children}</PageTransition>
        </PageShell>
        <footer className="px-4 pb-10 pt-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[var(--shell-width)] rounded-[1.2rem] border border-white/8 bg-black/20 px-5 py-4 text-sm text-muted-foreground">
            © iis
          </div>
        </footer>
      </body>
    </html>
  );
}
