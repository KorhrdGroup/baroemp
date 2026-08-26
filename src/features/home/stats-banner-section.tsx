"use client";

import { useEffect, useRef, useState } from "react";
import { Users, FileText, Briefcase, Award } from "lucide-react";

const stats = [
  {
    id: "users",
    icon: Users,
    value: 12480,
    unit: "명",
    label: "누적 회원 수",
  },
  {
    id: "resume",
    icon: FileText,
    value: 8320,
    unit: "건",
    label: "이력서·자소서 첨삭",
  },
  {
    id: "jobs",
    icon: Briefcase,
    value: 34500,
    unit: "건",
    label: "등록 채용공고",
  },
  {
    id: "success",
    icon: Award,
    value: 2150,
    unit: "명",
    label: "취업 성공",
  },
];

function useCountUp(target: number, started: boolean) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!started) return;

    const duration = 1500;
    const steps = 40;
    const interval = duration / steps;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      const progress = step / steps;
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(target * eased));
      if (step >= steps) clearInterval(timer);
    }, interval);

    return () => clearInterval(timer);
  }, [target, started]);

  return count;
}

function CountUpStat({ stat, started }: { stat: (typeof stats)[number]; started: boolean }) {
  const count = useCountUp(stat.value, started);

  const finalFormatted = stat.value.toLocaleString();

  return (
    <div className="flex items-center gap-3 px-4 sm:px-0">
      <stat.icon className="size-5 shrink-0 text-brand-blue-300" />
      <div>
        <p className="text-title-3 font-extrabold text-white sm:text-title-2">
          <span className="relative inline-block">
            <span className="invisible">{finalFormatted}</span>
            <span className="absolute inset-0 text-right">{count.toLocaleString()}</span>
          </span>
          <span className="ml-0.5 text-body-2 font-semibold text-brand-blue-200">{stat.unit}</span>
        </p>
        <p className="text-label-2 text-brand-blue-300">{stat.label}</p>
      </div>
    </div>
  );
}

export function StatsBannerSection() {
  const ref = useRef<HTMLElement>(null);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStarted(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={ref} className="bg-brand-blue-900 py-8">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-y-6 px-4 sm:px-6 lg:px-8">
        {stats.map((stat, i) => (
          <div key={stat.id} className="flex items-center">
            {i > 0 && (
              <div className="mx-6 hidden h-10 w-px bg-white/20 sm:mx-10 sm:block lg:mx-14" />
            )}
            <CountUpStat stat={stat} started={started} />
          </div>
        ))}
      </div>
    </section>
  );
}
