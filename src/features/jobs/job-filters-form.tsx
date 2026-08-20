"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { REGION_LABELS } from "@/lib/labels";
import { mockJobRoles } from "@/mocks/job-roles.mock";
import { getOrCreateAnonymousId } from "@/lib/anonymous/anonymous-id";
import { trackJobFilterChangedAction, trackJobSearchAction } from "@/features/jobs/job-actions";
import type { JobSortOrder } from "@/types";

const SORT_OPTIONS: { value: JobSortOrder; label: string }[] = [
  { value: "recommended", label: "추천순" },
  { value: "latest", label: "최신순" },
  { value: "deadline", label: "마감임박순" },
  { value: "salary_desc", label: "급여높은순" },
];

export interface JobFiltersValue {
  keyword?: string;
  jobCategory?: string;
  region?: string;
  isBeginnerFriendly?: boolean;
  closingSoon?: boolean;
  sort?: JobSortOrder;
}

/**
 * 중장년 사용자 기준으로 필터를 너무 복잡하게 노출하지 않도록,
 * 핵심 조건(키워드/지역/직종/정렬)과 토글 2개(신입가능/마감임박)만 노출한다.
 * 제출 시 서버 컴포넌트(/jobs)가 다시 렌더링되도록 쿼리스트링 기반 네비게이션을 사용한다.
 */
export function JobFiltersForm({ initial }: { initial: JobFiltersValue }) {
  const router = useRouter();
  const [keyword, setKeyword] = useState(initial.keyword ?? "");
  const [region, setRegion] = useState(initial.region ?? "all");
  const [jobCategory, setJobCategory] = useState(initial.jobCategory ?? "all");
  const [beginnerOnly, setBeginnerOnly] = useState(Boolean(initial.isBeginnerFriendly));
  const [closingSoon, setClosingSoon] = useState(Boolean(initial.closingSoon));
  const [sort, setSort] = useState<JobSortOrder>(initial.sort ?? "recommended");

  const buildParams = (overrides: Partial<JobFiltersValue> = {}) => {
    const next: JobFiltersValue = {
      keyword,
      region: region === "all" ? undefined : region,
      jobCategory: jobCategory === "all" ? undefined : jobCategory,
      isBeginnerFriendly: beginnerOnly || undefined,
      closingSoon: closingSoon || undefined,
      sort,
      ...overrides,
    };
    const params = new URLSearchParams();
    if (next.keyword) params.set("keyword", next.keyword);
    if (next.region) params.set("region", next.region);
    if (next.jobCategory) params.set("category", next.jobCategory);
    if (next.isBeginnerFriendly) params.set("beginner", "1");
    if (next.closingSoon) params.set("closingSoon", "1");
    if (next.sort && next.sort !== "recommended") params.set("sort", next.sort);
    return { next, params };
  };

  const submit = async (overrides: Partial<JobFiltersValue> = {}) => {
    const { next, params } = buildParams(overrides);
    const anonymousId = getOrCreateAnonymousId();
    if (Object.keys(overrides).length > 0) {
      await trackJobFilterChangedAction({ anonymousId, filter: next as Record<string, unknown> });
    } else {
      await trackJobSearchAction({ anonymousId, keyword: next.keyword, filter: next as Record<string, unknown>, resultCount: -1 });
    }
    router.push(`/jobs${params.toString() ? `?${params.toString()}` : ""}`);
  };

  return (
    <div className="rounded-2xl border border-border bg-white p-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        className="flex flex-col gap-3 sm:flex-row sm:items-center"
      >
        <div className="flex flex-1 items-center gap-2 rounded-xl border border-border px-3 py-2.5">
          <Search className="size-4 shrink-0 text-slate-400" />
          <Input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="직업명, 회사명으로 검색"
            className="h-auto border-0 p-0 text-label-1 shadow-none focus-visible:ring-0"
          />
        </div>

        <Select
          value={region}
          onValueChange={(v) => {
            setRegion(v);
            void submit({ region: v === "all" ? undefined : v });
          }}
        >
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue placeholder="지역 전체" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">지역 전체</SelectItem>
            {Object.entries(REGION_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={jobCategory}
          onValueChange={(v) => {
            setJobCategory(v);
            void submit({ jobCategory: v === "all" ? undefined : v });
          }}
        >
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="직종 전체" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">직종 전체</SelectItem>
            {mockJobRoles.map((role) => (
              <SelectItem key={role.jobCategory} value={role.jobCategory}>
                {role.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={sort}
          onValueChange={(v) => {
            setSort(v as JobSortOrder);
            void submit({ sort: v as JobSortOrder });
          }}
        >
          <SelectTrigger className="w-full sm:w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button type="submit" className="bg-brand-blue-500 hover:bg-brand-blue-600">
          검색
        </Button>
      </form>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant={beginnerOnly ? "default" : "outline"}
          className={beginnerOnly ? "bg-brand-blue-500 hover:bg-brand-blue-600" : ""}
          onClick={() => {
            const next = !beginnerOnly;
            setBeginnerOnly(next);
            void submit({ isBeginnerFriendly: next || undefined });
          }}
        >
          신입가능만
        </Button>
        <Button
          type="button"
          size="sm"
          variant={closingSoon ? "default" : "outline"}
          className={closingSoon ? "bg-brand-blue-500 hover:bg-brand-blue-600" : ""}
          onClick={() => {
            const next = !closingSoon;
            setClosingSoon(next);
            void submit({ closingSoon: next || undefined });
          }}
        >
          마감임박만
        </Button>
      </div>
    </div>
  );
}
