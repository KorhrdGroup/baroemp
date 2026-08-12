import { KpiCards } from "@/features/admin/kpi-cards";
import { RecentLeadsTable } from "@/features/admin/recent-leads-table";
import { mockDashboardKpis } from "@/mocks/dashboard-kpi.mock";
import { mockLeads } from "@/mocks/leads.mock";

export default function AdminDashboardPage() {
  const highInterestLeads = mockLeads.filter((lead) =>
    ["A", "B"].includes(lead.score.grade),
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">대시보드</h1>
        <p className="mt-1 text-[13px] text-slate-500">
          Career DB 기반 회원·리드·활동 현황을 한눈에 확인합니다.
        </p>
      </div>

      <KpiCards items={mockDashboardKpis} />

      <RecentLeadsTable
        leads={highInterestLeads.length > 0 ? highInterestLeads : mockLeads}
        title="최근 고관심 Lead"
      />
    </div>
  );
}
