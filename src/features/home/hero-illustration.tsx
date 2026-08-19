import { Briefcase, CheckCircle2, IdCard, KeyRound } from "lucide-react";

/**
 * 첨부 레퍼런스 이미지의 "가방/ID카드/키링" 계열 일러스트를 CSS + lucide 아이콘으로 재구성한 영역.
 * 실제 이미지 파일에 의존하지 않아 깨진 이미지가 노출될 위험이 없다.
 */
export function HeroIllustration() {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-md select-none">
      <div className="absolute inset-6 rounded-3xl bg-gradient-to-br from-brand-blue-100 via-brand-blue-50 to-white" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative flex size-64 items-center justify-center rounded-full bg-white shadow-[0_20px_60px_-15px_rgba(37,99,235,0.35)] ring-1 ring-brand-blue-100 sm:size-72">
          <span className="flex size-36 items-center justify-center rounded-3xl bg-brand-blue-500 text-white shadow-lg sm:size-40">
            <Briefcase className="size-16 sm:size-20" strokeWidth={1.6} />
          </span>
        </div>
      </div>

      <div className="absolute left-2 top-6 flex items-center gap-2 rounded-2xl bg-white px-4 py-3 shadow-md ring-1 ring-border sm:left-0 sm:top-10">
        <span className="flex size-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
          <CheckCircle2 className="size-5" />
        </span>
        <div className="text-left">
          <p className="text-xs text-slate-400">직업진단 완료</p>
          <p className="text-sm font-semibold text-slate-800">적합도 85%</p>
        </div>
      </div>

      <div className="absolute right-0 top-24 flex items-center gap-2 rounded-2xl bg-white px-4 py-3 shadow-md ring-1 ring-border sm:right-2 sm:top-28">
        <span className="flex size-9 items-center justify-center rounded-xl bg-brand-blue-50 text-brand-blue-600">
          <IdCard className="size-5" />
        </span>
        <div className="text-left">
          <p className="text-xs text-slate-400">서류 첨삭</p>
          <p className="text-sm font-semibold text-slate-800">이력서 완성</p>
        </div>
      </div>

      <div className="absolute bottom-8 left-6 flex items-center gap-2 rounded-2xl bg-white px-4 py-3 shadow-md ring-1 ring-border sm:bottom-12 sm:left-2">
        <span className="flex size-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
          <KeyRound className="size-5" />
        </span>
        <div className="text-left">
          <p className="text-xs text-slate-400">전국 채용</p>
          <p className="text-sm font-semibold text-slate-800">1,200건 매칭</p>
        </div>
      </div>
    </div>
  );
}
