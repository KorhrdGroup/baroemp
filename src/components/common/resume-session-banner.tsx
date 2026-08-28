import Link from "next/link";
import { RotateCcw } from "lucide-react";

/**
 * 하다 만 진단이 있을 때 소개 화면 위에 띄우는 안내.
 *
 * 시작 버튼은 늘 새 세션을 만들기 때문에, 이 안내가 없으면 중간에 나간 사람은
 * 매번 처음부터 다시 하게 되고 앞서 답한 내용은 버려진다.
 */
export function ResumeSessionBanner({
  href,
  onResume,
  progressLabel,
  updatedAt,
}: {
  /** 이어서 진행할 화면 경로 (페이지 이동으로 이어가는 경우) */
  href?: string;
  /** 같은 화면에서 상태만 복원해 이어가는 경우 */
  onResume?: () => void;
  /** "12문항 중 4문항" 처럼 어디까지 했는지 */
  progressLabel?: string;
  updatedAt?: string;
}) {
  const buttonClass =
    "shrink-0 rounded-lg bg-brand-blue-500 px-4 py-2 text-label-1 font-semibold text-white transition-colors hover:bg-brand-blue-600";

  return (
    <div className="mx-auto mb-4 flex max-w-3xl flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-blue-200 bg-brand-blue-50/70 px-4 py-3">
      <div className="flex items-start gap-2.5">
        <RotateCcw className="mt-0.5 size-4 shrink-0 text-brand-blue-600" aria-hidden />
        <div>
          <p className="text-label-1 font-semibold text-slate-900">이전에 진행하던 내용이 있어요</p>
          <p className="mt-0.5 text-label-2 text-slate-500">
            {progressLabel ? `${progressLabel}까지 진행했습니다.` : "진행 중인 내용이 남아 있습니다."}
            {updatedAt ? ` (${updatedAt.slice(0, 10)})` : ""} 이어서 하시겠어요?
          </p>
        </div>
      </div>
      {href ? (
        <Link href={href} className={buttonClass}>
          이어서 하기
        </Link>
      ) : (
        <button type="button" onClick={onResume} className={buttonClass}>
          이어서 하기
        </button>
      )}
    </div>
  );
}
