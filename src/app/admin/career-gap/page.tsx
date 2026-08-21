import { TrendingUp } from "lucide-react";
import { AdminPageShell } from "@/features/admin/admin-page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CareerGapMarketSelector } from "@/features/admin/career-gap-market-selector";
import { CareerGapRecalculateButton } from "@/features/admin/career-gap-recalculate-button";
import { getEmploymentDestinationRepository, getOccupationRepository, getCareerRequirementRepository } from "@/lib/repositories";
import { getOrComputeMarketSnapshot } from "@/services/market-requirement.service";
import { findContentOpportunities } from "@/services/career-gap-analytics.service";
import type { EmploymentDestination, Occupation, RequirementCategory } from "@/types";

const CATEGORY_LABELS: Record<string, string> = {
  QUALIFICATION: "자격",
  SKILL: "스킬",
  EXPERIENCE: "경력",
  DRIVING: "운전",
  EDUCATION: "학력",
  COMPUTER: "컴퓨터활용",
  EMPLOYMENT_TYPE: "고용형태",
  WORK_SCHEDULE: "근무시간",
  LANGUAGE: "외국어",
  PHYSICAL: "체력",
  OTHER: "기타",
};
function categoryLabel(category: RequirementCategory): string {
  return CATEGORY_LABELS[category] ?? category;
}

const CONFIDENCE_LABELS: Record<string, string> = { HIGH: "표본 충분", MEDIUM: "보통", LOW: "참고용(표본 부족)" };
const CONFIDENCE_STYLE: Record<string, string> = {
  HIGH: "bg-emerald-50 text-emerald-700",
  MEDIUM: "bg-amber-50 text-amber-700",
  LOW: "bg-slate-100 text-slate-500",
};

function groupDestinationsByOccupation(destinations: EmploymentDestination[]): Record<string, EmploymentDestination[]> {
  const map: Record<string, EmploymentDestination[]> = {};
  for (const d of destinations) {
    if (!map[d.occupationId]) map[d.occupationId] = [];
    map[d.occupationId].push(d);
  }
  return map;
}

interface AdminCareerGapSearchParams {
  occupationId?: string;
  destinationId?: string;
}

/**
 * 관리자 시장 Requirement Analytics (STEP 7.5 스펙 40/41번).
 * 직업/취업처를 선택하면 실제 jobs 데이터 기반 시장 요구조건 통계와,
 * 시장 요구율은 높지만 아직 Content Catalog에 없는 "Content Opportunity"를 함께 보여준다.
 */
