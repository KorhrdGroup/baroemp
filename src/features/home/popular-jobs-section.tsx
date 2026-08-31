import Link from "next/link";
import { cn } from "@/lib/utils";
import { cardShadowClass, interactiveCardClass } from "@/lib/ui-classes";
import { ArrowRight, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SectionHeading } from "@/components/common/section-heading";
import { mockJobRoles } from "@/mocks/job-roles.mock";

export function PopularJobsSection() {
  return (
    // 고용24처럼 흰 섹션 사이에 옅은 회청색 띠를 넣어 리듬을 만든다.
    <section className="bg-gov-surface py-24">
      <div className="mx-auto max-w-7xl px-4.5 lg:px-8">
        <SectionHeading
          title="지금 많이 찾는 인기 직업"
          description="취업 수요가 높고 중장년에게 적합한 직업을 확인해보세요."
          align="center"
        />

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {mockJobRoles.slice(0, 6).map((role) => (
            <Link
              key={role.id}
              href={`/jobs?category=${role.jobCategory}`}
              // 회청색 띠 위의 흰 카드라 테두리나 그림자 없이도 구분된다. 호버는 배경으로만 반응한다.
              className={cn("group flex flex-col rounded-xl bg-white p-5", cardShadowClass, interactiveCardClass)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-wrap gap-1.5">
                  {role.isBeginnerFriendly && (
                    <Badge className="rounded-full border-0 bg-brand-blue-50 text-label-2 font-semibold text-brand-blue-600">
                      신입가능
                    </Badge>
                  )}
                  {/* tags에도 "신입가능"이 들어 있는 직업이 있어 위 뱃지와 겹친다. 중복은 뺀다. */}
                  {role.tags
                    .filter((tag) => !(role.isBeginnerFriendly && tag === "신입가능"))
                    .slice(0, 1)
                    .map((tag) => (
                    <Badge
                      key={tag}
                      variant="outline"
                      className="rounded-full text-label-2 font-medium text-slate-500"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
                <div className="flex items-center gap-1 text-amber-500">
                  <Star className="size-3.5 fill-amber-400 text-amber-400" />
                  <span className="text-label-2 font-semibold text-slate-600">
                    {role.midlifeRecommendationScore.toFixed(1)}
                  </span>
                </div>
              </div>

              <h3 className="mt-4 text-body-1 font-bold text-slate-900">{role.name}</h3>
              <p className="mt-1 text-label-1 text-slate-500">{role.shortDescription}</p>

              <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-label-1">
                <span className="text-slate-500">
                  채용중{" "}
                  <span className="font-semibold text-brand-blue-600">
                    {role.openPositionCount.toLocaleString()}건
                  </span>
                </span>
                <span className="font-semibold text-slate-800">평균연봉 {role.averageSalaryText}</span>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-10 flex justify-center">
          <Link
            href="/jobs"
            className="inline-flex items-center gap-1.5 rounded-full border border-brand-blue-600 px-6 py-2.5 text-body-2 font-semibold text-brand-blue-600 transition-colors duration-200 hover:bg-brand-blue-600 hover:text-white"
          >
            내게 맞는 직업 찾기
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
