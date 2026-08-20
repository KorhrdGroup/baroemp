import Link from "next/link";
import { Briefcase } from "lucide-react";
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
import { JobSyncButton } from "@/features/admin/job-sync-button";
import { JobActiveToggleButton } from "@/features/admin/job-active-toggle-button";
import { labelRegion } from "@/lib/labels";
import { listAdminJobsWithStats, getJobSyncOverview } from "@/services/admin-job.service";

interface AdminJobsSearchParams {
  provider?: string;
  category?: string;
  region?: string;
  status?: string;
}

export default async function AdminJobsPage({
  searchParams,
}: {
  searchParams: Promise<AdminJobsSearchParams>;
}) {
  const sp = await searchParams;
  const [jobs, syncOverview] = await Promise.all([listAdminJobsWithStats(), getJobSyncOverview()]);

  const filtered = jobs.filter((job) => {
    if (sp.provider && sp.provider !== "all" && (job.externalSource ?? "direct") !== sp.provider) return false;
    if (sp.category && job.jobCategory !== sp.category) return false;
    if (sp.region && job.region !== sp.region) return false;
    if (sp.status === "active" && !job.isActive) return false;
    if (sp.status === "inactive" && job.isActive) return false;
    return true;
  });

  const providers = [...new Set(jobs.map((j) => j.externalSource ?? "direct"))];
  const regions = [...new Set(jobs.map((j) => j.region))];

  const buildHref = (overrides: Partial<AdminJobsSearchParams>) => {
    const next = { ...sp, ...overrides };
    const params = new URLSearchParams();
    if (next.provider && next.provider !== "all") params.set("provider", next.provider);
    if (next.category) params.set("category", next.category);
    if (next.region && next.region !== "all") params.set("region", next.region);
    if (next.status && next.status !== "all") params.set("status", next.status);
    const qs = params.toString();
    return `/admin/jobs${qs ? `?${qs}` : ""}`;
  };

  return (
    <AdminPageShell
      title="채용공고"
      description="전국 채용공고 수집 현황을 관리합니다. Provider Sync로 외부 API 공고를 동기화할 수 있습니다."
      icon={Briefcase}
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white p-4 ring-1 ring-slate-200">
          <div className="text-label-1 text-slate-600">
            <p>
              현재 Provider · <span className="font-semibold text-slate-800">{syncOverview.providerName}</span>
              {syncOverview.isMock && <span className="ml-1.5 text-amber-600">(Mock Provider - WORK24_API_KEY 미설정)</span>}
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
          <JobSyncButton />
        </div>

        <div className="flex flex-wrap gap-2 text-label-2">
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
              {labelRegion(r)}
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
        </div>

        <div className="overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                  <TableHead className="text-label-2">공고명</TableHead>
                  <TableHead className="text-label-2">회사</TableHead>
                  <TableHead className="text-label-2">Provider</TableHead>
                  <TableHead className="text-label-2">지역</TableHead>
                  <TableHead className="text-label-2">직종</TableHead>
                  <TableHead className="text-label-2">급여</TableHead>
                  <TableHead className="text-label-2">등록일</TableHead>
                  <TableHead className="text-label-2">마감일</TableHead>
                  <TableHead className="text-label-2">상태</TableHead>
                  <TableHead className="text-label-2">조회/찜/지원</TableHead>
                  <TableHead className="text-label-2">관리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((job) => (
                  <TableRow key={job.id} className="text-label-1">
                    <TableCell className="max-w-[220px] truncate font-semibold">
                      <Link href={`/jobs/${job.id}`} target="_blank" className="">
                        {job.title}
                      </Link>
                    </TableCell>
                    <TableCell>{job.companyName}</TableCell>
                    <TableCell>{job.externalSource ?? "direct"}</TableCell>
                    <TableCell>{labelRegion(job.region)}</TableCell>
                    <TableCell>{job.jobCategory}</TableCell>
                    <TableCell>{job.salaryText ?? "-"}</TableCell>
                    <TableCell>{(job.postedAt ?? job.createdAt).slice(0, 10)}</TableCell>
                    <TableCell>{job.applyDeadline?.slice(0, 10) ?? "상시"}</TableCell>
                    <TableCell>
                      <Badge
                        className={
                          job.isActive
                            ? "rounded-md border-0 bg-emerald-50 text-emerald-700"
                            : "rounded-md border-0 bg-slate-100 text-slate-500"
                        }
                      >
                        {job.isActive ? "노출중" : "비활성"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-500">
                      {job.viewCount} / {job.bookmarkCount} / {job.applyClickCount}
                    </TableCell>
                    <TableCell>
                      <JobActiveToggleButton jobId={job.id} isActive={job.isActive} />
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={11} className="py-10 text-center text-slate-400">
                      조건에 맞는 채용공고가 없습니다.
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
