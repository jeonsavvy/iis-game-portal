"use client";

export function SurfaceBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at top left, rgba(255,111,58,0.2), transparent 22%), radial-gradient(circle at top right, rgba(17,215,255,0.18), transparent 22%), radial-gradient(circle at bottom center, rgba(255,77,166,0.18), transparent 26%)",
        }}
      />
      <div className="absolute inset-0 opacity-50 [background-image:linear-gradient(rgba(27,19,55,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(27,19,55,0.04)_1px,transparent_1px)] [background-size:42px_42px]" />
      <div className="absolute left-[6%] top-[7rem] h-32 w-32 rounded-full border border-white/70 bg-[#ff5a1f]/18 blur-2xl" />
      <div className="absolute right-[8%] top-[12rem] h-36 w-36 rounded-full border border-white/70 bg-[#11d7ff]/18 blur-2xl" />
      <div className="absolute bottom-[8%] left-[45%] h-40 w-40 rounded-full border border-white/70 bg-[#ff4da6]/14 blur-3xl" />
      <div className="absolute inset-x-0 top-0 h-24 bg-[linear-gradient(180deg,rgba(255,255,255,0.82),rgba(255,255,255,0))]" />
    </div>
  );
}
