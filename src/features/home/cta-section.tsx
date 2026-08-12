import Link from "next/link";
import { ArrowRight, Star } from "lucide-react";
import { Button } from "@/components/ui/button";

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
    <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 gap-6 rounded-3xl bg-brand-navy-900 p-8 sm:p-10 lg:grid-cols-2">
        <div className="flex flex-col justify-center">
          <p className="text-sm font-semibold text-brand-blue-300">중장년 취업 성공 스토리</p>
          <h2 className="mt-3 text-2xl font-bold leading-snug text-white sm:text-3xl">
            당신도 할 수 있습니다!
          </h2>
          <p className="mt-3 max-w-md text-[15px] leading-7 text-slate-300">
            평균 두 달 안에 새로운 시작을 함께한 회원님들의 이야기를 들어보세요.
          </p>
          <Button
            className="mt-6 w-fit rounded-xl bg-white text-brand-navy-900 hover:bg-slate-100"
            asChild
          >
            <Link href="/consulting">
              성공 사례 보기
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {testimonials.map((t) => (
            <div key={t.id} className="flex flex-col rounded-2xl bg-white/10 p-5">
              <div className="flex gap-0.5 text-amber-300">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="size-3.5 fill-amber-300" />
                ))}
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-100">&ldquo;{t.quote}&rdquo;</p>
              <p className="mt-3 text-xs font-semibold text-slate-400">{t.author}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
