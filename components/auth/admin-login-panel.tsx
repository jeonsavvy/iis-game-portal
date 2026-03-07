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
    <Card className="mx-auto w-full max-w-2xl rounded-[2rem] border-white/10 bg-[#111118]/90">
      <CardHeader className="space-y-4 border-b border-white/6 pb-6">
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-accent">Studio Console</p>
          <CardTitle className="text-4xl tracking-[-0.05em]">{title}</CardTitle>
        </div>
        <p className="max-w-xl text-sm leading-7 text-muted-foreground">{description}</p>
        {meta ? <div className="rounded-[1.35rem] border border-white/8 bg-white/[0.03] px-4 py-3 text-sm leading-6 text-muted-foreground">{meta}</div> : null}
      </CardHeader>
      <CardContent className="pt-6">{children}</CardContent>
    </Card>
  );
}
