import Link from "next/link";
import { ArrowRight, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/layout/logo";

const testimonials = [
  {
    id: "t1",
    quote: "55세에 요양보호사로 재취업했어요. 자격증 과정 연계가 정말 큰 도움이 됐습니다.",
    author: "김O순 · 요양보호사",
  },
  {
    id: "t2",
    quote: "이력서 첨삭을 받고 면접 제안이 확 늘었어요. 자신감을 되찾았습니다.",
    author: "박O수 · 사무행정직",
  },
];

export function CtaSection() {
  return (
    // 앞 섹션과 배경색이 같아 구분이 약하므로 여백을 넉넉히 준다.
    <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 gap-6 rounded-2xl bg-brand-navy-900 p-8 sm:p-10 lg:grid-cols-2">
        <div className="flex flex-col justify-center">
          <Logo variant="onDark" height={22} className="mb-5" />
          <p className="text-label-1 font-semibold text-brand-blue-300">중장년 취업 성공 스토리</p>
          {/* 히어로 h1과 같은 독립고딕. 굵기는 400 하나뿐이라 히어로처럼 font-normal로 둔다. */}
          <h2 className="mt-3 text-title-2 font-extrabold tracking-tight text-white sm:text-headline-3">
            당신도 할 수 있습니다!
          </h2>
          <p className="mt-3 max-w-md text-body-2-reading text-slate-300">
            평균 두 달 안에 새로운 시작을 함께한 회원님들의 이야기를 들어보세요.
          </p>
          <Button
            className="mt-6 w-fit rounded-lg bg-white text-brand-navy-900 hover:bg-slate-100"
            asChild
          >
            <Link href="/consulting">
              나도 컨설팅 받기
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {testimonials.map((t) => (
            <div key={t.id} className="flex flex-col rounded-xl bg-white/10 p-5">
              <div className="flex gap-0.5 text-amber-300">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="size-3.5 fill-amber-300" />
                ))}
              </div>
              <p className="mt-3 text-label-1 text-slate-100">&ldquo;{t.quote}&rdquo;</p>
              {/*
                작성자는 카드 오른쪽 아래에 붙인다. mt-auto 가 남는 세로 공간을 밀어내서
                후기 길이가 서로 달라도 두 카드의 작성자 줄이 같은 높이에 놓인다.
              */}
              <p className="mt-auto pt-3 text-right text-label-2 font-semibold text-slate-400">
                {t.author}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
