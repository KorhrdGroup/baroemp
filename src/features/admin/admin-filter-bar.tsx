import Link from "next/link";
import { cn } from "@/lib/utils";

export interface AdminFilterOption {
  label: string;
  href: string;
  selected: boolean;
  /** 선택지 옆에 함께 보여줄 건수 (없으면 표시하지 않음) */
  count?: number;
}

export interface AdminFilterGroup {
  label: string;
  options: AdminFilterOption[];
}

/**
 * 관리자 목록 화면의 필터 바.
 *
 * 작은 텍스트 링크를 한 줄에 몰아 넣으면 어디까지가 한 그룹인지, 무엇이 선택됐는지 읽기 어렵다.
 * 그룹마다 줄을 나누고 선택지를 칩으로 만들어 현재 선택 상태가 한눈에 보이게 한다.
 */
export function AdminFilterBar({ groups }: { groups: AdminFilterGroup[] }) {
  return (
    <div className="flex flex-col gap-2.5 rounded-xl bg-white p-4 ring-1 ring-slate-200">
      {groups.map((group) => (
        <div key={group.label} className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:gap-3">
          <span className="w-16 shrink-0 pt-1.5 text-label-2 font-semibold text-slate-500">{group.label}</span>
          <div className="flex flex-wrap gap-1.5">
            {group.options.map((option) => (
              <Link
                key={option.href + option.label}
                href={option.href}
                aria-current={option.selected ? "true" : undefined}
                className={cn(
                  "rounded-lg px-2.5 py-1.5 text-label-2 transition-colors",
                  option.selected
                    ? "bg-brand-blue-500 font-semibold text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                )}
              >
                {option.label}
                {typeof option.count === "number" && (
                  <span className={cn("ml-1", option.selected ? "text-white/70" : "text-slate-400")}>
                    {option.count.toLocaleString()}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
