"use client";

import { Filter } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function ObservatoryFilters({
  statusFilter,
  setStatusFilter,
  agentFilter,
  setAgentFilter,
  actionFilter,
  setActionFilter,
  errorFilter,
  setErrorFilter,
}: {
  statusFilter: string;
  setStatusFilter: (value: string) => void;
  agentFilter: string;
  setAgentFilter: (value: string) => void;
  actionFilter: string;
  setActionFilter: (value: string) => void;
  errorFilter: string;
  setErrorFilter: (value: string) => void;
}) {
  return (
    <Card data-admin-surface="observatory-filters" className="bg-white/72 p-5">
      <div className="mb-4 flex items-center gap-3">
        <Filter className="size-4 text-zinc-500" />
        <div>
          <h2 className="text-[1.3rem] font-semibold tracking-[-0.03em] text-foreground">필터</h2>
          <p className="text-sm text-muted-foreground">필요한 신호만 남기도록 상태와 에이전트 기준으로 좁혀봅니다.</p>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <FilterSelect label="상태" value={statusFilter} onValueChange={setStatusFilter} items={[{ value: "all", label: "전체" }, { value: "active", label: "작업 중" }, { value: "published", label: "퍼블리시 완료" }, { value: "cancelled", label: "취소됨" }]} />
        <FilterSelect label="에이전트" value={agentFilter} onValueChange={setAgentFilter} items={[{ value: "all", label: "전체" }, { value: "codegen", label: "코드젠" }, { value: "visual_qa", label: "비주얼 QA" }, { value: "playtester", label: "플레이테스터" }]} />
        <FilterSelect label="작업 단계" value={actionFilter} onValueChange={setActionFilter} items={[{ value: "all", label: "전체" }, { value: "generate", label: "생성" }, { value: "modify", label: "수정" }, { value: "evaluate", label: "평가" }, { value: "test", label: "테스트" }, { value: "refine", label: "개선" }, { value: "publish", label: "퍼블리시" }]} />
        <FilterSelect label="오류 여부" value={errorFilter} onValueChange={setErrorFilter} items={[{ value: "all", label: "전체" }, { value: "has_error", label: "오류만" }, { value: "no_error", label: "오류 제외" }]} />
      </div>
    </Card>
  );
}

function FilterSelect({ label, value, onValueChange, items }: { label: string; value: string; onValueChange: (value: string) => void; items: Array<{ value: string; label: string }> }) {
  return (
    <label className="grid gap-2 text-sm text-muted-foreground">
      <span className="text-[11px] font-semibold">{label}</span>
      <Select value={value || "all"} onValueChange={(next) => onValueChange(next === "all" ? "" : next)}>
        <SelectTrigger>
          <SelectValue placeholder="전체" />
        </SelectTrigger>
        <SelectContent>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  );
}
