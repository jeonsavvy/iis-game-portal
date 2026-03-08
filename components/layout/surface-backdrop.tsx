"use client";

export function SurfaceBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(251,247,236,0.98) 0%, rgba(248,243,230,0.96) 100%)",
        }}
      />
      <div className="absolute inset-0 opacity-35 [background-image:linear-gradient(rgba(27,19,55,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(27,19,55,0.035)_1px,transparent_1px)] [background-size:42px_42px]" />
      <div className="absolute left-[8%] top-[14rem] h-32 w-32 rounded-full bg-[#ffb287]/12 blur-[72px]" />
      <div className="absolute right-[10%] top-[18rem] h-40 w-40 rounded-full bg-[#b8e8f1]/12 blur-[88px]" />
      <div className="absolute bottom-[10%] left-[45%] h-44 w-44 rounded-full bg-[#ffd7bf]/12 blur-[96px]" />
    </div>
  );
}
