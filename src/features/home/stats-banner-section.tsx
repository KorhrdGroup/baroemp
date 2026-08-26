import { Users, FileText, Briefcase, Award } from "lucide-react";

const stats = [
  {
    id: "users",
    icon: Users,
    value: "12,480",
    unit: "명",
    label: "누적 회원 수",
  },
  {
    id: "resume",
    icon: FileText,
    value: "8,320",
    unit: "건",
    label: "이력서·자소서 첨삭",
  },
  {
    id: "jobs",
    icon: Briefcase,
    value: "34,500",
    unit: "건",
    label: "등록 채용공고",
  },
  {
    id: "success",
    icon: Award,
    value: "2,150",
    unit: "명",
    label: "취업 성공",
  },
];

export function StatsBannerSection() {
  return (
    <section className="bg-brand-blue-900 py-8">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-y-6 px-4 sm:px-6 lg:px-8">
        {stats.map((stat, i) => (
          <div key={stat.id} className="flex items-center">
            {i > 0 && (
              <div className="mx-6 hidden h-10 w-px bg-white/20 sm:mx-10 sm:block lg:mx-14" />
            )}
            <div className="flex items-center gap-3 px-4 sm:px-0">
              <stat.icon className="size-5 shrink-0 text-brand-blue-300" />
              <div>
                <p className="text-title-3 font-extrabold text-white sm:text-title-2">
                  {stat.value}
                  <span className="ml-0.5 text-body-2 font-semibold text-brand-blue-200">{stat.unit}</span>
                </p>
                <p className="text-label-2 text-brand-blue-300">{stat.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
