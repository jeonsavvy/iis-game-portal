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
  finalizedPipelines: number;
  sampledPipelines: number;
};

type TokenUsageByGameRow = {
  key: string;
  name: string;
  slug: string | null;
  secondaryLabel: string;
  costSource: "finalized" | "sampled";
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
  const trackedPipelines = summary.finalizedPipelines + summary.sampledPipelines;

  return (
    <section className="surface ops-observability-panel">
      <div className="section-head compact">
        <div>
          <p className="eyebrow">Observability</p>
          <h3 className="section-title">AI Token Usage (최근 180 로그)</h3>
        </div>
        <span className="muted-text">확정 집계 우선, 없으면 로그 샘플 추정</span>
      </div>

      <div className="ops-observe-kpis">
        <article>
          <span>Total Tokens</span>
          <strong>{summary.totalTokens.toLocaleString()}</strong>
        </article>
        <article>
          <span>Tracked Pipelines</span>
          <strong>{trackedPipelines.toLocaleString()}</strong>
        </article>
        <article>
          <span>Flash Prompt / Completion</span>
          <strong>
            {summary.flashPromptTokens.toLocaleString()} / {summary.flashCompletionTokens.toLocaleString()}
          </strong>
        </article>
        <article>
          <span>Pro Prompt / Completion</span>
          <strong>
            {summary.proPromptTokens.toLocaleString()} / {summary.proCompletionTokens.toLocaleString()}
          </strong>
        </article>
      </div>

      <div className="ops-observe-meta">
        <span>
          확정 집계 파이프라인 <strong>{summary.finalizedPipelines.toLocaleString()}</strong>
        </span>
        <span>
          샘플 추정 파이프라인 <strong>{summary.sampledPipelines.toLocaleString()}</strong>
        </span>
        <span>
          미단가 토큰 <strong>{summary.unpricedTokens.toLocaleString()}</strong>
        </span>
      </div>

      {rows.length === 0 ? (
        <p className="muted-text">표시할 AI 토큰 로그가 없습니다.</p>
      ) : (
        <div className="ops-observe-table-wrap">
          <table className="table ops-observe-table">
            <thead>
              <tr>
                <th>게임/파이프라인</th>
                <th>집계 기준</th>
                <th>파이프라인 수</th>
                <th>Prompt</th>
                <th>Completion</th>
                <th>Total</th>
                <th>최근 로그</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key}>
                  <td>
                    <div className="ops-observe-title-cell">
                      <strong>{row.name}</strong>
                      <span>{row.secondaryLabel}</span>
                    </div>
                  </td>
                  <td>
                    <span className={`status-chip ${row.costSource === "finalized" ? "tone-success" : "tone-muted"}`}>
                      {row.costSource === "finalized" ? "확정" : "샘플"}
                    </span>
                  </td>
                  <td>{row.pipelineCount.toLocaleString()}</td>
                  <td>{row.promptTokens.toLocaleString()}</td>
                  <td>{row.completionTokens.toLocaleString()}</td>
                  <td>{row.totalTokens.toLocaleString()}</td>
                  <td>{new Date(row.lastSeenAt).toLocaleString("ko-KR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
