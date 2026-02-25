import type { Metadata } from "next";
import Link from "next/link";

import "./globals.css";
import { SurfaceBackdrop } from "@/components/SurfaceBackdrop";

export const metadata: Metadata = {
  title: "IIS Arcade",
  description: "Infinite Indie Studio 게임 포털",
};

const PAYPAL_ALLOWED_HOSTS = ["paypal.com", "paypal.me"];

function toSafeDonationUrl(rawUrl: string | undefined, allowedHosts: string[]): string | null {
  if (!rawUrl) {
    return null;
  }

  try {
    const url = new URL(rawUrl);
    const host = url.hostname.toLowerCase();
    const isAllowed = allowedHosts.some((allowedHost) => host === allowedHost || host.endsWith(`.${allowedHost}`));
    if (!isAllowed || url.protocol !== "https:") {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const paypalDonationUrl = toSafeDonationUrl(process.env.NEXT_PUBLIC_PAYPAL_DONATION_URL, PAYPAL_ALLOWED_HOSTS);

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
            <Link className="nav-link" href="/admin">
              스튜디오 콘솔
            </Link>
            {paypalDonationUrl ? (
              <a className="donation-link nav-link support" href={paypalDonationUrl} target="_blank" rel="noreferrer">
                💖 후원하기
              </a>
            ) : (
              <span className="nav-link support donation-disabled">💖 후원 준비중</span>
            )}
          </div>
        </nav>
        <main className="main-shell">{children}</main>
        <footer style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)", fontSize: "0.875rem" }}>
          © iis. All Rights Reserved.
        </footer>
      </body>
    </html>
  );
}
