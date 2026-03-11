import * as React from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function AdminLoginPanel({
  title,
  description,
  meta,
  children,
}: {
  title: string;
  description: string;
  meta?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card className="mx-auto w-full max-w-2xl rounded-[1.25rem] border-zinc-200 bg-white">
      <CardHeader className="space-y-4 border-b border-zinc-200 pb-6">
        <div className="space-y-2">
          <CardTitle className="text-4xl tracking-[-0.05em]">{title}</CardTitle>
        </div>
        <p className="max-w-xl text-sm leading-7 text-muted-foreground">{description}</p>
        {meta ? <div className="rounded-[1rem] border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm leading-6 text-muted-foreground">{meta}</div> : null}
      </CardHeader>
      <CardContent className="pt-6">{children}</CardContent>
    </Card>
  );
}
