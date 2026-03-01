"use client";

import Image from "next/image";

import type { AgentIcon } from "@/components/studio-control-deck/config";

const ICON_SRC: Record<AgentIcon, string> = {
  analyzer: "/assets/agents/analyzer.svg",
  planner: "/assets/agents/planner.svg",
  designer: "/assets/agents/designer.svg",
  developer: "/assets/agents/developer.svg",
  qaRuntime: "/assets/agents/qa-runtime.svg",
  qaQuality: "/assets/agents/qa-quality.svg",
  releaser: "/assets/agents/releaser.svg",
  reporter: "/assets/agents/reporter.svg",
};

export function AgentGlyph({ icon, tone, active }: { icon: AgentIcon; tone: string; active: boolean }) {
  return (
    <span className={`agent-glyph agent-glyph-shell tone-${tone}${active ? " is-active" : ""}`}>
      <Image
        className="agent-glyph-image"
        src={ICON_SRC[icon]}
        alt=""
        width={48}
        height={48}
        aria-hidden="true"
        priority={false}
      />
    </span>
  );
}
