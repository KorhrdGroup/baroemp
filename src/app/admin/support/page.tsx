import Link from "next/link";
import { Coins } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AdminPageShell } from "@/features/admin/admin-page-shell";
import { SupportSyncButton } from "@/features/admin/support-sync-button";
import { SupportActiveToggleButton } from "@/features/admin/support-active-toggle-button";
import { labelRegion } from "@/lib/labels";
import { SUPPORT_CATEGORY_LABELS } from "@/types";
import type { Region } from "@/types";
import { listAdminSupportProgramsWithStats, getSupportSyncOverview } from "@/services/admin-support.service";
import { CAREER_RELEVANCE_THRESHOLD } from "@/lib/support/career-relevance";

interface AdminSupportSearchParams {
  provider?: string;
  category?: string;
  region?: string;
  status?: string;
  relevance?: string;
}

export default async function AdminSupportPage({
  searchParams,
}: {
  searchParams: Promise<AdminSupportSearchParams>;
}) {
  const sp = await searchParams;
  const [programs, syncOverview] = await Promise.all([
    listAdminSupportProgramsWithStats(),
    getSupportSyncOverview(),
  ]);

  const filtered = programs.filter((program) => {
    if (sp.provider && sp.provider !== "all" && (program.externalSource ?? "mock") !== sp.provider) return false;
    if (sp.category && sp.category !== "all" && program.category !== sp.category) return false;
    if (sp.region && sp.region !== "all" && (program.regionScope ?? "national") !== sp.region) return false;
    if (sp.status === "active" && !program.isActive) return false;
    if (sp.status === "inactive" && program.isActive) return false;
    if (sp.relevance === "relevant" && (program.careerRelevanceScore ?? 0) < CAREER_RELEVANCE_THRESHOLD) return false;
    if (sp.relevance === "irrelevant" && (program.careerRelevanceScore ?? 0) >= CAREER_RELEVANCE_THRESHOLD) return false;
    return true;
  });

  const providers = [...new Set(programs.map((p) => p.externalSource ?? "mock"))];
  const categories = [...new Set(programs.map((p) => p.category))];
  const regions = [...new Set(programs.map((p) => p.regionScope ?? "national"))];

  const buildHref = (overrides: Partial<AdminSupportSearchParams>) => {
    const next = { ...sp, ...overrides };
    const params = new URLSearchParams();
    if (next.provider && next.provider !== "all") params.set("provider", next.provider);
    if (next.category && next.category !== "all") params.set("category", next.category);
    if (next.region && next.region !== "all") params.set("region", next.region);
    if (next.status && next.status !== "all") params.set("status", next.status);
    if (next.relevance && next.relevance !== "all") params.set("relevance", next.relevance);
    const qs = params.toString();
    return `/admin/support${qs ? `?${qs}` : ""}`;
  };

  return (
    <AdminPageShell
      title="지원금"
      description="정부·지자체 지원사업 Catalog를 관리합니다. Provider Sync로 외부 API 지원제도를 동기화할 수 있습니다."
      icon={Coins}
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white p-4 ring-1 ring-slate-200">
          <div className="text-[13px] text-slate-600">
            <p>
              현재 Provider · <span className="font-semibold text-slate-800">{syncOverview.providerName}</span>
              {syncOverview.isMock && (
                <span className="ml-1.5 text-amber-600">(Mock Provider - PUBLIC_SERVICE_API_KEY 미설정)</span>
              )}
            </p>
            {syncOverview.latestRun ? (
              <p className="mt-1 text-slate-500">
                최근 동기화 · {syncOverview.latestRun.completedAt?.slice(0, 16).replace("T", " ") ?? "진행중"} ·{" "}
                {syncOverview.latestRun.status} · 신규 {syncOverview.latestRun.newCount} / 업데이트{" "}
                {syncOverview.latestRun.updatedCount} / 비활성 {syncOverview.latestRun.deactivatedCount} / 실패{" "}
                {syncOverview.latestRun.errorCount}
              </p>
            ) : (
              <p className="mt-1 text-slate-400">아직 동기화 이력이 없습니다.</p>
            )}
          </div>
          <SupportSyncButton />
        </div>

        <div className="flex flex-wrap gap-2 text-[12px]">
          <span className="text-slate-400">Provider:</span>
          <Link href={buildHref({ provider: "all" })} className={!sp.provider ? "font-semibold text-brand-blue-600" : "text-slate-500"}>
            전체
          </Link>
          {providers.map((p) => (
            <Link
              key={p}
              href={buildHref({ provider: p })}
              className={sp.provider === p ? "font-semibold text-brand-blue-600" : "text-slate-500"}
            >
              {p}
            </Link>
          ))}
          <span className="mx-2 text-slate-300">|</span>
          <span className="text-slate-400">카테고리:</span>
          <Link href={buildHref({ category: "all" })} className={!sp.category ? "font-semibold text-brand-blue-600" : "text-slate-500"}>
            전체
          </Link>
          {categories.map((c) => (
            <Link
              key={c}
              href={buildHref({ category: c })}
              className={sp.category === c ? "font-semibold text-brand-blue-600" : "text-slate-500"}
            >
              {SUPPORT_CATEGORY_LABELS[c] ?? c}
            </Link>
          ))}
          <span className="mx-2 text-slate-300">|</span>
          <span className="text-slate-400">지역:</span>
          <Link href={buildHref({ region: "all" })} className={!sp.region ? "font-semibold text-brand-blue-600" : "text-slate-500"}>
            전체
          </Link>
          {regions.map((r) => (
            <Link
              key={r}
              href={buildHref({ region: r })}
              className={sp.region === r ? "font-semibold text-brand-blue-600" : "text-slate-500"}
            >
              {r === "national" ? "전국" : labelRegion(r as Region)}
            </Link>
          ))}
          <span className="mx-2 text-slate-300">|</span>
          <span className="text-slate-400">상태:</span>
          {(["all", "active", "inactive"] as const).map((s) => (
            <Link
              key={s}
              href={buildHref({ status: s })}
              className={(sp.status ?? "all") === s ? "font-semibold text-brand-blue-600" : "text-slate-500"}
            >
              {s === "all" ? "전체" : s === "active" ? "노출중" : "비활성"}
            </Link>
          ))}
          <span className="mx-2 text-slate-300">|</span>
          <span className="text-slate-400">바로취업 관련도:</span>
          {(["all", "relevant", "irrelevant"] as const).map((r) => (
            <Link
              key={r}
              href={buildHref({ relevance: r })}
              className={(sp.relevance ?? "all") === r ? "font-semibold text-brand-blue-600" : "text-slate-500"}
            >
              {r === "all" ? "전체" : r === "relevant" ? `적합(≥${CAREER_RELEVANCE_THRESHOLD})` : "부적합"}
            </Link>
          ))}
        </div>

        <div className="overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                  <TableHead className="text-[12px]">지원사업명</TableHead>
                  <TableHead className="text-[12px]">운영기관</TableHead>
                  <TableHead className="text-[12px]">Provider</TableHead>
                  <TableHead className="text-[12px]">카테고리</TableHead>
                  <TableHead className="text-[12px]">관련도</TableHead>
                  <TableHead className="text-[12px]">지역</TableHead>
                  <TableHead className="text-[12px]">신청기간</TableHead>
                  <TableHead className="text-[12px]">상태</TableHead>
                  <TableHead className="text-[12px]">조회/찜/신청</TableHead>
                  <TableHead className="text-[12px]">관리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((program) => (
                  <TableRow key={program.id} className="text-[13px]">
                    <TableCell className="max-w-[220px] truncate font-semibold">
                      <Link href={`/support/${program.id}`} target="_blank" className="hover:text-brand-blue-600">
                        {program.title}
                      </Link>
                    </TableCell>
                    <TableCell>{program.organizationName ?? program.organization}</TableCell>
                    <TableCell>{program.externalSource ?? "mock"}</TableCell>
                    <TableCell>{SUPPORT_CATEGORY_LABELS[program.category] ?? program.category}</TableCell>
                    <TableCell>
                      <Badge
                        className={
                          (program.careerRelevanceScore ?? 0) >= CAREER_RELEVANCE_THRESHOLD
                            ? "rounded-md border-0 bg-brand-blue-50 text-brand-blue-700"
                            : "rounded-md border-0 bg-slate-100 text-slate-500"
                        }
                        title={(program.careerRelevanceReasons ?? []).join(" / ")}
                      >
                        {program.careerRelevanceScore ?? 0}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {program.regionScope === "national" || !program.regionScope
                        ? "전국"
                        : labelRegion(program.regionScope as Region)}
                    </TableCell>
                    <TableCell>{program.applicationPeriod ?? "상시"}</TableCell>
                    <TableCell>
                      <Badge
                        className={
                          program.isActive
                            ? "rounded-md border-0 bg-emerald-50 text-emerald-700"
                            : "rounded-md border-0 bg-slate-100 text-slate-500"
                        }
                      >
                        {program.isActive ? "노출중" : "비활성"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-500">
                      {program.viewCount} / {program.bookmarkCount} / {program.applyClickCount}
                    </TableCell>
                    <TableCell>
                      <SupportActiveToggleButton supportProgramId={program.id} isActive={program.isActive} />
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} className="py-10 text-center text-slate-400">
                      조건에 맞는 지원제도가 없습니다.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </AdminPageShell>
  );
}
