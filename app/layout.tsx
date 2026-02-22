import type { Metadata } from "next";
import Link from "next/link";

import "./globals.css";

export const metadata: Metadata = {
  title: "IIS Arcade",
  description: "Infinite Indie Studio game portal",
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
        <nav className="nav">
          <strong>IIS Arcade</strong>
          <div className="nav-links">
            <Link href="/">Home</Link>
            <Link href="/admin">Studio Console</Link>
            {paypalDonationUrl ? (
              <a className="donation-link" href={paypalDonationUrl} target="_blank" rel="noreferrer">
                💖 후원하기
              </a>
            ) : (
              <span className="donation-disabled">💖 후원하기 (PayPal 준비중)</span>
            )}
          </div>
        </nav>
        <main>{children}</main>
      </body>
    </html>
  );
}
