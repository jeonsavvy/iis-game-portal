import type { Metadata } from "next";
import { Fraunces, Noto_Sans_KR } from "next/font/google";

import { GlobalNav } from "@/components/layout/global-nav";
import { PageShell } from "@/components/layout/page-shell";
import { PageTransition } from "@/components/layout/page-transition";
import { SurfaceBackdrop } from "@/components/layout/surface-backdrop";

import "./globals.css";

const displayFont = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", weight: ["500", "600"] });
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
  title: "IIS Game Studio",
  description: "에디토리얼 아케이드와 스튜디오 콘솔을 하나로 묶은 IIS Game Studio 포털",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" className="dark">
      <body className={`${displayFont.variable} ${bodyFont.variable}`}>
        <SurfaceBackdrop />
        <GlobalNav />
        <PageShell>
          <PageTransition>{children}</PageTransition>
        </PageShell>
        <footer className="px-4 pb-10 pt-4 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-[var(--shell-width)] flex-col gap-2 rounded-[1.7rem] border border-white/8 bg-black/20 px-5 py-5 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <p>IIS Game Studio · Editorial Arcade</p>
            <p>Generated play surfaces, curated with restraint.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
