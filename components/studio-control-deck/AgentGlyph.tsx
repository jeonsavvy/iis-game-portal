"use client";

import { useEffect, useId, useState } from "react";

import type { AgentIcon } from "@/components/studio-control-deck/config";

export function AgentGlyph({ icon, tone, active }: { icon: AgentIcon; tone: string; active: boolean }) {
  const uid = useId().replace(/:/g, "");
  const [reducedMotion, setReducedMotion] = useState(false);
  const gradA = `${uid}-a`;
  const gradB = `${uid}-b`;
  const radar = `${uid}-r`;

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

  const antenna =
    icon === "scout" ? (
      <path d="M40 18 L40 10 M32 14 L40 10 L48 14" stroke="#dbeafe" strokeWidth="2" strokeLinecap="round" fill="none" />
    ) : null;
  const badge =
    icon === "builder" ? (
      <rect x="47" y="27" width="11" height="9" rx="2" fill="#93c5fd" stroke="#1e3a8a" strokeWidth="1" />
    ) : icon === "publisher" ? (
      <path d="M49 28 L58 34 L49 40 Z" fill="#fca5a5" />
    ) : icon === "intel" ? (
      <circle cx="53" cy="29" r="5" fill="#fde047" stroke="#854d0e" strokeWidth="1" />
    ) : icon === "stylist" ? (
      <path d="M50 27 C54 23 58 23 60 27 C57 30 53 31 49 30 Z" fill="#f5d0fe" />
    ) : icon === "sentinel" ? (
      <path d="M49 26 L58 26 L56 31 L51 31 Z" fill="#bbf7d0" />
    ) : icon === "echo" ? (
      <rect x="49" y="26" width="10" height="10" rx="2" fill="#fecdd3" />
    ) : null;

  return (
    <svg className={`agent-glyph tone-${tone}${active ? " is-active" : ""}`} viewBox="0 0 80 80" aria-hidden="true">
      <defs>
        <radialGradient id={gradA} cx="40%" cy="35%">
          <stop offset="0%" stopColor="#fca5a5" />
          <stop offset="65%" stopColor="#dc2626" />
          <stop offset="100%" stopColor="#7f1d1d" />
        </radialGradient>
        <radialGradient id={gradB} cx="45%" cy="32%">
          <stop offset="0%" stopColor="#1f2937" />
          <stop offset="100%" stopColor="#020617" />
        </radialGradient>
        <radialGradient id={radar} cx="50%" cy="50%">
          <stop offset="0%" stopColor="rgba(56,189,248,0.5)" />
          <stop offset="100%" stopColor="rgba(15,23,42,0)" />
        </radialGradient>
      </defs>

      <circle cx="40" cy="40" r="36" fill={`url(#${radar})`} opacity="0.18">
        {!reducedMotion && active ? <animate attributeName="r" values="32;37;32" dur="2.6s" repeatCount="indefinite" /> : null}
      </circle>
      <ellipse cx="40" cy="47" rx="21" ry="17" fill={`url(#${gradA})`} />
      <ellipse cx="40" cy="44" rx="10" ry="10" fill={`url(#${gradB})`} />
      <circle cx="34" cy="40" r="2.2" fill="#f8fafc" />
      <circle cx="46" cy="40" r="2.2" fill="#f8fafc" />
      <path d="M28 51 C34 57 46 57 52 51" stroke="#fecaca" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M19 47 C14 46 11 42 11 37 C14 35 17 35 21 37" stroke="#dc2626" strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d="M61 47 C66 46 69 42 69 37 C66 35 63 35 59 37" stroke="#dc2626" strokeWidth="4" fill="none" strokeLinecap="round" />
      {antenna}
      {badge}
    </svg>
  );
}
