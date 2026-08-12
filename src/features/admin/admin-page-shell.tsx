import { EmptyState } from "@/components/common/empty-state";
import type { LucideIcon } from "lucide-react";

interface AdminPageShellProps {
  title: string;
  description: string;
  icon?: LucideIcon;
  children?: React.ReactNode;
}

/**
 * 세부 기능이 아직 없는 관리자 페이지의 공통 골격.
 * 404 대신 준비중 UI를 보여주며, children이 있으면 그 내용을 렌더링한다.
 */
export function AdminPageShell({ title, description, icon, children }: AdminPageShellProps) {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900">{title}</h1>
        <p className="mt-1 text-[13px] text-slate-500">{description}</p>
      </div>
      {children ?? (
        <EmptyState
          icon={icon}
          title={`${title} 준비 중`}
          description="STEP 1에서는 페이지 골격과 Mock 데이터 연동 지점만 제공합니다. 다음 STEP에서 CRUD와 Supabase 연동이 추가됩니다."
        />
      )}
    </div>
  );
}
