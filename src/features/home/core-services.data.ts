import type { LucideIcon } from "lucide-react";
import { FileSearch, Briefcase, Coins, FileEdit, UserRound, GraduationCap } from "lucide-react";

export interface CoreServiceItem {
  id: string;
  title: string;
  description: string;
  badge: "무료" | "유료" | "준비중";
  href: string;
  icon: LucideIcon;
}

/**
 * 홈페이지 핵심 서비스 영역. 배열 기반으로 관리되어
 * 향후 "취업교육" 등 신규 서비스를 추가할 때 이 배열에 항목만 추가하면 된다.
 */
export const coreServices: CoreServiceItem[] = [
  {
    id: "assessment",
    title: "내게 맞는 직업 찾기",
    description: "빅데이터 기반 직업진단",
    badge: "무료",
    href: "/assessment",
    icon: FileSearch,
  },
  {
    id: "jobs",
    title: "전국 채용공고",
    description: "실시간 채용정보 확인",
    badge: "무료",
    href: "/jobs",
    icon: Briefcase,
  },
  {
    id: "support",
    title: "지원금 찾기",
    description: "받을 수 있는 취업·훈련 지원 확인",
    badge: "무료",
    href: "/support",
    icon: Coins,
  },
  {
    id: "resume",
    title: "이력서·자소서 첨삭",
    description: "AI 기반 맞춤 첨삭",
    badge: "무료",
    href: "/resume",
    icon: FileEdit,
  },
  {
    id: "consulting",
    title: "1:1 취업컨설팅",
    description: "전문가와 맞춤 상담",
    badge: "유료",
    href: "/consulting",
    icon: UserRound,
  },
  {
    id: "training",
    title: "취업교육 (오픈 예정)",
    description: "자격증·실무교육 과정 안내",
    badge: "준비중",
    href: "/resume",
    icon: GraduationCap,
  },
];
