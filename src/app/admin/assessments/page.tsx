
import { ClipboardList } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminPageShell } from "@/features/admin/admin-page-shell";
import { getAssessmentAnalytics } from "@/services/assessment-analytics.service";
import { getAssessmentResponseAnalytics } from "@/services/assessment-response-analytics.service";
import { getAssessmentRepository } from "@/lib/repositories";

const SECTION_LABELS: Record<string, string> = {
  basic: "기본 취업조건",
  career: "경력/역량",
  personality: "직업 성향",
  condition: "근무조건",
  readiness: "준비/교육 의향",
};

export default async function AdminAssessmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string }>;
}) {
  const { section: sectionParam } = await searchParams;
  const assessments = await getAssessmentRepository().findAll();
  // "내게 맞는 직업 찾기"(활성 검사)만 노출한다. 비활성 legacy 검사는 관리 화면에서 숨긴다.
  const assessment = assessments.find((a) => a.isActive) ?? assessments[0];

  if (!assessment) {
    return (
      <AdminPageShell title="내게 맞는 직업찾기" description="검사 데이터가 없습니다." icon={ClipboardList}>
        <p className="text-label-1 text-slate-500">활성화된 검사가 없습니다.</p>
      </AdminPageShell>
    );
  }

  const [analytics, responses] = await Promise.all([
    getAssessmentAnalytics(assessment.id),
    getAssessmentResponseAnalytics(assessment),
  ]);

  const stats = [
    ["검사 시작", `${analytics.startedCount}건`],
    ["검사 완료", `${analytics.completedCount}건`],
    ["완료율", `${analytics.completionRate}%`],
    ["응답 세션", `${responses.answeredSessions}건`],
    ["문항 수", `${assessment.questions.length}문항`],
  ] as const;

  const sections = assessment.sections?.length
    ? assessment.sections.map((s) => s.key)
    : [...new Set(assessment.questions.map((q) => q.section))];
  const activeSection = sections.includes(sectionParam ?? "") ? (sectionParam as string) : sections[0];
  const visibleQuestions = responses.questions.filter((q) => q.section === activeSection);

  return (
    <AdminPageShell
      title="내게 맞는 직업찾기"
      description="문항별로 어떤 나이대 회원이 어떤 답을 몇 번 선택했는지 보여줍니다."
      icon={ClipboardList}
    >
      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
        {stats.map(([label, value]) => (
          <Card key={label} className="rounded-xl border-0 bg-white py-0 shadow-none ring-1 ring-slate-200">
            <CardHeader className="px-4 pt-4 pb-0">
              <CardTitle className="text-label-2 font-medium text-slate-500">{label}</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-title-2 font-bold text-slate-900">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <h2 className="mt-6 text-body-2 font-bold text-slate-800">
        문항별 응답 분포
        <span className="ml-2 text-label-2 font-normal text-slate-400">
          숫자는 해당 답을 선택한 횟수입니다. 연령대는 회원 프로필 기준.
        </span>
      </h2>

      {/* 섹션 탭 */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {sections.map((key) => (
          <a
            key={key}
            href={`/admin/assessments?section=${key}`}
            className={
              key === activeSection
                ? "rounded-full bg-brand-blue-500 px-4 py-1.5 text-label-1 font-semibold text-white"
                : "rounded-full bg-white px-4 py-1.5 text-label-1 font-medium text-slate-600 ring-1 ring-slate-200 hover:bg-brand-blue-50 hover:text-brand-blue-600"
            }
          >
            {SECTION_LABELS[key] ?? key}
          </a>
        ))}
      </div>

      {responses.answeredSessions === 0 ? (
        <Card className="mt-3 rounded-xl border-0 bg-white py-0 shadow-none ring-1 ring-slate-200">
          <CardContent className="px-4 py-8 text-center text-label-1 text-slate-400">
            아직 응답 데이터가 없습니다. 회원이 검사를 진행하면 여기에 실시간으로 집계됩니다.
          </CardContent>
        </Card>
      ) : (
        <div className="mt-3 space-y-4">
          {visibleQuestions.map((q) => {
            const maxTotal = Math.max(1, ...q.rows.map((r) => r.total));
            return (
              <div key={q.questionId}>
                <Card className="rounded-xl border-0 bg-white py-0 shadow-none ring-1 ring-slate-200">
                  <CardHeader className="border-b border-slate-100 px-4 py-3">
                    <CardTitle className="text-label-1">
                      {q.questionText}
                      <span className="ml-2 text-label-2 font-normal text-slate-400">
                        응답 {q.answeredCount}건
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-0 py-0">
                    {q.rows.length === 0 ? (
                      <p className="px-4 py-4 text-label-2 text-slate-400">응답 없음</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                              <TableHead className="min-w-44 text-label-2">답변</TableHead>
                              <TableHead className="text-label-2">전체</TableHead>
                              {responses.ageColumns.map((age) => (
                                <TableHead key={age} className="text-label-2">
                                  {age}
                                </TableHead>
                              ))}
                              <TableHead className="w-32 text-label-2">비율</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {q.rows.map((row) => (
                              <TableRow key={row.label} className="text-label-1">
                                <TableCell className="font-medium text-slate-700">{row.label}</TableCell>
                                <TableCell className="font-semibold text-slate-900">{row.total}</TableCell>
                                {responses.ageColumns.map((age) => (
                                  <TableCell
                                    key={age}
                                    className={row.byAge[age] ? "font-semibold text-brand-blue-600" : "text-slate-300"}
                                  >
                                    {row.byAge[age] || "·"}
                                  </TableCell>
                                ))}
                                <TableCell>
                                  <div className="h-1.5 w-24 rounded-full bg-slate-100">
                                    <div
                                      className="h-1.5 rounded-full bg-brand-blue-500"
                                      style={{ width: `${Math.max(4, Math.round((row.total / maxTotal) * 100))}%` }}
                                    />
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
      )}
    </AdminPageShell>
  );
}
