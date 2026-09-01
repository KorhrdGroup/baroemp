export interface ProgressStepMessages {
  /** 비로그인 방문자에게 이 단계가 무엇인지 알려주는 문구 */
  guest: string;
  /** 로그인했고 아직 이 단계를 마치지 않았을 때 */
  todo: string;
  /** 로그인했고 이 단계를 마쳤을 때 */
  done: string;
}

export interface ProgressStepItem {
  id: string;
  step: number;
  title: string;
  description: string;
  href: string;
  /**
   * 단계 카드 하단 안내문. 단계마다 하는 일이 달라 한 문장 틀에 제목만 갈아끼우면
   * "취업부터 취업 준비 상황을..."처럼 어색해진다. 문구를 단계별로 따로 둔다.
   * 문구는 progress-status.ts의 완료 판정 신호와 어긋나지 않게 쓴다.
   */
  messages: ProgressStepMessages;
}

export const progressSteps: ProgressStepItem[] = [
  {
    id: "diagnosis",
    step: 1,
    title: "진단",
    description: "내 상황과 희망 조건 확인",
    href: "/assessment",
    messages: {
      guest: "몇 가지 질문에 답하면 나에게 맞는 직업을 찾아드려요.",
      todo: "아직 직업진단 전이에요. 3~5분이면 적합도와 준비도를 확인할 수 있어요.",
      done: "직업진단을 마치셨어요. 추천 직업과 준비도를 다시 확인해보세요.",
    },
  },
  {
    id: "training",
    step: 2,
    title: "교육",
    description: "필요한 자격/실무교육 준비",
    href: "/resume",
    messages: {
      guest: "취업에 필요한 자격증과 실무교육을 미리 확인해보세요.",
      todo: "어떤 자격·교육이 필요한지 아직 확인 전이에요.",
      done: "필요한 자격·교육 과정을 확인하셨어요.",
    },
  },
  {
    id: "apply",
    step: 3,
    title: "서류",
    description: "이력서·자소서 첨삭",
    href: "/resume",
    messages: {
      guest: "이력서와 자기소개서를 AI 첨삭으로 다듬을 수 있어요.",
      todo: "아직 작성한 이력서가 없어요. 첫 이력서를 만들어볼까요?",
      done: "이력서를 작성하셨어요. 첨삭으로 더 다듬어보세요.",
    },
  },
  /*
    면접(취업컨설팅) 단계는 컨설팅 공개 전까지 숨겨 둔다. 열 때 아래 주석을 풀고
    취업을 5단계로 되돌린다.
  {
    id: "interview",
    step: 4,
    title: "면접",
    description: "면접 컨설팅으로 준비",
    href: "/consulting",
    messages: {
      guest: "전문가와 1:1로 면접을 준비할 수 있어요.",
      todo: "면접이 걱정되신다면 1:1 컨설팅을 신청해보세요.",
      done: "면접 컨설팅을 신청하셨어요. 준비 상황을 이어서 확인해보세요.",
    },
  },
  */
  {
    id: "employment",
    step: 4,
    title: "취업",
    description: "채용공고 지원 및 취업 완료",
    href: "/jobs",
    messages: {
      guest: "조건에 맞는 채용공고를 골라서 보여드려요.",
      todo: "이제 채용공고에 지원할 차례예요.",
      done: "채용공고에 지원하셨어요. 새로 올라온 공고도 확인해보세요.",
    },
  },
];
