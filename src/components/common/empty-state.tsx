import type { LucideIcon } from "lucide-react";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

/**
 * 아직 세부 기능이 구현되지 않은 페이지에서 공통으로 사용하는 "준비중" UI.
 * 절대 404를 노출하지 않기 위해 모든 스텁 페이지는 이 컴포넌트를 사용한다.
 */
export function EmptyState({ icon: Icon = Sparkles, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-brand-blue-50/40 px-6 py-20 text-center",
        className,
      )}
    >
      <span className="flex size-14 items-center justify-center rounded-xl bg-white text-brand-blue-600 ring-1 ring-border">
        <Icon className="size-7" />
      </span>
      <h3 className="mt-5 text-title-3 font-bold text-slate-900">{title}</h3>
      {description && (
        <p className="mt-2 max-w-md text-body-2-reading text-slate-500">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
