"use client";

import { useEffect, useRef, useState } from "react";
import { Users, FileText, Briefcase, Award } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * 등록 채용공고 수치는 실제 활성 공고 수(서버에서 매일 갱신)로 채운다. 나머지 지표는 아직
 * 대시보드로 집계할 값이 없어 임시 상수로 둔다 - 실값이 준비되면 이 파일에서만 갈아끼우면 된다.
 */
const stats = [
  { id: "users", icon: Users, value: 12480, unit: "명", label: "누적 회원 수" },
  { id: "resume", icon: FileText, value: 8320, unit: "건", label: "이력서·자소서 첨삭" },
  { id: "jobs", icon: Briefcase, value: 34500, unit: "건", label: "등록 채용공고" },
  { id: "success", icon: Award, value: 2150, unit: "명", label: "취업 성공" },
] as const;

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

interface StatItem {
  id: string;
  icon: typeof Users;
  value: number;
  unit: string;
  label: string;
}

function CountUpStat({ stat, started }: { stat: StatItem; started: boolean }) {
  const count = useCountUp(stat.value, started);

  const finalFormatted = stat.value.toLocaleString();

  return (
    /*
      좁은 화면에서는 칸마다 폭을 같게 잡는다. 그냥 가운데 두면 "이력서·자소서 첨삭" 처럼
      긴 이름이 있는 칸만 옆으로 퍼져, 위아래 두 줄의 숫자가 서로 어긋나 보인다.
    */
    <div className="flex w-32 items-center gap-2 min-[360px]:w-40 min-[360px]:gap-3 sm:w-auto">
      {/* 어두운 남색 위라 300은 가라앉는다. 글자·아이콘 모두 한두 단계 밝게 올린다. */}
      <stat.icon className="size-6 shrink-0 text-brand-blue-200 min-[360px]:size-7" />
      <div className="min-w-0">
        {/*
          숫자와 단위는 한 덩어리라 갈라지면 안 된다. 320px 화면에서 "34,500 / 건" 처럼
          단위만 아랫줄로 떨어져 두 줄이 됐다. 줄바꿈을 막고, 대신 그 폭에서는 글자를
          한 단계 낮춰 두 칸이 나란히 들어가게 한다.
        */}
        <p className="text-body-1 font-extrabold whitespace-nowrap text-white min-[360px]:text-title-3 sm:text-title-2">
          <span className="relative inline-block">
            <span className="invisible">{finalFormatted}</span>
            <span className="absolute inset-0 text-right">{count.toLocaleString()}</span>
          </span>
          <span className="ml-0.5 text-body-2 font-semibold text-brand-blue-100">{stat.unit}</span>
        </p>
        <p className="text-label-2 whitespace-nowrap text-brand-blue-100">{stat.label}</p>
      </div>
    </div>
  );
}

export function StatsBannerSection({ jobCount }: { jobCount?: number }) {
  const ref = useRef<HTMLElement>(null);
  const [started, setStarted] = useState(false);

  // 넘어온 실값이 있으면 등록 채용공고 자리만 갈아끼운다. 나머지는 상수 유지.
  const displayStats: StatItem[] = stats.map((s) => (s.id === "jobs" && typeof jobCount === "number" ? { ...s, value: jobCount } : s));

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
      {/*
        넓은 화면은 넷을 한 줄로 세우고 사이에 세로 선을 넣는다.
        좁은 화면은 한 줄에 다 못 들어가 두 칸씩 접히는데, 그때 선이 없어 숫자 넷이
        서로 붙어 보였다. 2×2 로 세우고 칸 사이를 가는 선으로 나눈다.
      */}
      <div className="mx-auto grid w-fit max-w-7xl grid-cols-2 px-4.5 sm:flex sm:w-auto sm:flex-wrap sm:items-center sm:justify-center sm:gap-y-6 lg:px-8">
        {displayStats.map((stat, i) => (
          <div
            key={stat.id}
            className={cn(
              // 칸이 반으로 나뉘는 좁은 화면에서는 칸 가운데에 세운다. 왼쪽에 붙이면 선 쪽만 비어 보인다.
              "flex items-center justify-center py-4 sm:justify-start sm:py-0",
              i % 2 === 0 ? "pr-4 sm:pr-0" : "border-l border-white/15 pl-4 sm:border-l-0 sm:pl-0",
              i >= 2 && "border-t border-white/15 sm:border-t-0",
            )}
          >
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
