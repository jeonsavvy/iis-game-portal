"use client";

import { RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <Card className="mx-auto grid max-w-3xl gap-4 rounded-[2rem] border-red-400/20 bg-red-400/10 p-8">
      <h2 className="font-display text-4xl tracking-[-0.05em] text-foreground">문제가 발생했습니다</h2>
      <p className="text-sm leading-7 text-red-50/90">{error.message}</p>
      <Button type="button" onClick={reset} className="w-fit">
        <RotateCcw className="size-4" />
        다시 시도
      </Button>
    </Card>
  );
}
