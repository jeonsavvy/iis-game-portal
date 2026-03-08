import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("animate-pulse rounded-[1rem] border border-white/70 bg-[linear-gradient(90deg,rgba(255,255,255,0.65),rgba(17,215,255,0.18),rgba(255,255,255,0.65))] bg-[length:180%_100%]", className)} {...props} />;
}

export { Skeleton };
