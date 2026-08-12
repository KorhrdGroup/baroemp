import { Target } from "lucide-react";
import { AdminPageShell } from "@/features/admin/admin-page-shell";
import { RecentLeadsTable } from "@/features/admin/recent-leads-table";
import { mockLeads } from "@/mocks/leads.mock";
import { LEAD_SCORING_RULES, LEAD_GRADE_THRESHOLDS } from "@/lib/leads/scoring-rules";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminLeadsPage() {
  return (
    <AdminPageShell
      title="리드관리"
      description="Lead Score 기반으로 상담 우선순위를 관리합니다. 점수 규칙은 설정 파일로 분리되어 있습니다."
      icon={Target}
    >
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <Card className="rounded-xl border-0 bg-white py-0 shadow-none ring-1 ring-slate-200">
            <CardHeader className="border-b border-slate-100 px-4 py-3">
              <CardTitle className="text-[14px]">점수 규칙</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 px-4 py-3">
              {LEAD_SCORING_RULES.map((rule) => (
                <div
                  key={rule.key}
                  className="flex items-center justify-between text-[13px]"
                >
                  <span className="text-slate-600">{rule.label}</span>
                  <span className="font-semibold text-brand-blue-600">+{rule.points}</span>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card className="rounded-xl border-0 bg-white py-0 shadow-none ring-1 ring-slate-200">
            <CardHeader className="border-b border-slate-100 px-4 py-3">
              <CardTitle className="text-[14px]">등급 기준</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 px-4 py-3">
              {LEAD_GRADE_THRESHOLDS.map((item) => (
                <div
                  key={item.grade}
                  className="flex items-center justify-between text-[13px]"
                >
                  <span className="font-semibold text-slate-800">{item.grade}등급</span>
                  <span className="text-slate-500">{item.minScore}점 이상</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <RecentLeadsTable leads={mockLeads} title="전체 Lead 목록" />
      </div>
    </AdminPageShell>
  );
}
