import Image from "next/image";
import { CheckCircle2, IdCard, KeyRound } from "lucide-react";

/**
 * 메인 히어로 그래픽.
 * 일러스트 위에 서비스 단계를 나타내는 작은 카드 3개를 띄운다.
 * 카드 위치는 일러스트가 아니라 이 박스 기준이라 이미지가 바뀌어도 그대로 쓸 수 있다.
 */
export function HeroIllustration() {
  return (
    <div className="relative mx-auto aspect-[3/2] w-full max-w-lg select-none">
      <Image
        src="/images/hero-illustration.jpg"
        alt="계단을 함께 오르며 취업에 성공하는 중장년 구직자들"
        fill
        priority
        sizes="(min-width: 1024px) 32rem, 100vw"
        // 흰 배경 JPG라 그대로 얹으면 컬러 그라데이션 위에 흰 사각형으로 보인다.
        // multiply로 흰색만 배경에 녹여 잘라낸 것처럼 만든다.
        className="object-contain mix-blend-multiply"
      />

      <div className="absolute left-2 top-6 flex items-center gap-2 rounded-xl bg-white px-4 py-3 ring-1 ring-border sm:left-0 sm:top-10">
        <span className="flex size-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
          <CheckCircle2 className="size-5" />
        </span>
        <div className="text-left">
          <p className="text-label-2 text-slate-400">직업진단 완료</p>
          <p className="text-label-1 font-semibold text-slate-800">적합도 85%</p>
        </div>
      </div>

      <div className="absolute right-0 top-24 flex items-center gap-2 rounded-xl bg-white px-4 py-3 ring-1 ring-border sm:right-2 sm:top-28">
        <span className="flex size-9 items-center justify-center rounded-xl bg-brand-blue-50 text-brand-blue-600">
          <IdCard className="size-5" />
        </span>
        <div className="text-left">
          <p className="text-label-2 text-slate-400">서류 첨삭</p>
          <p className="text-label-1 font-semibold text-slate-800">이력서 완성</p>
        </div>
      </div>

      <div className="absolute bottom-8 left-6 flex items-center gap-2 rounded-xl bg-white px-4 py-3 ring-1 ring-border sm:bottom-12 sm:left-2">
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
