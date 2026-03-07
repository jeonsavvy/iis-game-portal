import * as React from "react";

export function PlayStageShell({ stage, rail }: { stage: React.ReactNode; rail: React.ReactNode }) {
  return <section className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.6fr)]">{stage}{rail}</section>;
}
