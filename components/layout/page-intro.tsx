import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function PageIntro({
  kicker,
  title,
  description,
  actions,
  className,
}: {
  kicker?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between", className)}>
      <div className="max-w-3xl space-y-4">
        {kicker ? <Badge variant="outline" className="w-fit text-[10px] text-accent">{kicker}</Badge> : null}
        <div className="space-y-3">
          <h1 className="font-display text-4xl leading-none tracking-[-0.05em] text-balance text-foreground sm:text-5xl lg:text-6xl">{title}</h1>
          {description ? <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">{description}</p> : null}
        </div>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
    </div>
  );
}
