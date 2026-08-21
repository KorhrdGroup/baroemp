import Image from "next/image";
import { CheckCircle2, IdCard, KeyRound } from "lucide-react";

/**
 * 메인 히어로 그래픽.
 * 일러스트 위에 서비스 단계를 나타내는 작은 카드 3개를 띄운다.
 * 카드 위치는 일러스트가 아니라 이 박스 기준이라 이미지가 바뀌어도 그대로 쓸 수 있다.
 */
export function HeroIllustration() {
  return (
    <div className="relative mx-auto aspect-[3/2] w-full max-w-2xl select-none">
      <Image
        src="/images/hero-illustration.png"
        alt="계단을 함께 오르며 취업에 성공하는 중장년 구직자들"
        fill
        priority
        sizes="(min-width: 1024px) 42rem, 100vw"
        // 배경이 투명한 PNG라 그대로 얹으면 된다.
        // (흰 배경 JPG 시절 쓰던 mix-blend-multiply 는 불필요해져 제거)
        className="object-contain"
      />

      <div className="absolute left-1 top-4 flex items-center gap-2 rounded-xl bg-white px-4 py-3 ring-1 ring-border sm:-left-3 sm:top-6">
        <span className="flex size-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
          <CheckCircle2 className="size-5" />
        </span>
        <div className="text-left">
          <p className="text-label-2 text-slate-400">직업진단 완료</p>
          <p className="text-label-1 font-semibold text-slate-800">적합도 85%</p>
        </div>
      </div>

      <div className="absolute -right-1 top-20 flex items-center gap-2 rounded-xl bg-white px-4 py-3 ring-1 ring-border sm:-right-3 sm:top-24">
        <span className="flex size-9 items-center justify-center rounded-xl bg-brand-blue-50 text-brand-blue-600">
          <IdCard className="size-5" />
        </span>
        <div className="text-left">
          <p className="text-label-2 text-slate-400">서류 첨삭</p>
          <p className="text-label-1 font-semibold text-slate-800">이력서 완성</p>
        </div>
      </div>

      <div className="absolute bottom-4 left-3 flex items-center gap-2 rounded-xl bg-white px-4 py-3 ring-1 ring-border sm:bottom-2 sm:-left-3">
        <span className="flex size-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
          <KeyRound className="size-5" />
        </span>
        <div className="text-left">
          <p className="text-label-2 text-slate-400">전국 채용</p>
          <p className="text-label-1 font-semibold text-slate-800">1,200건 매칭</p>
        </div>
      </div>
    </div>
  );
}
