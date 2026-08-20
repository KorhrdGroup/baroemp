import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeroIllustration } from "./hero-illustration";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-brand-blue-50">
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-2 lg:px-8 lg:py-24">
        <div>
          <p className="text-body-2 font-semibold text-brand-blue-600">
            중장년의 새로운 시작, 한평생 함께합니다
          </p>
          <h1 className="mt-4 font-dongnim text-headline-3 font-normal tracking-tight text-slate-900 sm:text-headline-1">
            내게 맞는 일자리를 찾고
            <br />
            <span className="text-brand-blue-600">취업 성공까지 한 번에!</span>
          </h1>
          <p className="mt-5 max-w-xl text-body-2-reading text-slate-600">
            직업진단부터 취업교육, 채용정보, 컨설팅, 지원금까지
            <br className="hidden sm:block" />
            당신의 취업 여정을 함께하는 원스톱 취업 플랫폼
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button
              size="lg"
              className="h-12 rounded-lg bg-brand-blue-400 px-6 text-body-2 font-semibold hover:bg-brand-blue-600"
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
              className="h-12 rounded-lg border-brand-blue-200 bg-white px-6 text-body-2 font-semibold text-brand-blue-700 hover:bg-brand-blue-50"
              asChild
            >
              <Link href="/jobs">취업 가능 일자리 보기</Link>
            </Button>
          </div>

          <div className="mt-6 flex max-w-md items-center gap-2 rounded-xl border border-border bg-white px-4 py-3">
            <Search className="size-5 shrink-0 text-slate-400" />
            <input
              type="text"
              placeholder="관심 직종, 기업을 검색해보세요"
              className="w-full text-label-1 text-slate-700 placeholder:text-slate-400 focus:outline-none"
              aria-label="관심 직종, 기업 검색"
            />
          </div>
        </div>

        <HeroIllustration />
      </div>
    </section>
  );
}
