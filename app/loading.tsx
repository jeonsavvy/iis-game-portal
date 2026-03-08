import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <section className="grid gap-5">
      <div className="rounded-[2rem] border border-[#1b1337]/10 bg-white/78 p-6 shadow-[var(--shadow-panel)] backdrop-blur-sm">
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full border border-[#1b1337]/10 bg-[#fff4a8] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7a4b00]">
            loading
          </span>
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="mt-5 h-16 w-2/3 rounded-[1.5rem]" />
        <Skeleton className="mt-4 h-6 w-full" />
        <Skeleton className="mt-2 h-6 w-5/6" />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-48 rounded-[1.75rem]" />
        <Skeleton className="h-48 rounded-[1.75rem]" />
        <Skeleton className="h-48 rounded-[1.75rem]" />
      </div>
    </section>
  );
}
