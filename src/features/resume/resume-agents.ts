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

/** 화면에 보여줄 에이전트 이름과 설명. 양식 이름("한평생 표준 이력서")을 그대로 쓰지 않는다. */
export function resolveResumeAgent(agent: ResumeAgentOption): { id: string; name: string; description?: string } {
  const preset = agent.code ? AGENT_PRESETS[agent.code] : undefined;
  return {
    id: agent.id,
    name: preset?.name ?? agent.name,
    description: preset?.tagline ?? agent.description,
  };
}
