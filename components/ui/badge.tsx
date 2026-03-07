import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]",
  {
    variants: {
      variant: {
        default: "bg-white/8 text-foreground/90",
        secondary: "bg-white/5 text-muted-foreground",
        accent: "bg-accent text-accent-foreground",
        success: "bg-emerald-400/15 text-emerald-200",
        warning: "bg-amber-400/15 text-amber-200",
        destructive: "bg-red-500/15 text-red-200",
        outline: "border border-white/10 text-foreground/90",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
