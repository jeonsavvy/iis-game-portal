"use client";

import { useMemo } from "react";

type TokenStats = {
    flashPromptTokens: number;
    flashCompletionTokens: number;
    proPromptTokens: number;
    proCompletionTokens: number;
};

type Props = {
    stats: TokenStats;
};

export function TokenCostKPI({ stats }: Props) {
    const cost = useMemo(() => {
        // gemini-1.5-flash pricing: $0.075 / 1M prompt, $0.30 / 1M completion
        const flashCost =
            (stats.flashPromptTokens / 1_000_000) * 0.075 +
            (stats.flashCompletionTokens / 1_000_000) * 0.3;

        // gemini-1.5-pro pricing: $1.25 / 1M prompt, $5.00 / 1M completion
        const proCost =
            (stats.proPromptTokens / 1_000_000) * 1.25 + (stats.proCompletionTokens / 1_000_000) * 5.0;

        return flashCost + proCost;
    }, [stats]);

    const totalTokens =
        stats.flashPromptTokens +
        stats.flashCompletionTokens +
        stats.proPromptTokens +
        stats.proCompletionTokens;

    return (
        <section className="surface side-card" style={{ padding: "16px", marginBottom: "16px" }}>
            <p className="eyebrow">Observability</p>
            <h3 className="section-title">AI Token Usage & Cost (Last 180 Logs)</h3>
            <div style={{ display: "flex", gap: "24px", marginTop: "12px", flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: "120px" }}>
                    <p className="muted-text" style={{ fontSize: "12px", margin: "0 0 4px" }}>
                        Total Tokens
                    </p>
                    <strong style={{ fontSize: "24px", color: "#f8fafc" }}>
                        {totalTokens.toLocaleString()}
                    </strong>
                </div>
                <div style={{ flex: 1, minWidth: "120px" }}>
                    <p className="muted-text" style={{ fontSize: "12px", margin: "0 0 4px" }}>
                        Estimated Cost
                    </p>
                    <strong style={{ fontSize: "24px", color: "#10b981" }}>
                        ${cost.toFixed(4)}
                    </strong>
                </div>
            </div>
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "8px",
                    marginTop: "16px",
                    fontSize: "12px",
                    color: "#94a3b8",
                }}
            >
                <div>
                    <span>Flash Prompt: </span>
                    <strong style={{ color: "#dbeafe" }}>{stats.flashPromptTokens.toLocaleString()}</strong>
                </div>
                <div>
                    <span>Flash Completion: </span>
                    <strong style={{ color: "#dbeafe" }}>{stats.flashCompletionTokens.toLocaleString()}</strong>
                </div>
                <div>
                    <span>Pro Prompt: </span>
                    <strong style={{ color: "#dbeafe" }}>{stats.proPromptTokens.toLocaleString()}</strong>
                </div>
                <div>
                    <span>Pro Completion: </span>
                    <strong style={{ color: "#dbeafe" }}>{stats.proCompletionTokens.toLocaleString()}</strong>
                </div>
            </div>
        </section>
    );
}
