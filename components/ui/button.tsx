import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full border text-sm font-medium transition-[color,background-color,border-color,box-shadow,transform] duration-200 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 min-h-11 px-5 cursor-pointer active:translate-y-px",
  {
    variants: {
      variant: {
        default:
          "border-[#1b1337]/10 bg-primary text-primary-foreground shadow-[0_16px_30px_rgba(255,90,31,0.28)] hover:bg-primary/92",
        secondary: "border-[#1b1337]/10 bg-secondary text-secondary-foreground hover:bg-secondary/90",
        outline:
          "border-[#1b1337]/12 bg-white/78 text-foreground shadow-[0_10px_24px_rgba(27,19,55,0.06)] hover:border-[#1b1337]/18 hover:bg-white",
        ghost: "border-transparent text-muted-foreground hover:bg-white/68 hover:text-foreground",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
      },
      size: {
        default: "h-11 px-5 py-2",
        sm: "h-9 px-4 text-xs",
        lg: "h-12 px-6 text-base",
        icon: "size-11 rounded-full px-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button };
