"use client";

import { useEffect, useId, useState } from "react";

import type { AgentIcon } from "@/components/studio-control-deck/config";

const ROLE_COLORS: Record<
  AgentIcon,
  {
    start: string;
    end: string;
  }
> = {
  scout: { start: "#38bdf8", end: "#2563eb" },
  intel: { start: "#a78bfa", end: "#6d28d9" },
  stylist: { start: "#f9a8d4", end: "#db2777" },
  builder: { start: "#fb7185", end: "#be123c" },
  sentinel: { start: "#34d399", end: "#15803d" },
  publisher: { start: "#fbbf24", end: "#d97706" },
  echo: { start: "#7dd3fc", end: "#0ea5e9" },
};

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

  const colors = ROLE_COLORS[icon];
  const gradientId = `agent-${uid}-grad`;
  const pulseColor =
    tone === "error" ? "#fb7185" : tone === "warn" ? "#fbbf24" : tone === "success" ? "#34d399" : "#38bdf8";

  return (
    <svg className={`agent-glyph tone-${tone}${active ? " is-active" : ""}`} viewBox="0 0 80 80" aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={colors.start} />
          <stop offset="100%" stopColor={colors.end} />
        </linearGradient>
      </defs>

      <rect x="6" y="8" width="68" height="64" rx="18" fill="rgba(8, 15, 30, 0.88)" stroke="rgba(148, 163, 184, 0.32)" />

      {active && !reducedMotion ? (
        <circle cx="40" cy="40" r="29" fill="none" stroke={pulseColor} strokeWidth="2" opacity="0.4">
          <animate attributeName="r" values="26;30;26" dur="1.8s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.42;0.15;0.42" dur="1.8s" repeatCount="indefinite" />
        </circle>
      ) : null}

      <ellipse cx="40" cy="40" rx="21" ry="17" fill={`url(#${gradientId})`} />
      <ellipse cx="40" cy="55" rx="15" ry="8" fill="rgba(148, 163, 184, 0.22)" />

      <circle cx="34.5" cy="38.5" r="2.2" fill="#f8fafc" />
      <circle cx="45.5" cy="38.5" r="2.2" fill="#f8fafc" />
      <path d="M34 46 C36 49 44 49 46 46" stroke="#fef3c7" strokeWidth="2" fill="none" strokeLinecap="round" />
      <circle cx="30" cy="43.5" r="1.8" fill="rgba(253, 186, 116, 0.75)" />
      <circle cx="50" cy="43.5" r="1.8" fill="rgba(253, 186, 116, 0.75)" />

      {icon === "scout" ? <path d="M40 20 L40 13 M35 16 L40 13 L45 16" stroke="#dbeafe" strokeWidth="2" strokeLinecap="round" /> : null}
      {icon === "intel" ? (
        <>
          <rect x="31" y="35.5" width="7" height="4.5" rx="1.6" fill="none" stroke="#e2e8f0" strokeWidth="1.3" />
          <rect x="42" y="35.5" width="7" height="4.5" rx="1.6" fill="none" stroke="#e2e8f0" strokeWidth="1.3" />
          <path d="M38 37.8 H42" stroke="#e2e8f0" strokeWidth="1.2" />
        </>
      ) : null}
      {icon === "stylist" ? <path d="M52 28 L54 32 L58 33 L55 36 L56 40 L52 38 L48 40 L49 36 L46 33 L50 32 Z" fill="#fef08a" /> : null}
      {icon === "builder" ? <path d="M28 31 C31 24 49 24 52 31 L52 34 H28 Z" fill="#facc15" stroke="#92400e" strokeWidth="1" /> : null}
      {icon === "sentinel" ? <path d="M40 52 L34 49 V44 L40 42 L46 44 V49 Z" fill="#bbf7d0" stroke="#166534" strokeWidth="1" /> : null}
      {icon === "publisher" ? <path d="M50 47 L58 44 V51 L50 49 Z M58 46 L61 45.5 M58 49 L61 49.5" stroke="#fed7aa" strokeWidth="1.4" fill="#fdba74" strokeLinecap="round" /> : null}
      {icon === "echo" ? <path d="M52 30 L54 34 L58 35 L55 38 L56 42 L52 40 L48 42 L49 38 L46 35 L50 34 Z" fill="#bae6fd" /> : null}
    </svg>
  );
}
