"use client";

import { useEffect, useId, useState } from "react";

import type { AgentIcon } from "@/components/studio-control-deck/config";

export function AgentGlyph({ icon, tone, active }: { icon: AgentIcon; tone: string; active: boolean }) {
  const uid = useId().replace(/:/g, "");
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReducedMotion(media.matches);
    apply();
    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", apply);
      return () => media.removeEventListener("change", apply);
    }
    media.addListener(apply);
    return () => media.removeListener(apply);
  }, []);

  const labelMap: Record<AgentIcon, string> = {
    scout: "입",
    intel: "설",
    stylist: "연",
    builder: "제",
    sentinel: "검",
    publisher: "배",
    echo: "보",
  };

  const accentMap: Record<string, { start: string; end: string }> = {
    running: { start: "#22d3ee", end: "#2563eb" },
    success: { start: "#34d399", end: "#15803d" },
    error: { start: "#fb7185", end: "#be123c" },
    warn: { start: "#fbbf24", end: "#d97706" },
    idle: { start: "#7dd3fc", end: "#1e40af" },
  };
  const accent = accentMap[tone] ?? accentMap.idle;
  const gradientId = `glyph-grad-${uid}`;

  return (
    <svg className={`agent-glyph tone-${tone}${active ? " is-active" : ""}`} viewBox="0 0 80 80" aria-hidden="true" role="img">
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={accent.start} />
          <stop offset="100%" stopColor={accent.end} />
        </linearGradient>
      </defs>
      <rect x="8" y="8" width="64" height="64" rx="20" fill="rgba(15, 23, 42, 0.88)" stroke="rgba(148, 163, 184, 0.35)" />
      <circle cx="40" cy="40" r="24" fill={`url(#${gradientId})`} opacity="0.92" />
      <circle cx="40" cy="40" r="19" fill="rgba(3, 8, 16, 0.34)" />
      {active && !reducedMotion ? (
        <circle cx="40" cy="40" r="28" fill="none" stroke={accent.start} strokeWidth="2" opacity="0.42">
          <animate attributeName="r" values="26;31;26" dur="1.8s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.42;0.15;0.42" dur="1.8s" repeatCount="indefinite" />
        </circle>
      ) : null}
      <text x="40" y="47" textAnchor="middle" fill="#f8fafc" fontSize="20" fontWeight="700">
        {labelMap[icon]}
      </text>
    </svg>
  );
}
