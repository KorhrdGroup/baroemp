import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  Briefcase,
  Coins,
  ClipboardList,
  FileText,
  MessageSquare,
  Target,
  BarChart3,
  TrendingUp,
} from "lucide-react";

export interface AdminNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

/**
 * 관리자 사이드바 메뉴.
 * 배열 기반이므로 향후 LMS/CRM 메뉴를 코드 구조 변경 없이 추가할 수 있다.
 */
export const adminNavItems: AdminNavItem[] = [
  { label: "대시보드", href: "/admin", icon: LayoutDashboard },
  { label: "회원·Career DB", href: "/admin/users", icon: Users },
  { label: "콘텐츠 관리", href: "/admin/contents", icon: BookOpen },
  { label: "채용공고", href: "/admin/jobs", icon: Briefcase },
  { label: "지원금", href: "/admin/support", icon: Coins },
  { label: "직업검사", href: "/admin/assessments", icon: ClipboardList },
  { label: "이력서·자소서", href: "/admin/resumes", icon: FileText },
  { label: "상담관리", href: "/admin/consultations", icon: MessageSquare },
  { label: "리드관리", href: "/admin/leads", icon: Target },
  { label: "분석", href: "/admin/analytics", icon: BarChart3 },
  { label: "취업 준비도 시장분석", href: "/admin/career-gap", icon: TrendingUp },
];

export const adminTopNavItems = [
  { label: "회원 DB", href: "/admin/users" },
  { label: "콘텐츠", href: "/admin/contents" },
  { label: "채용", href: "/admin/jobs" },
  { label: "리드", href: "/admin/leads" },
  { label: "분석", href: "/admin/analytics" },
];
