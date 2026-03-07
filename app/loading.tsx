import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <section className="grid gap-5">
      <div className="rounded-[2rem] border border-white/8 bg-[#111118]/82 p-6">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="mt-5 h-14 w-2/3" />
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
