import * as React from "react";

import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[120px] w-full rounded-[1rem] border border-zinc-200 bg-white px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/80 transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:border-primary",
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
