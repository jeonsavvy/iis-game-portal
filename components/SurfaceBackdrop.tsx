"use client";

import { usePathname } from "next/navigation";

function resolveSurface(pathname: string): "arcade" | "play" | "ops" {
  if (pathname.startsWith("/admin")) return "ops";
  if (pathname.startsWith("/play")) return "play";
  return "arcade";
}

export function SurfaceBackdrop() {
  const pathname = usePathname() ?? "/";
  const surface = resolveSurface(pathname);

  return (
    <div className={`app-backdrop mode-${surface}`} aria-hidden="true">
      <div className="app-bg-orb orb-a" />
      <div className="app-bg-orb orb-b" />
      <div className="app-grid" />
    </div>
  );
}
