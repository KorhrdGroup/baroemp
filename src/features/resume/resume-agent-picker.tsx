"use client";

import { Bot, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ResumeAgentOption {
  id: string;
  /** ResumeTemplate.code — 에이전트 프리셋 매칭 키. 관리자가 새 양식을 추가하면 없을 수 있다. */
  code?: string;
  name: string;
  description?: string;
}

/**
 * 템플릿(양식)은 사실상 "어떤 기준으로 AI가 첨삭/생성하는가"를 정하므로,
 * 사용자에게는 양식 선택이 아니라 맞춤형 AI 에이전트 선택으로 보여준다.
 * 프리셋에 없는 code(관리자가 추가한 양식)는 DB의 이름/설명을 그대로 쓴다.
 */
const AGENT_PRESETS: Record<string, { name: string; tagline: string }> = {
  STANDARD: {
    name: "표준 취업 AI",
    tagline: "일반 취업 기준으로 이력서 전반을 균형 있게 점검하고 문장을 다듬습니다.",
  },
  EXPERIENCED: {
    name: "경력직 전문 AI",
    tagline: "경력요약·담당업무·성과가 먼저 읽히도록 경력 중심으로 첨삭합니다.",
  },
  MIDLIFE: {
    name: "중장년 재취업 AI",
    tagline: "기존 경력 활용과 직무전환, 장기근무 가능성이 드러나도록 첨삭합니다.",
  },
  CARE_WELFARE: {
    name: "복지·돌봄 전문 AI",
    tagline: "사회복지·요양 등 돌봄 직무 기준으로 자격과 현장 경험을 강조합니다.",
  },
};

function agentView(option: ResumeAgentOption) {
  const preset = option.code ? AGENT_PRESETS[option.code] : undefined;
  return {
    name: preset?.name ?? option.name,
    tagline: preset?.tagline ?? option.description,
  };
}

/**
 * 항상 노출되는 가벼운 pill 선택 바. 카드를 펼쳐 고르는 대신 버튼 한 번으로 바꾼다.
 * 상세 설명은 선택된 에이전트의 한 줄만 아래에 보여준다.
 */
export function ResumeAgentPicker({
  agents,
  value,
  onChange,
  pending,
}: {
  agents: ResumeAgentOption[];
  value?: string;
  onChange: (templateId: string) => void;
  pending?: boolean;
}) {
  if (agents.length === 0) return null;

  const current = agents.find((a) => a.id === value) ?? agents[0];
  const currentView = agentView(current);

  return (
    <div className="rounded-xl bg-white px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 flex shrink-0 items-center gap-1.5 text-label-1 font-semibold text-slate-500">
          <Bot className="size-4 text-brand-blue-600" />
          AI 에이전트
        </span>
        {agents.map((agent) => {
          const selected = agent.id === current.id;
          return (
            <button
              key={agent.id}
              type="button"
              disabled={pending}
              onClick={() => onChange(agent.id)}
              aria-pressed={selected}
              className={cn(
                "cursor-pointer rounded-full border px-3 py-1.5 text-label-1 font-medium transition-colors disabled:opacity-50",
                selected
                  ? "border-transparent bg-brand-blue-600 text-white"
                  : "border-border bg-white text-slate-600 hover:border-brand-blue-200 hover:text-brand-blue-700",
              )}
            >
              {agentView(agent).name}
            </button>
          );
        })}
        {pending && <Loader2 className="size-4 animate-spin text-slate-400" />}
      </div>
      {currentView.tagline && (
        <p className="mt-1.5 text-label-2 text-slate-400">{currentView.tagline}</p>
      )}
    </div>
  );
}
