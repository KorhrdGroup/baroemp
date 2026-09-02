import type { LucideIcon } from "lucide-react";
import { LayoutDashboard, BarChart3, Coins, ClipboardList, Briefcase, FileText, Users, Target, MessageSquare, BellRing } from "lucide-react";

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
  { label: "회원 관리", href: "/admin/users", icon: Users },
  { label: "내게 맞는 직업찾기", href: "/admin/assessments", icon: ClipboardList },
  { label: "전국 채용공고", href: "/admin/jobs", icon: Briefcase },
  { label: "지원금찾기", href: "/admin/support", icon: Coins },
  { label: "이력서·자소서 첨삭", href: "/admin/resumes", icon: FileText },
  { label: "취업 컨설팅", href: "/admin/consultations", icon: MessageSquare },
  { label: "공고 알림", href: "/admin/job-alerts", icon: BellRing },
  // 각 서비스 관리 메뉴를 다 지난 뒤에 둔다. 앞의 메뉴들을 가로질러 보는 화면이라 순서상 마지막이다.
  { label: "영업 리드", href: "/admin/sales-leads", icon: Target },
  { label: "통계", href: "/admin/stats", icon: BarChart3 },
];

export const adminTopNavItems = [
  { label: "회원", href: "/admin/users" },
  { label: "직업찾기", href: "/admin/assessments" },
  { label: "채용공고", href: "/admin/jobs" },
  { label: "지원금", href: "/admin/support" },
  { label: "이력서", href: "/admin/resumes" },
  { label: "컨설팅", href: "/admin/consultations" },
  { label: "공고 알림", href: "/admin/job-alerts" },
  { label: "영업 리드", href: "/admin/sales-leads" },
  { label: "통계", href: "/admin/stats" },
];
