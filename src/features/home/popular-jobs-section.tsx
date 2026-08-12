import Link from "next/link";
import { ArrowRight, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SectionHeading } from "@/components/common/section-heading";
import { mockJobRoles } from "@/mocks/job-roles.mock";

export function PopularJobsSection() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
      <SectionHeading
        eyebrow="지금 많이 찾는"
        title="인기 직업"
        description="취업 수요가 높고 중장년에게 적합한 직업을 확인해보세요."
        action={
          <Link
            href="/jobs"
            className="flex items-center gap-1 text-sm font-semibold text-brand-blue-600 hover:underline"
          >
            전체 직업 보기
            <ArrowRight className="size-4" />
          </Link>
        }
      />

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {mockJobRoles.map((role) => (
          <Link
            key={role.id}
            href={`/jobs?category=${role.jobCategory}`}
            className="group flex flex-col rounded-2xl border border-border bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand-blue-200 hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-wrap gap-1.5">
                {role.isBeginnerFriendly && (
                  <Badge className="rounded-full border-0 bg-brand-blue-50 text-[11px] font-semibold text-brand-blue-600">
                    신입가능
                  </Badge>
                )}
                {role.tags.slice(0, 1).map((tag) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className="rounded-full text-[11px] font-medium text-slate-500"
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
              <div className="flex items-center gap-1 text-amber-500">
                <Star className="size-3.5 fill-amber-400 text-amber-400" />
                <span className="text-xs font-semibold text-slate-600">
                  {role.midlifeRecommendationScore.toFixed(1)}
                </span>
              </div>
            </div>

            <h3 className="mt-4 text-lg font-bold text-slate-900 group-hover:text-brand-blue-600">
              {role.name}
            </h3>
            <p className="mt-1 text-sm leading-6 text-slate-500">{role.shortDescription}</p>

            <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-sm">
              <span className="text-slate-500">
                채용중 <span className="font-semibold text-slate-800">{role.openPositionCount.toLocaleString()}건</span>
              </span>
              <span className="font-semibold text-slate-800">평균연봉 {role.averageSalaryText}</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
