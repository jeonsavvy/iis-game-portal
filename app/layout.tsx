import type { Metadata } from "next";
import { Noto_Sans_KR } from "next/font/google";
import Link from "next/link";

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
  title: "iis",
  description: "브라우저에서 바로 만들고 플레이하는 포털",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body className={bodyFont.variable}>
        <SurfaceBackdrop />
        <GlobalNav />
        <PageShell>
          <PageTransition>{children}</PageTransition>
        </PageShell>
        <footer className="mx-auto flex w-full max-w-[var(--shell-width)] flex-wrap items-center justify-center gap-x-3 gap-y-2 px-4 pb-10 pt-6 text-xs text-[#4b4265] sm:px-6 lg:px-8">
          <span>© iis</span>
          <Link href="/privacy" className="font-medium underline-offset-4 transition-colors hover:text-foreground hover:underline">
            개인정보처리방침
          </Link>
        </footer>
      </body>
    </html>
  );
}
