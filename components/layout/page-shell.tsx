import * as React from "react";

import { cn } from "@/lib/utils";

export function PageShell({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <main className={cn("mx-auto min-h-[calc(100dvh-5.5rem)] w-full max-w-[var(--shell-width)] px-4 pb-16 pt-4 sm:px-6 sm:pt-5 lg:px-8", className)}>
      {children}
    </main>
  );
}
