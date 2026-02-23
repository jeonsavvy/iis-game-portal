type TokenUsageSummary = {
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  estimatedCostUsd: number;
  flashPromptTokens: number;
  flashCompletionTokens: number;
  proPromptTokens: number;
  proCompletionTokens: number;
  unpricedTokens: number;
};

type TokenUsageByGameRow = {
  key: string;
  name: string;
  slug: string | null;
  secondaryLabel: string;
  pipelineCount: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
  lastSeenAt: string;
};

type Props = {
  summary: TokenUsageSummary;
  rows: TokenUsageByGameRow[];
};

export function TokenCostKPI({ summary, rows }: Props) {
  return (
    <section className="surface side-card" style={{ padding: "16px", marginBottom: "16px" }}>
      <p className="eyebrow">Observability</p>
      <h3 className="section-title">AI Token Usage & Cost (Last 180 Logs)</h3>

      <div style={{ display: "flex", gap: "24px", marginTop: "12px", flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: "120px" }}>
          <p className="muted-text" style={{ fontSize: "12px", margin: "0 0 4px" }}>
            Total Tokens
          </p>
          <strong style={{ fontSize: "24px", color: "#f8fafc" }}>{summary.totalTokens.toLocaleString()}</strong>
        </div>
        <div style={{ flex: 1, minWidth: "120px" }}>
          <p className="muted-text" style={{ fontSize: "12px", margin: "0 0 4px" }}>
            Estimated Cost
          </p>
          <strong style={{ fontSize: "24px", color: "#10b981" }}>${summary.estimatedCostUsd.toFixed(4)}</strong>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "8px",
          marginTop: "16px",
          fontSize: "12px",
          color: "#94a3b8",
        }}
      >
        <div>
          <span>Prompt Tokens: </span>
          <strong style={{ color: "#dbeafe" }}>{summary.promptTokens.toLocaleString()}</strong>
        </div>
        <div>
          <span>Completion Tokens: </span>
          <strong style={{ color: "#dbeafe" }}>{summary.completionTokens.toLocaleString()}</strong>
        </div>
        <div>
          <span>Flash Prompt: </span>
          <strong style={{ color: "#dbeafe" }}>{summary.flashPromptTokens.toLocaleString()}</strong>
        </div>
        <div>
          <span>Flash Completion: </span>
          <strong style={{ color: "#dbeafe" }}>{summary.flashCompletionTokens.toLocaleString()}</strong>
        </div>
        <div>
          <span>Pro Prompt: </span>
          <strong style={{ color: "#dbeafe" }}>{summary.proPromptTokens.toLocaleString()}</strong>
        </div>
        <div>
          <span>Pro Completion: </span>
          <strong style={{ color: "#dbeafe" }}>{summary.proCompletionTokens.toLocaleString()}</strong>
        </div>
        <div>
          <span>Unpriced Tokens: </span>
          <strong style={{ color: "#dbeafe" }}>{summary.unpricedTokens.toLocaleString()}</strong>
        </div>
        <div>
          <span>Rows: </span>
          <strong style={{ color: "#dbeafe" }}>{rows.length.toLocaleString()}</strong>
        </div>
      </div>

      <div style={{ marginTop: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", gap: "8px" }}>
          <h4 className="subsection-title" style={{ margin: 0 }}>
            게임별 AI 사용량 (추정)
          </h4>
          <span className="muted-text" style={{ fontSize: "12px" }}>
            파이프라인 로그 기준 집계
          </span>
        </div>

        {rows.length === 0 ? (
          <p className="muted-text" style={{ margin: 0 }}>
            표시할 AI 토큰 로그가 없습니다.
          </p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>게임/파이프라인</th>
                  <th>파이프라인 수</th>
                  <th>Prompt</th>
                  <th>Completion</th>
                  <th>Total</th>
                  <th>추정 비용</th>
                  <th>최근 로그</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.key}>
                    <td>
                      <div style={{ display: "grid", gap: "2px" }}>
                        <strong style={{ color: "#f8fafc" }}>{row.name}</strong>
                        <span className="muted-text" style={{ fontSize: "12px" }}>
                          {row.secondaryLabel}
                        </span>
                      </div>
                    </td>
                    <td>{row.pipelineCount.toLocaleString()}</td>
                    <td>{row.promptTokens.toLocaleString()}</td>
                    <td>{row.completionTokens.toLocaleString()}</td>
                    <td>{row.totalTokens.toLocaleString()}</td>
                    <td style={{ color: "#10b981", fontWeight: 700 }}>${row.estimatedCostUsd.toFixed(4)}</td>
                    <td>{new Date(row.lastSeenAt).toLocaleString("ko-KR")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

