export interface ProgressStepItem {
  id: string;
  step: number;
  title: string;
  description: string;
  href: string;
}

export const progressSteps: ProgressStepItem[] = [
  { id: "diagnosis", step: 1, title: "진단", description: "내 상황과 희망 조건 확인", href: "/assessment" },
  { id: "training", step: 2, title: "교육", description: "필요한 자격/실무교육 준비", href: "/resume" },
  { id: "apply", step: 3, title: "서류", description: "이력서·자소서 첨삭", href: "/resume" },
  { id: "interview", step: 4, title: "면접", description: "면접 컨설팅으로 준비", href: "/consulting" },
  { id: "employment", step: 5, title: "취업", description: "채용공고 지원 및 취업 완료", href: "/jobs" },
];
