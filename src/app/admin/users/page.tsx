import Link from "next/link";
import { Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AdminPageShell } from "@/features/admin/admin-page-shell";
import { listAdminUsersPaged } from "@/services/admin-user-list.service";
import { getUserSupportBehaviorSummary } from "@/services/support-behavior-summary.service";
import { getDataSourceMode } from "@/lib/data/mode";
import { EMPLOYMENT_STATUS_LABELS, REGION_LABELS } from "@/lib/labels";
import { cn } from "@/lib/utils";
import type { EmploymentStatus, LeadGrade, Region } from "@/types";

function gradeClass(grade: string): string {
  if (grade === "A") return "bg-red-50 text-red-600";
  if (grade === "B") return "bg-amber-50 text-amber-700";
  if (grade === "C") return "bg-brand-blue-50 text-brand-blue-600";
  return "bg-slate-100 text-slate-500";
}

type SupportSegment = "all" | "high_eligibility" | "training_interest" | "regional_interest" | "assessment_completed";

const SEGMENT_LABEL: Record<SupportSegment, string> = {
  all: "전체",
  high_eligibility: "높은 가능성 제도 보유",
  training_interest: "교육지원 관심",
  regional_interest: "지역지원 관심",
  assessment_completed: "지원금 검사 완료",
};

const PAGE_SIZE = 20;

interface AdminUsersSearchParams {
  supportSegment?: string;
  q?: string;
  grade?: string;
  employmentStatus?: string;
  region?: string;
  marketing?: string;
  page?: string;
}

