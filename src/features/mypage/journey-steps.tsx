import Link from "next/link";
import { ArrowRight } from "lucide-react";

/**
 * 마이페이지 취업 절차 한 단계.
 * 가입한 사람이 "그다음 뭘 하지"를 고민하지 않게, 다섯 단계 가운데 아직 안 한 첫 단계를 다음 할 일로 세운다.
 */
export interface JourneyStep {
  id: string;
  step: number;
  title: string;
  done: boolean;
  /** 이 단계를 하러 갈 곳 */
  href: string;
  /** 다음 할 일 버튼 문구 */
  actionLabel: string;
  /** 다음 할 일 안내문 */
  todoMessage: string;
}

/** 단계를 다 마친 뒤 다음 할 일 카드 자리에 둘 것(예: 이제 지원할 차례예요). */
export interface JourneyGoal {
  label: string;
  title: string;
  message: string;
  href: string;
  actionLabel: string;
}

interface JourneyStepsProps {
  steps: JourneyStep[];
  userName: string;
  /** 다섯 단계를 다 마쳤을 때 제목. 취업까지 표시했으면 축하로 바꾼다. */
  completedTitle?: string;
  /** 다섯 단계를 다 마쳤을 때 카드. 없으면 카드 없이 제목만. */
  goal?: JourneyGoal;
}

/*
  화면 맨 위: 인사 · 다음 할 일 한 장. 진행 막대(JourneyProgress)는 "나의 취업 준비" 제목 오른쪽에 둔다 - 막대가 세는 다섯 단계가 바로 그 아래 카드다.
  전에는 다섯 단계 동그라미 + 설명 + 아래 떠 있는 띠 + 구역마다 번호까지 같은 단계를 세 번 보여 줘
  5060 회원에게 정신없었다. 단계는 막대 하나로 줄이고, 할 일은 하나만 크게 짚는다.
*/
export function JourneySteps({ steps, userName, completedTitle, goal }: JourneyStepsProps) {
  const next = steps.find((s) => !s.done) ?? null;
  const card = next
    ? { label: `다음에 할 일 · ${next.step}단계`, title: next.title, message: next.todoMessage, href: next.href, actionLabel: next.actionLabel }
    : goal;

  return (
    <section aria-label="취업 준비">
      {/* 들어올 때 차례로 떠오른다(globals.css .mp-rise, 순서는 --mp-d). */}
      <h1 className="mp-rise text-title-2 font-extrabold tracking-[-0.02em] break-keep text-slate-900 sm:text-headline-3">
        {next ? `${userName}님, 반가워요` : `${userName}님, ${completedTitle ?? "준비를 모두 마치셨어요"}`}
      </h1>

      {/* 다음 할 일 하나만 크게. 다섯 개를 다 권하면 하나도 안 하게 된다. 다 마쳤으면 그다음(지원)을 같은 자리에서 권한다. */}
      {card && (
        <div
          style={{ ["--mp-d" as string]: "80ms" }}
          className="mp-rise mt-6 flex flex-col gap-5 rounded-card bg-baro-navy p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div className="min-w-0">
            <p className="text-body-2 font-bold text-baro-blue-300">{card.label}</p>
            <h2 className="mt-1.5 text-title-2 font-extrabold tracking-[-0.02em] break-keep text-white">{card.title}</h2>
            <p className="mt-2 text-body-1 font-medium break-keep text-slate-200">{card.message}</p>
          </div>
          <Link
            href={card.href}
            className="flex h-14 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-baro-blue px-7 text-body-1 font-bold text-white"
          >
            {card.actionLabel}
            <ArrowRight className="size-5" />
          </Link>
        </div>
      )}
    </section>
  );
}

/** 취업 준비 진행 막대. 마이페이지 "나의 취업 준비" 제목 오른쪽에 붙는다. 들어올 때 0에서 차오른다(globals.css .mp-fill). */
export function JourneyProgress({ doneCount, total }: { doneCount: number; total: number }) {
  return (
    <div className="flex items-center gap-3.5">
      <p className="shrink-0 text-body-2 font-semibold text-slate-600">
        취업 준비 {doneCount} / {total} 단계
      </p>
      <div
        role="progressbar"
        aria-label="취업 준비 단계"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={doneCount}
        className="h-2.5 w-40 overflow-hidden rounded-full bg-slate-200 sm:w-56"
      >
        <div className="mp-fill h-full rounded-full bg-baro-blue" style={{ width: `${(doneCount / total) * 100}%` }} />
      </div>
    </div>
  );
}
