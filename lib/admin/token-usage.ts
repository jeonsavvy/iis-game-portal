import type { PipelineLog } from "@/types/pipeline";

export type RecentGameRow = {
  id: string;
  name: string;
  slug: string;
  genre: string;
  status: string;
  created_at: string;
};

export type TokenUsageSummary = {
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

export type TokenUsageByGameRow = {
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

export type PipelineUsageSummaryRecord = {
  gameSlug: string | null;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
  flashPromptTokens: number;
  flashCompletionTokens: number;
  proPromptTokens: number;
  proCompletionTokens: number;
  unpricedTokens: number;
};

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function toNonNegativeInt(value: unknown): number {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseInt(value, 10)
        : Number.NaN;
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 0;
  }
  return Math.floor(parsed);
}

function toNonNegativeFloat(value: unknown): number {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseFloat(value)
        : Number.NaN;
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 0;
  }
  return parsed;
}

function estimateUsageCostUsd(modelName: string, promptTokens: number, completionTokens: number): number {
  const model = modelName.toLowerCase();

  if (model.includes("flash")) {
    return (promptTokens / 1_000_000) * 0.075 + (completionTokens / 1_000_000) * 0.3;
  }

  if (model.includes("pro")) {
    return (promptTokens / 1_000_000) * 1.25 + (completionTokens / 1_000_000) * 5.0;
  }

  return 0;
}

