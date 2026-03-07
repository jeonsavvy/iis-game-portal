import * as React from "react";

import { cn } from "@/lib/utils";

export function PageShell({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("mx-auto w-full max-w-[var(--shell-width)] px-4 pb-16 pt-6 sm:px-6 lg:px-8", className)}>{children}</div>;
}
