import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function HomeFilters({
  sort,
  sortLabels,
  q,
}: {
  sort: string;
  sortLabels: Record<string, string>;
  q: string;
}) {
  return (
    <Card id="discover" className="rounded-[1.85rem] border-white/8 bg-[#101118]/85">
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-accent">Discover</p>
            <CardTitle className="mt-2 text-[1.75rem]">빠른 탐색</CardTitle>
          </div>
          <p className="max-w-xl text-sm leading-6 text-muted-foreground">정렬과 검색을 함께 배치해 빠르게 선택하고, 아래 카탈로그에서 바로 플레이할 수 있게 설계합니다.</p>
        </div>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4 lg:grid-cols-[minmax(12rem,15rem)_minmax(0,1fr)_auto] lg:items-end" method="GET">
          <label className="grid gap-2 text-sm text-muted-foreground">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em]">정렬</span>
            <select
              className="flex h-11 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm text-foreground outline-none transition focus:border-white/20"
              name="sort"
              defaultValue={sort}
            >
              {Object.entries(sortLabels).map(([option, label]) => (
                <option key={option} value={option}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 text-sm text-muted-foreground">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em]">게임 검색</span>
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input name="q" defaultValue={q} placeholder="게임 이름으로 검색" className="pl-11" />
            </div>
          </label>

          <Button type="submit" size="lg">적용</Button>
        </form>
      </CardContent>
    </Card>
  );
}