function extractSlugFromMetadata(metadata: Record<string, unknown>): string | null {
  const directSlug = typeof metadata.slug === "string" ? metadata.slug.trim().toLowerCase() : "";
  if (SLUG_RE.test(directSlug)) {
    return directSlug;
  }

  const pathCandidates = [
    typeof metadata.storage_path === "string" ? metadata.storage_path : "",
    typeof metadata.artifact === "string" ? metadata.artifact : "",
  ];

  for (const candidate of pathCandidates) {
    const normalized = candidate.trim();
    if (!normalized) {
      continue;
    }
    const fromGamesPath = normalized.match(/(?:^|\/)games\/([a-z0-9-]+)\//i)?.[1];
    if (fromGamesPath && SLUG_RE.test(fromGamesPath)) {
      return fromGamesPath.toLowerCase();
    }
    const fromRootPath = normalized.match(/^([a-z0-9-]+)\//i)?.[1];
    if (fromRootPath && SLUG_RE.test(fromRootPath)) {
      return fromRootPath.toLowerCase();
    }
  }

  const rawUrl = typeof metadata.url === "string" ? metadata.url.trim() : "";
  if (rawUrl) {
    try {
      const url = new URL(rawUrl);
      const segments = url.pathname.split("/").filter(Boolean);
      const gamesIndex = segments.findIndex((segment) => segment.toLowerCase() === "games");
      const preferred = gamesIndex >= 0 ? segments[gamesIndex + 1] : segments[segments.length - 1];
      const slug = (preferred ?? "").trim().toLowerCase();
      if (SLUG_RE.test(slug)) {
        return slug;
      }
    } catch {
      // ignore malformed URL metadata
    }
  }

  return null;
}

export function parsePipelineUsageSummary(payload: unknown): PipelineUsageSummaryRecord | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const usageRaw = (payload as Record<string, unknown>).usage_summary;
  if (!usageRaw || typeof usageRaw !== "object") {
    return null;
  }
  const usage = usageRaw as Record<string, unknown>;

  const promptTokens = toNonNegativeInt(usage.prompt_tokens);
  const completionTokens = toNonNegativeInt(usage.completion_tokens);
  const totalTokens = toNonNegativeInt(usage.total_tokens) || promptTokens + completionTokens;
  const estimatedCostUsd = toNonNegativeFloat(usage.estimated_cost_usd);

  if (totalTokens <= 0 && promptTokens <= 0 && completionTokens <= 0) {
    return null;
  }

  const gameSlugRaw = usage.game_slug;
  const gameSlug = typeof gameSlugRaw === "string" && SLUG_RE.test(gameSlugRaw.trim().toLowerCase()) ? gameSlugRaw.trim().toLowerCase() : null;

  const modelBreakdown = usage.model_breakdown;
  let flashPromptTokens = 0;
  let flashCompletionTokens = 0;
  let proPromptTokens = 0;
  let proCompletionTokens = 0;
  if (modelBreakdown && typeof modelBreakdown === "object") {
    for (const [model, row] of Object.entries(modelBreakdown as Record<string, unknown>)) {
      if (!row || typeof row !== "object") {
        continue;
      }
      const typedRow = row as Record<string, unknown>;
      const prompt = toNonNegativeInt(typedRow.prompt_tokens);
      const completion = toNonNegativeInt(typedRow.completion_tokens);
      const loweredModel = model.toLowerCase();
      if (loweredModel.includes("flash")) {
        flashPromptTokens += prompt;
        flashCompletionTokens += completion;
      } else if (loweredModel.includes("pro")) {
        proPromptTokens += prompt;
        proCompletionTokens += completion;
      }
    }
  }

  const unpricedTokens = toNonNegativeInt(usage.unpriced_tokens);
  return {
    gameSlug,
    promptTokens,
    completionTokens,
    totalTokens,
    estimatedCostUsd,
    flashPromptTokens,
    flashCompletionTokens,
    proPromptTokens,
    proCompletionTokens,
    unpricedTokens,
  };
}

export function buildTokenUsageReport(
  logs: PipelineLog[],
  recentGames: RecentGameRow[],
  pipelineKeywordById: Map<string, string>,
  pipelineUsageSummaryById: Map<string, PipelineUsageSummaryRecord>,
): { summary: TokenUsageSummary; rows: TokenUsageByGameRow[] } {
  const summary: TokenUsageSummary = {
    totalTokens: 0,
    promptTokens: 0,
    completionTokens: 0,
    estimatedCostUsd: 0,
    flashPromptTokens: 0,
    flashCompletionTokens: 0,
    proPromptTokens: 0,
    proCompletionTokens: 0,
    unpricedTokens: 0,
    finalizedPipelines: 0,
    sampledPipelines: 0,
  };

  const pipelineUsage = new Map<
    string,
    {
      pipelineId: string;
      keyword: string;
      slug: string | null;
      costSource: "finalized" | "sampled";
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
      estimatedCostUsd: number;
      lastSeenAt: string;
    }
  >();

  for (const [pipelineId, finalized] of pipelineUsageSummaryById.entries()) {
    pipelineUsage.set(pipelineId, {
      pipelineId,
      keyword: pipelineKeywordById.get(pipelineId) ?? "",
      slug: finalized.gameSlug,
      costSource: "finalized",
      promptTokens: finalized.promptTokens,
      completionTokens: finalized.completionTokens,
      totalTokens: finalized.totalTokens,
      estimatedCostUsd: finalized.estimatedCostUsd,
      lastSeenAt: "",
    });

    summary.finalizedPipelines += 1;
    summary.promptTokens += finalized.promptTokens;
    summary.completionTokens += finalized.completionTokens;
    summary.totalTokens += finalized.totalTokens;
    summary.estimatedCostUsd += finalized.estimatedCostUsd;
    summary.flashPromptTokens += finalized.flashPromptTokens;
    summary.flashCompletionTokens += finalized.flashCompletionTokens;
    summary.proPromptTokens += finalized.proPromptTokens;
    summary.proCompletionTokens += finalized.proCompletionTokens;
    summary.unpricedTokens += finalized.unpricedTokens;
  }

  for (const log of logs) {
    const pipelineId = log.pipeline_id;
    const metadata = log.metadata && typeof log.metadata === "object" ? log.metadata : {};
    const typedMetadata = metadata as Record<string, unknown>;

    let pipeline = pipelineUsage.get(pipelineId);
    if (!pipeline) {
      pipeline = {
        pipelineId,
        keyword: pipelineKeywordById.get(pipelineId) ?? "",
        slug: null,
        costSource: "sampled",
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        estimatedCostUsd: 0,
        lastSeenAt: log.created_at,
      };
      pipelineUsage.set(pipelineId, pipeline);
    }

    if (log.created_at > pipeline.lastSeenAt) {
      pipeline.lastSeenAt = log.created_at;
    }

    const slug = extractSlugFromMetadata(typedMetadata);
    if (slug) {
      pipeline.slug = slug;
    }

    if (pipeline.costSource === "finalized") {
      continue;
    }

    const usageRaw = typedMetadata.usage;
    if (!usageRaw || typeof usageRaw !== "object") {
      continue;
    }

    const usage = usageRaw as Record<string, unknown>;
    const promptTokens = toNonNegativeInt(usage.prompt_tokens);
    const completionTokens = toNonNegativeInt(usage.completion_tokens);
    const totalTokens = toNonNegativeInt(usage.total_tokens) || promptTokens + completionTokens;

    if (totalTokens <= 0 && promptTokens <= 0 && completionTokens <= 0) {
      continue;
    }

    const modelName = typeof typedMetadata.model === "string" ? typedMetadata.model : "";
    const estimatedCostUsd = estimateUsageCostUsd(modelName, promptTokens, completionTokens);

    pipeline.promptTokens += promptTokens;
    pipeline.completionTokens += completionTokens;
    pipeline.totalTokens += totalTokens;
    pipeline.estimatedCostUsd += estimatedCostUsd;

    summary.promptTokens += promptTokens;
    summary.completionTokens += completionTokens;
    summary.totalTokens += totalTokens;
    summary.estimatedCostUsd += estimatedCostUsd;

    const normalizedModel = modelName.toLowerCase();
    if (normalizedModel.includes("flash")) {
      summary.flashPromptTokens += promptTokens;
      summary.flashCompletionTokens += completionTokens;
    } else if (normalizedModel.includes("pro")) {
      summary.proPromptTokens += promptTokens;
      summary.proCompletionTokens += completionTokens;
    } else {
      summary.unpricedTokens += totalTokens;
    }
  }

  summary.sampledPipelines = Array.from(pipelineUsage.values()).filter((row) => row.costSource === "sampled" && row.totalTokens > 0).length;

  const gameBySlug = new Map(recentGames.map((game) => [game.slug, game]));
  const rowMap = new Map<string, TokenUsageByGameRow>();

  for (const pipeline of pipelineUsage.values()) {
    if (pipeline.totalTokens <= 0) {
      continue;
    }

    if (pipeline.slug) {
      const game = gameBySlug.get(pipeline.slug);
      const rowKey = `slug:${pipeline.slug}:${pipeline.costSource}`;
      const existing = rowMap.get(rowKey);
      const nextLastSeenAt = existing && existing.lastSeenAt > pipeline.lastSeenAt ? existing.lastSeenAt : pipeline.lastSeenAt;

      rowMap.set(rowKey, {
        key: rowKey,
        name: game?.name ?? pipeline.slug,
        slug: pipeline.slug,
        secondaryLabel: pipeline.slug,
        costSource: pipeline.costSource,
        pipelineCount: (existing?.pipelineCount ?? 0) + 1,
        promptTokens: (existing?.promptTokens ?? 0) + pipeline.promptTokens,
        completionTokens: (existing?.completionTokens ?? 0) + pipeline.completionTokens,
        totalTokens: (existing?.totalTokens ?? 0) + pipeline.totalTokens,
        estimatedCostUsd: (existing?.estimatedCostUsd ?? 0) + pipeline.estimatedCostUsd,
        lastSeenAt: nextLastSeenAt,
      });
      continue;
    }

    const rowKey = `pipeline:${pipeline.pipelineId}`;
    rowMap.set(rowKey, {
      key: rowKey,
      name: pipeline.keyword || "미식별 파이프라인",
      slug: null,
      secondaryLabel: `pipeline ${pipeline.pipelineId.slice(0, 8)}`,
      costSource: pipeline.costSource,
      pipelineCount: 1,
      promptTokens: pipeline.promptTokens,
      completionTokens: pipeline.completionTokens,
      totalTokens: pipeline.totalTokens,
      estimatedCostUsd: pipeline.estimatedCostUsd,
      lastSeenAt: pipeline.lastSeenAt,
    });
  }

  const rows = Array.from(rowMap.values()).sort((a, b) => {
    if (b.totalTokens !== a.totalTokens) {
      return b.totalTokens - a.totalTokens;
    }
    if (b.promptTokens !== a.promptTokens) {
      return b.promptTokens - a.promptTokens;
    }
    return b.lastSeenAt.localeCompare(a.lastSeenAt);
  });

  return { summary, rows };
}
