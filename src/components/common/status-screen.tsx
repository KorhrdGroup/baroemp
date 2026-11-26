import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * 화면 대신 보여 주는 안내 한 장 (없는 주소 · 불러오기 실패).
 * 세부 화면과 같은 구성: 옅은 회색 바탕에 흰 카드 하나(모서리 20px, 테두리 · 그림자 없음).
 * 훅을 쓰지 않아 서버(not-found) · 클라이언트(error) 양쪽에서 그대로 쓴다. 누를 것은 부르는 쪽이 children 으로 넣는다.
 */
export function StatusScreen({
  icon: Icon,
  title,
  description,
  children,
  className,
}: {
  icon: LucideIcon;
  title: string;
  /** 문장마다 한 줄. 문장 가운데서 줄이 바뀌지 않게 문장 단위로 나눠 받는다. */
  description: string[];
  /** 단추들. 가장 먼저 놓인 것이 주 동작이다. */
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("draft3-theme flex flex-1 items-center justify-center bg-baro-page px-4.5 py-16 sm:py-24", className)}>
      <div className="w-full max-w-md rounded-card bg-white px-6 py-10 text-center sm:px-10 sm:py-12">
        <span aria-hidden className="mx-auto flex size-16 items-center justify-center rounded-full bg-baro-blue-50 text-baro-blue">
          <Icon className="size-8" />
        </span>
        <h1 className="mt-6 text-title-2 font-extrabold tracking-[-0.02em] break-keep text-slate-900">{title}</h1>
        <p className="mt-3 text-body-2-reading font-medium break-keep text-slate-600">
          {/* 문장마다 줄을 바꾼다. 좁은 화면에서 한 문장이 두 줄이 되면 두 줄 길이를 비슷하게 맞춘다. */}
          {description.map((line) => (
            <span key={line} className="block text-balance">
              {line}
            </span>
          ))}
        </p>
        <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:justify-center">{children}</div>
      </div>
    </div>
  );
}

/** StatusScreen 안 단추 모양. 링크(<Link>)와 단추(<button>)가 같은 클래스를 쓴다. */
export const statusPrimaryClass =
  "flex h-12 cursor-pointer items-center justify-center rounded-xl bg-baro-blue px-6 text-body-2 font-bold text-white";
export const statusSecondaryClass =
  "flex h-12 cursor-pointer items-center justify-center rounded-xl border border-slate-300 bg-white px-6 text-body-2 font-semibold text-slate-800";