export default async function AdminCareerGapMarketPage({
  searchParams,
}: {
  searchParams: Promise<AdminCareerGapSearchParams>;
}) {
  const sp = await searchParams;
  const [occupations, destinations, requirements] = await Promise.all([
    getOccupationRepository().findAll(),
    getEmploymentDestinationRepository().findAll(),
    getCareerRequirementRepository().findAll(),
  ]);
  const requirementById = new Map(requirements.map((r) => [r.id, r]));
  const destinationsByOccupationId = groupDestinationsByOccupation(destinations);

  const occupationId = sp.occupationId;
  const destinationId = sp.destinationId;
  const occupation = occupations.find((o: Occupation) => o.id === occupationId);
  const destination = destinationId ? destinations.find((d) => d.id === destinationId) : undefined;

  const snapshot = occupationId ? await getOrComputeMarketSnapshot({ occupationId, destinationId }) : null;
  const opportunities = snapshot ? await findContentOpportunities(snapshot) : [];
  const opportunityByRequirementId = new Map(opportunities.map((o) => [o.requirementId, o]));

  const sortedStats = snapshot
    ? [...snapshot.requirements].filter((s) => s.mentionCount > 0).sort((a, b) => b.mentionRate - a.mentionRate)
    : [];

  return (
    <AdminPageShell
      title="취업 준비도 시장분석"
      description="직업/취업처별 실제 채용공고 요구조건 통계 (STEP 7.5 Career Gap Engine 시장 데이터)"
      icon={TrendingUp}
    >
      <div className="space-y-5">
        <Card className="rounded-xl border-0 bg-white py-0 shadow-none ring-1 ring-slate-200">
          <CardContent className="flex flex-wrap items-end justify-between gap-3 px-4 py-4">
            <CareerGapMarketSelector
              occupations={occupations}
              destinationsByOccupationId={destinationsByOccupationId}
              occupationId={occupationId}
              destinationId={destinationId}
            />
            {occupationId && <CareerGapRecalculateButton occupationId={occupationId} employmentDestinationId={destinationId} />}
          </CardContent>
        </Card>

        {!snapshot ? (
          <p className="rounded-xl bg-white px-4 py-10 text-center text-label-1 text-slate-400 ring-1 ring-slate-200">
            분석할 직업을 선택하세요.
          </p>
        ) : (
          <>
            <Card className="rounded-xl border-0 bg-white py-0 shadow-none ring-1 ring-slate-200">
              <CardContent className="flex flex-wrap items-center justify-between gap-3 px-4 py-4">
                <div>
                  <p className="text-body-2 font-bold text-slate-800">
                    {occupation?.name ?? "직업 미지정"}
                    {destination ? ` · ${destination.name}` : " · 전체"}
                  </p>
                  <p className="mt-1 text-label-1 text-slate-500">
                    분석 대상 공고 {snapshot.sampleSize}건 · {snapshot.periodStart} ~ {snapshot.periodEnd} (최근{" "}
                    {snapshot.periodDays}일 + 활성 공고)
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {snapshot.isMockData && (
                    <Badge className="rounded-md border-0 bg-rose-50 text-rose-700">테스트 데이터 (MockJobProvider)</Badge>
                  )}
                  <Badge className={`rounded-md border-0 ${CONFIDENCE_STYLE[snapshot.confidence]}`}>
                    {CONFIDENCE_LABELS[snapshot.confidence]}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {snapshot.confidence === "LOW" && (
              <p className="rounded-lg bg-rose-50 px-4 py-2.5 text-label-1 text-rose-700">
                관련 공고가 아직 충분하지 않아(10건 미만) 아래 통계는 참고용입니다.
              </p>
            )}

            <Card className="rounded-xl border-0 bg-white py-0 shadow-none ring-1 ring-slate-200">
              <CardHeader className="border-b border-slate-100 px-4 py-3">
                <CardTitle className="text-label-1">TOP Requirements (시장 요구조건 통계)</CardTitle>
              </CardHeader>
              <CardContent className="px-0 py-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>조건</TableHead>
                      <TableHead>구분</TableHead>
                      <TableHead>필수</TableHead>
                      <TableHead>우대</TableHead>
                      <TableHead>언급률</TableHead>
                      <TableHead>Content Opportunity</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedStats.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="py-10 text-center text-slate-400">
                          분석된 요구조건이 없습니다.
                        </TableCell>
                      </TableRow>
                    ) : (
                      sortedStats.map((stat) => {
                        const requirement = requirementById.get(stat.requirementId);
                        const opportunity = opportunityByRequirementId.get(stat.requirementId);
                        return (
                          <TableRow key={stat.requirementId} className="text-label-1">
                            <TableCell className="font-medium text-slate-700">{requirement?.name ?? stat.requirementId}</TableCell>
                            <TableCell className="text-slate-500">
                              {requirement ? categoryLabel(requirement.category) : "-"}
                            </TableCell>
                            <TableCell>
                              {stat.requiredCount}건 ({stat.requiredRate}%)
                            </TableCell>
                            <TableCell>
                              {stat.preferredCount}건 ({stat.preferredRate}%)
                            </TableCell>
                            <TableCell className="font-semibold text-brand-blue-600">{stat.mentionRate}%</TableCell>
                            <TableCell>
                              {opportunity && !opportunity.hasContent ? (
                                <Badge className="rounded-md border-0 bg-rose-50 text-rose-600">
                                  Content 없음 · 신규 교육과정 후보
                                </Badge>
                              ) : (
                                <span className="text-slate-300">-</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <p className="text-label-2 text-slate-400">
              ※ Content Opportunity는 관리자 내부 콘텐츠 기획 참고용이며, 사용자에게 상품 추천으로 직접 노출되지 않습니다
              (스펙 41번).
            </p>
          </>
        )}
      </div>
    </AdminPageShell>
  );
}
