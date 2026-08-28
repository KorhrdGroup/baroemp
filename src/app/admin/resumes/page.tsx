import { FileText } from "lucide-react";
import { AdminPageShell } from "@/features/admin/admin-page-shell";
import { AdminResumeTemplates } from "@/features/admin/admin-resume-templates";
import { ResumeSalesLists } from "@/features/admin/resume-sales-lists";
import { getResumeSalesLeads } from "@/services/resume-sales-lead.service";
import {
  getResumeUsageStatsAction,
  listCoverLetterTemplatesAdminAction,
  listResumeTemplatesAdminAction,
} from "@/features/admin/resume-admin-actions";

export default async function AdminResumesPage() {
  const [resumeTemplates, coverLetterTemplates, usageStats, salesLeads] = await Promise.all([
    listResumeTemplatesAdminAction(),
    listCoverLetterTemplatesAdminAction(),
    getResumeUsageStatsAction(),
    getResumeSalesLeads(),
  ]);

  return (
    <AdminPageShell
      title="이력서·자소서"
      description="작성 현황에서 영업 대상자를 확인하고, 이력서/자기소개서 Template을 관리합니다."
      icon={FileText}
    >
      <div className="mb-6 space-y-3">
        <h2 className="text-body-1 font-semibold text-slate-900">영업 대상자</h2>
        <ResumeSalesLists leads={salesLeads} />
      </div>

      <AdminResumeTemplates
        resumeTemplates={resumeTemplates}
        coverLetterTemplates={coverLetterTemplates}
        usageStats={usageStats}
      />
    </AdminPageShell>
  );
}
