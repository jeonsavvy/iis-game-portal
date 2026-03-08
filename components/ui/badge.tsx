import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[11px] font-semibold",
  {
    variants: {
      variant: {
        default: "border-[#1b1337]/10 bg-white/82 text-foreground/90",
        secondary: "border-[#1b1337]/10 bg-white/72 text-muted-foreground",
        accent: "border-[#11d7ff]/20 bg-[#dffbff] text-[#005a6a]",
        success: "border-emerald-200 bg-emerald-50 text-emerald-700",
        warning: "border-amber-200 bg-amber-50 text-amber-700",
        destructive: "border-red-200 bg-red-50 text-red-700",
        outline: "border-[#1b1337]/12 bg-white/92 text-foreground/90",
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
