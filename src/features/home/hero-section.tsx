import { HeroIllustration } from "./hero-illustration";
import { HeroJobSearch } from "./hero-job-search";
import { HeroPopularKeywords } from "./hero-popular-keywords";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gov-surface">
      {/*
       * 배너 바탕은 옅은 파랑 한 갈래로만 둔다.
       * 색을 여러 갈래로 섞으면 위에 얹히는 흰 검색창·일러스트가 배경에 묻힌다.
       */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(160deg,#FFFFFF_0%,var(--gov-ice)_38%,var(--gov-sky)_100%)]" />
        <div className="absolute -right-32 -top-24 size-[38rem] rounded-full bg-white opacity-60 blur-3xl" />
      </div>

      {/*
       * 왼쪽은 문구와 검색, 오른쪽은 일러스트.
       * lg 미만에서는 일러스트를 아래로 내리고 문구를 가운데 정렬한다.
       */}
      <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-6 pt-8 pb-10 sm:pt-12 sm:pb-12 lg:grid-cols-2 lg:gap-8 lg:px-8 lg:pt-14 lg:pb-32">
        <div className="text-center lg:text-left">
          <p className="text-body-2 font-semibold text-brand-blue-600">중장년 취업지원 서비스</p>
          {/*
            leading 은 이 제목에만 예외로 둔다. 타이포 토큰의 기본 행간은 1.2 라
            두 줄짜리 배너 제목에서는 위아래가 붙어 보인다.
            굵기도 배너에서만 900 을 쓴다. 다른 제목은 800 이 기준이다.
          */}
          <h1 className="mt-4 text-headline-3 font-black leading-[1.35] tracking-tight text-slate-900 sm:text-headline-2">
            나에게 필요한 취업 서비스를
            <br />
            <span className="text-brand-blue-600">한곳에서 확인하세요</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-body-2-reading text-slate-600 lg:mx-0">
            직업진단부터 채용정보, 교육·지원금 정보까지
            <br className="hidden sm:block" />
            중장년의 취업 준비에 필요한 서비스를 제공합니다.
          </p>

          <HeroJobSearch />
          <HeroPopularKeywords />
        </div>

        {/* 넓은 화면에서 사진이 덮는 자리. 사진은 배너에 절대 배치라 여기서 자리만 비워둔다. */}
        <div aria-hidden className="hidden lg:block" />
      </div>

      <HeroIllustration />

      {/* 아래 섹션으로 이어지는 흰 띠. 사진 위에 얹혀야 해서 사진 뒤에 둔다. */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-white" />
    </section>
  );
}
