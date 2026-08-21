import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  className?: string;
  action?: React.ReactNode;
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  className,
  action,
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3",
        align === "center" && "items-center text-center",
        // 가운데 정렬일 때는 action을 옆에 두면 제목이 화면 중앙에서 밀린다. 아래에 놓는다.
        action && align !== "center" && "sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div>
        {eyebrow && (
          <p className="text-label-1 font-semibold text-brand-blue-600">{eyebrow}</p>
        )}
        <h2 className="mt-1 text-title-2 font-bold tracking-tight text-slate-900 sm:text-headline-3">
          {title}
        </h2>
        {description && (
          <p className="mt-2 text-body-2-reading text-slate-500">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
