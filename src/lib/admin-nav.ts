import type { LucideIcon } from "lucide-react";
import { LayoutDashboard, Coins, ClipboardList, Briefcase, FileText, Users } from "lucide-react";

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
];

export const adminTopNavItems = [
  { label: "회원", href: "/admin/users" },
  { label: "직업찾기", href: "/admin/assessments" },
  { label: "채용공고", href: "/admin/jobs" },
  { label: "지원금", href: "/admin/support" },
  { label: "이력서", href: "/admin/resumes" },
];
