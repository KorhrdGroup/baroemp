import { Target } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AdminPageShell } from "@/features/admin/admin-page-shell";
import { getSalesLeads, labelIncomeBand, labelInsurance } from "@/services/sales-leads.service";
import { cn } from "@/lib/utils";

const TAG_CLASS: Record<string, string> = {
  "훈련의향 높음": "bg-emerald-50 text-emerald-700",
  "고용보험 없음": "bg-amber-50 text-amber-700",
  "국민취업지원 Ⅰ유형 후보": "bg-rose-50 text-rose-600",
  "자격 취득 제안 가능": "bg-brand-blue-50 text-brand-blue-600",
  "마케팅 동의": "bg-slate-100 text-slate-500",
};

export default async function AdminSalesLeadsPage() {
  const leads = await getSalesLeads();

  return (
    <AdminPageShell
      title="영업 리드"
      description="진단 데이터 기반 상담 제안 정보입니다. 태그가 많을수록 우선 컨택 대상이며, 제안 과정은 추천 1위 직업의 미보유 자격입니다."
      icon={Target}
    >
      <div className="overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                <TableHead className="text-label-2">이름</TableHead>
                <TableHead className="text-label-2">연락처</TableHead>
                <TableHead className="text-label-2">연령/지역</TableHead>
                <TableHead className="text-label-2">취업상태</TableHead>
                <TableHead className="text-label-2">추천 직업</TableHead>
                <TableHead className="text-label-2">제안 과정</TableHead>
                <TableHead className="text-label-2">고용보험</TableHead>
                <TableHead className="text-label-2">소득</TableHead>
                <TableHead className="text-label-2">훈련의향</TableHead>
                <TableHead className="text-label-2">영업 태그</TableHead>
                <TableHead className="text-label-2">가입일</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="py-10 text-center text-slate-400">
                    아직 리드가 없습니다. 회원이 진단을 완료하면 여기에 쌓입니다.
                  </TableCell>
                </TableRow>
              ) : (
                leads.map((lead) => (
                  <TableRow key={lead.userId} className="text-label-1">
                    <TableCell className="font-semibold text-slate-900">{lead.name}</TableCell>
                    <TableCell className="whitespace-nowrap">{lead.phone ?? "-"}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {[lead.ageLabel, lead.regionLabel].filter(Boolean).join(" · ") || "-"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{lead.employmentLabel ?? "-"}</TableCell>
                    <TableCell className="whitespace-nowrap">{lead.topOccupation ?? "-"}</TableCell>
                    <TableCell className="whitespace-nowrap font-semibold text-brand-blue-600">
                      {lead.proposedCourse ?? "-"}
                    </TableCell>
                    <TableCell>{labelInsurance(lead.insurance)}</TableCell>
                    <TableCell>{labelIncomeBand(lead.incomeBand)}</TableCell>
                    <TableCell>{lead.trainingWillingness != null ? `${lead.trainingWillingness}점` : "-"}</TableCell>
                    <TableCell>
                      <div className="flex max-w-72 flex-wrap gap-1">
                        {lead.tags.length === 0 ? (
                          <span className="text-slate-300">-</span>
                        ) : (
                          lead.tags.map((tag) => (
                            <span
                              key={tag}
                              className={cn(
                                "rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap",
                                TAG_CLASS[tag] ?? "bg-slate-100 text-slate-500",
                              )}
                            >
                              {tag}
                            </span>
                          ))
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-slate-400">{lead.joinedAt}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </AdminPageShell>
  );
}
