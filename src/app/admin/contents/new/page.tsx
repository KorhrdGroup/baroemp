import { AdminPageShell } from "@/features/admin/admin-page-shell";
import { ContentForm } from "@/features/admin/content-form";
import { BookOpen } from "lucide-react";

export default function AdminContentNewPage() {
  return (
    <AdminPageShell
      title="콘텐츠 신규 등록"
      description="Content Catalog에 새 콘텐츠를 추가합니다. 코드 수정 없이 DB/Mock Repository에 저장됩니다."
      icon={BookOpen}
    >
      <ContentForm />
    </AdminPageShell>
  );
}
