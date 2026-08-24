import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeroIllustration } from "./hero-illustration";
import { HeroJobSearch } from "./hero-job-search";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gov-surface">
      {/*
       * 고용24 메인의 파스텔 그라데이션 톤.
       * 분홍은 왼쪽 위 모서리에만 남기고 나머지는 파랑 계열이 끌고 간다.
       * (분홍 구간을 넓게 잡으면 텍스트 영역 전체가 핑크로 읽힌다)
       */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(115deg,var(--gov-blush)_0%,var(--gov-lavender)_16%,var(--gov-sky)_42%,var(--gov-blue)_70%,var(--gov-ice)_100%)]" />
        <div className="absolute -right-32 -top-24 size-[38rem] rounded-full bg-gov-blue opacity-70 blur-3xl" />
        <div className="absolute -bottom-40 left-1/4 size-[30rem] rounded-full bg-gov-sky opacity-80 blur-3xl" />
        <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-b from-transparent to-white" />
      </div>

      <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-2 lg:px-8 lg:py-24">
        <div>
          <p className="text-body-2 font-semibold text-brand-blue-600">
            중장년의 새로운 시작, 한평생 함께합니다
          </p>
          <h1 className="mt-4 font-gangwon text-headline-3 font-normal tracking-tight text-slate-900 sm:text-headline-1">
            내게 맞는 일자리를 찾고
            <br />
            <span className="text-brand-blue-600">취업 성공까지 한 번에!</span>
          </h1>
          <p className="mt-5 max-w-xl text-body-2-reading text-slate-600">
            직업진단부터 취업교육, 채용정보, 컨설팅, 지원금까지
            <br className="hidden sm:block" />
            당신의 취업 여정을 함께하는 원스톱 취업 플랫폼
          </p>

          {/*
            모바일에서도 두 버튼을 한 줄에 둔다. 375px에서는 두 문구를 한 줄로 펴면
            넘치므로 폭을 반씩 나눠 갖고 줄바꿈을 허용한다(어절 단위로만 끊기게 break-keep).
            sm 이상은 원래대로 내용 폭.
          */}
          {/*
            검색창이 버튼 줄과 같은 폭으로 보이게, 둘을 w-fit 상자에 함께 넣는다.
            상자 폭이 가장 넓은 자식(버튼 줄)에 맞고 검색창은 블록이라 그 폭을 채운다.
            모바일은 버튼이 flex-1로 폭을 나눠 가지므로 상자를 w-full로 둔다.
          */}
          <div className="mt-8 w-full sm:w-fit">
          <div className="flex gap-3">
            <Button
              size="lg"
              className="h-auto min-h-12 flex-1 whitespace-normal break-keep rounded-lg bg-brand-blue-400 px-4 py-2.5 text-body-2 font-semibold hover:bg-brand-blue-600 sm:flex-none sm:px-6"
              asChild
            >
              <Link href="/assessment">
                내게 맞는 직업 진단하기
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-auto min-h-12 flex-1 whitespace-normal break-keep rounded-lg border-brand-blue-200 bg-white px-4 py-2.5 text-body-2 font-semibold text-brand-blue-700 hover:bg-brand-blue-50 sm:flex-none sm:px-6"
              asChild
            >
              <Link href="/jobs">취업 가능 일자리 보기</Link>
            </Button>
          </div>

          <HeroJobSearch />
          </div>
        </div>

        <HeroIllustration />
      </div>
    </section>
  );
}
