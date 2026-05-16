import type { NextConfig } from "next";

const remotePatterns: NonNullable<NextConfig["images"]>["remotePatterns"] = [{ protocol: "https", hostname: "images.unsplash.com" }];

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (supabaseUrl) {
  try {
    const hostname = new URL(supabaseUrl).hostname;
    if (!remotePatterns.some((pattern) => pattern.hostname === hostname)) {
      remotePatterns.push({ protocol: "https", hostname });
    }
  } catch {
    // ignore malformed NEXT_PUBLIC_SUPABASE_URL and keep static image hosts
  }
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
