import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";

type AccessStateCardProps = {
  title: string;
  message: string;
  detail?: string | null;
  actions?: ReactNode;
};

export function AccessStateCard({ title, message, detail, actions }: AccessStateCardProps) {
  return (
    <Card className="mx-auto grid max-w-3xl gap-5 p-6 sm:p-8">
      <div className="grid gap-2">
        <h1 className="text-4xl font-semibold tracking-[-0.05em] text-foreground">{title}</h1>
        <p className="text-sm leading-7 text-muted-foreground">{message}</p>
        {detail ? <p className="text-sm leading-6 text-muted-foreground">{detail}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
    </Card>
  );
}
