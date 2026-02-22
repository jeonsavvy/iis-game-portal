import type { Metadata } from "next";
import Link from "next/link";

import "./globals.css";

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
        <div className="app-bg-orb orb-a" aria-hidden="true" />
        <div className="app-bg-orb orb-b" aria-hidden="true" />
        <div className="app-grid" aria-hidden="true" />
        <nav className="topbar">
          <div className="brand-block">
            <strong>IIS Arcade</strong>
            <span>생성형 게임 스튜디오 아카이브</span>
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
              <span className="donation-disabled nav-link">💖 후원하기 (PayPal 준비 중)</span>
            )}
          </div>
        </nav>
        <main className="main-shell">{children}</main>
      </body>
    </html>
  );
}
