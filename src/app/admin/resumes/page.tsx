import { FileText } from "lucide-react";
import { AdminPageShell } from "@/features/admin/admin-page-shell";
import { AdminResumeTemplates } from "@/features/admin/admin-resume-templates";
import {
  getResumeUsageStatsAction,
  listCoverLetterTemplatesAdminAction,
  listResumeTemplatesAdminAction,
} from "@/features/admin/resume-admin-actions";

export default async function AdminResumesPage() {
  const [resumeTemplates, coverLetterTemplates, usageStats] = await Promise.all([
    listResumeTemplatesAdminAction(),
    listCoverLetterTemplatesAdminAction(),
    getResumeUsageStatsAction(),
  ]);

  return (
    <AdminPageShell
      title="이력서·자소서 Template 관리"
      description="이력서/자기소개서 Template을 추가·수정하고, 실제 작성 현황을 확인합니다."
      icon={FileText}
    >
      <AdminResumeTemplates
        resumeTemplates={resumeTemplates}
        coverLetterTemplates={coverLetterTemplates}
        usageStats={usageStats}
      />
    </AdminPageShell>
  );
}
