"use client";

import { usePathname } from "next/navigation";

function resolveSurface(pathname: string) {
  if (pathname.startsWith("/editor")) return "editor";
  if (pathname.startsWith("/admin")) return "admin";
  if (pathname.startsWith("/play")) return "play";
  return "arcade";
}

export function SurfaceBackdrop() {
  const pathname = usePathname() ?? "/";
  const surface = resolveSurface(pathname);

  const accent =
    surface === "admin"
      ? "from-[#5f6fa8]/16 via-transparent to-[#b4935e]/12"
      : surface === "editor"
        ? "from-[#33489c]/16 via-transparent to-[#8c6d45]/10"
        : surface === "play"
          ? "from-[#b4935e]/14 via-transparent to-[#33489c]/14"
          : "from-[#b4935e]/14 via-transparent to-[#33489c]/12";

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-editorial-grid opacity-40" />
      <div className="absolute inset-0 bg-control-noise opacity-20 mix-blend-soft-light" />
      <div className={`absolute inset-0 bg-gradient-to-br ${accent}`} />
      <div className="absolute left-[-8rem] top-16 h-72 w-72 rounded-full bg-[#b4935e]/12 blur-3xl" />
      <div className="absolute bottom-12 right-[-5rem] h-80 w-80 rounded-full bg-[#33489c]/14 blur-3xl" />
      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/20 to-transparent" />
    </div>
  );
}