function buildHref(sp: AdminUsersSearchParams, patch: Partial<AdminUsersSearchParams>): string {
  const merged = { ...sp, ...patch };
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(merged)) {
    if (value) params.set(key, value);
  }
  const qs = params.toString();
  return qs ? `/admin/users?${qs}` : "/admin/users";
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<AdminUsersSearchParams>;
}) {
  const sp = await searchParams;
  const segment = (sp.supportSegment as SupportSegment) ?? "all";
  const page = Math.max(1, Number(sp.page ?? "1") || 1);

  const { items: users, total } = await listAdminUsersPaged({
    page,
    pageSize: PAGE_SIZE,
    keyword: sp.q,
    leadGrade: sp.grade as LeadGrade | undefined,
    employmentStatus: sp.employmentStatus as EmploymentStatus | undefined,
    region: sp.region as Region | undefined,
    marketingConsent: sp.marketing === "y" ? true : sp.marketing === "n" ? false : undefined,
  });
  const mode = getDataSourceMode();
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // 스펙 24번: 향후 세그먼트 필터를 위한 최소 구현 — 현재 페이지 회원목록에서 지원금 관심 기준으로 거를 수 있다.
  const supportSummaries = new Map(
    await Promise.all(
      users.map(async (u) => [u.id, await getUserSupportBehaviorSummary(u.id)] as const),
    ),
  );

  const filteredUsers = users.filter((u) => {
    if (segment === "all") return true;
    const summary = supportSummaries.get(u.id);
    if (!summary) return false;
    if (segment === "high_eligibility") return summary.highEligibilityCount > 0;
    if (segment === "training_interest") return summary.trainingInterest;
    if (segment === "regional_interest") return summary.regionalInterest;
    if (segment === "assessment_completed") return summary.hasCompletedAssessment;
    return true;
  });

  return (
    <AdminPageShell
      title="회원·Career DB"
      description={`가입 회원과 Career Profile을 관리합니다 (총 ${total}명). 현재 모드: ${mode}`}
      icon={Users}
    >
      <form className="mb-3 flex flex-wrap items-center gap-2" action="/admin/users" method="get">
        <input
          type="text"
          name="q"
          defaultValue={sp.q ?? ""}
          placeholder="이름 / 이메일 / 전화번호 검색"
          className="h-9 w-56 rounded-md border border-slate-200 px-3 text-label-1"
        />
        <select name="grade" defaultValue={sp.grade ?? ""} className="h-9 rounded-md border border-slate-200 px-2 text-label-1">
          <option value="">Lead 전체</option>
          {(["A", "B", "C", "D"] as LeadGrade[]).map((g) => (
            <option key={g} value={g}>
              {g}등급
            </option>
          ))}
        </select>
        <select
          name="employmentStatus"
          defaultValue={sp.employmentStatus ?? ""}
          className="h-9 rounded-md border border-slate-200 px-2 text-label-1"
        >
          <option value="">취업상태 전체</option>
          {Object.entries(EMPLOYMENT_STATUS_LABELS).map(([code, label]) => (
            <option key={code} value={code}>
              {label}
            </option>
          ))}
        </select>
        <select name="region" defaultValue={sp.region ?? ""} className="h-9 rounded-md border border-slate-200 px-2 text-label-1">
          <option value="">지역 전체</option>
          {Object.entries(REGION_LABELS).map(([code, label]) => (
            <option key={code} value={code}>
              {label}
            </option>
          ))}
        </select>
        <select name="marketing" defaultValue={sp.marketing ?? ""} className="h-9 rounded-md border border-slate-200 px-2 text-label-1">
          <option value="">마케팅동의 전체</option>
          <option value="y">동의</option>
          <option value="n">미동의</option>
        </select>
        <button type="submit" className="h-9 rounded-md bg-brand-blue-400 px-4 text-label-1 font-medium text-white">
          검색
        </button>
        {(sp.q || sp.grade || sp.employmentStatus || sp.region || sp.marketing) && (
          <Link href="/admin/users" className="text-label-2 text-slate-400">
            초기화
          </Link>
        )}
      </form>

      <div className="mb-3 flex flex-wrap items-center gap-2 text-label-2">
        <span className="text-slate-400">지원금 세그먼트:</span>
        {(Object.keys(SEGMENT_LABEL) as SupportSegment[]).map((key) => (
          <Link
            key={key}
            href={buildHref(sp, { supportSegment: key === "all" ? undefined : key, page: undefined })}
            className={cn(
              "rounded-full px-2.5 py-1",
              segment === key ? "bg-brand-blue-400 font-semibold text-white" : "bg-slate-100 text-slate-500",
            )}
          >
            {SEGMENT_LABEL[key]}
          </Link>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                <TableHead className="text-label-2">이름</TableHead>
                <TableHead className="text-label-2">이메일</TableHead>
                <TableHead className="text-label-2">전화번호</TableHead>
                <TableHead className="text-label-2">지역</TableHead>
                <TableHead className="text-label-2">취업상태</TableHead>
                <TableHead className="text-label-2">Primary Interest</TableHead>
                <TableHead className="text-label-2">유입</TableHead>
                <TableHead className="text-label-2">가입일</TableHead>
                <TableHead className="text-label-2">지원금 관심</TableHead>
                <TableHead className="text-label-2">Lead</TableHead>
                <TableHead className="text-label-2">마케팅동의</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => {
                const summary = supportSummaries.get(user.id);
                return (
                  <TableRow key={user.id} className="text-label-1">
                    <TableCell className="font-semibold">
                      <Link
                        href={`/admin/users/${user.id}`}
                        className="text-brand-blue-600 hover:underline"
                      >
                        {user.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <span>{user.email}</span>
                        {user.isTestAccount && (
                          <Badge
                            variant="outline"
                            className="rounded-md border-amber-300 text-label-2 text-amber-600"
                            title="0015_seed.sql / e2e·smoke 스크립트가 생성한 개발용 테스트 계정입니다. 운영 전 정리 대상 (@baro.local)."
                          >
                            테스트
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-600">{user.phone}</TableCell>
                    <TableCell>{user.region}</TableCell>
                    <TableCell>{user.employmentStatus}</TableCell>
                    <TableCell>{user.primaryInterest ?? "-"}</TableCell>
                    <TableCell>{user.signupChannel}</TableCell>
                    <TableCell className="text-slate-500">{user.joinedAt}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {summary?.hasCompletedAssessment && (
                          <Badge variant="outline" className="rounded-md text-label-2">
                            검사완료
                          </Badge>
                        )}
                        {summary && summary.highEligibilityCount > 0 && (
                          <Badge className="rounded-md border-0 bg-emerald-50 text-label-2 text-emerald-700">
                            높은가능성 {summary.highEligibilityCount}
                          </Badge>
                        )}
                        {summary?.trainingInterest && (
                          <Badge variant="outline" className="rounded-md text-label-2">
                            #교육지원관심
                          </Badge>
                        )}
                        {summary?.regionalInterest && (
                          <Badge variant="outline" className="rounded-md text-label-2">
                            #지역지원관심
                          </Badge>
                        )}
                        {!summary?.hasCompletedAssessment &&
                          !summary?.trainingInterest &&
                          !summary?.regionalInterest &&
                          (!summary || summary.highEligibilityCount === 0) && (
                            <span className="text-slate-300">-</span>
                          )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={cn(
                          "rounded-md border-0 px-2 text-label-2 font-bold",
                          gradeClass(user.leadGrade),
                        )}
                      >
                        {user.leadGrade}
                        {user.leadScore !== undefined ? ` ${user.leadScore}` : ""}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {/* 스펙 31번: Lead Grade와 별개 축으로 표시 - "영업 가능"이 아니라 "마케팅 수신 동의" 상태만 표시한다. */}
                      {user.marketingConsent ? (
                        <Badge className="rounded-md border-0 bg-brand-blue-50 text-label-2 text-brand-blue-700">동의</Badge>
                      ) : (
                        <Badge variant="outline" className="rounded-md text-label-2 text-slate-400">
                          미동의
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredUsers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={11} className="py-10 text-center text-slate-400">
                    조건에 맞는 회원이 없습니다.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2 text-label-1">
          <Link
            href={buildHref(sp, { page: String(Math.max(1, page - 1)) })}
            className={cn(
              "rounded-md px-3 py-1.5",
              page <= 1 ? "pointer-events-none text-slate-300" : "text-slate-600 hover:bg-slate-100",
            )}
          >
            이전
          </Link>
          <span className="text-slate-500">
            {page} / {totalPages}
          </span>
          <Link
            href={buildHref(sp, { page: String(Math.min(totalPages, page + 1)) })}
            className={cn(
              "rounded-md px-3 py-1.5",
              page >= totalPages ? "pointer-events-none text-slate-300" : "text-slate-600 hover:bg-slate-100",
            )}
          >
            다음
          </Link>
        </div>
      )}
    </AdminPageShell>
  );
}
