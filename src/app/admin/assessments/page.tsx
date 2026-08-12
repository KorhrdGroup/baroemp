import Link from "next/link";
import { ClipboardList, Plus } from "lucide-react";
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
import { getAssessmentAnalytics } from "@/services/assessment-analytics.service";
import { getAssessmentRepository } from "@/lib/repositories";

export default async function AdminAssessmentsPage() {
  const assessments = await getAssessmentRepository().findAll();
  const rows = await Promise.all(
    assessments.map(async (assessment) => ({
      assessment,
      analytics: await getAssessmentAnalytics(assessment.id),
    })),
  );

  return (
    <AdminPageShell
      title="직업검사 관리"
      description="검사(Assessment) 카탈로그와 문항 구성을 관리합니다. Career DB Generator의 핵심 기능입니다."
      icon={ClipboardList}
    >
      <div className="mb-3 flex justify-end">
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-[12px] text-slate-500">
          <Plus className="size-3.5" />
          검사 생성은 V1에서 Seed 기반으로 관리되며, 문항 추가/수정은 상세 페이지에서 확인합니다.
        </span>
      </div>
      <div className="overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                <TableHead className="text-[12px]">검사명</TableHead>
                <TableHead className="text-[12px]">상태</TableHead>
                <TableHead className="text-[12px]">문항수</TableHead>
                <TableHead className="text-[12px]">시작수</TableHead>
                <TableHead className="text-[12px]">완료수</TableHead>
                <TableHead className="text-[12px]">완료율</TableHead>
                <TableHead className="text-[12px]">평균 Lead Score</TableHead>
                <TableHead className="text-[12px]">생성일</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(({ assessment, analytics }) => (
                <TableRow key={assessment.id} className="text-[13px]">
                  <TableCell className="font-semibold">
                    <Link href={`/admin/assessments/${assessment.id}`} className="text-brand-blue-600 hover:underline">
                      {assessment.title}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge className={assessment.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}>
                      {assessment.isActive ? "활성" : "비활성"}
                    </Badge>
                  </TableCell>
                  <TableCell>{assessment.questions.length}문항</TableCell>
                  <TableCell>{analytics.startedCount}</TableCell>
                  <TableCell>{analytics.completedCount}</TableCell>
                  <TableCell>{analytics.completionRate}%</TableCell>
                  <TableCell>{analytics.averageLeadScoreOfCompleters}</TableCell>
                  <TableCell>{assessment.createdAt.slice(0, 10)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </AdminPageShell>
  );
}
