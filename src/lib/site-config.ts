/**
 * 사이트 전역 내비게이션/설정 정보.
 * 배열 기반으로 관리해 향후 "취업교육" 등 신규 메뉴 추가가 쉬운 구조로 유지한다.
 */
export const siteConfig = {
  name: "한평생 바로취업",
  description: "중장년의 새로운 시작, 한평생 함께합니다",
  supportPhone: "1588-1234",
};

export interface NavItem {
  label: string;
  href: string;
}

export const mainNavItems: NavItem[] = [
  { label: "직업진단", href: "/assessment" },
  { label: "일자리찾기", href: "/jobs" },
  { label: "지원금찾기", href: "/support" },
  { label: "이력서 첨삭", href: "/resume" }, // 푸터에서는 "이력서·자소서 첨삭" (가로 여유가 있어 전체 명칭 사용)
  // 취업컨설팅은 공개 전이라 숨겨 둔다. 열 때 아래 주석을 풀면 된다 (푸터도 같이).
  // { label: "취업컨설팅", href: "/consulting" },
];

export const footerServiceLinks: NavItem[] = [
  { label: "직업진단", href: "/assessment" },
  { label: "일자리찾기", href: "/jobs" },
  { label: "지원금찾기", href: "/support" },
  { label: "이력서·자소서 첨삭", href: "/resume" },
  // { label: "취업컨설팅", href: "/consulting" },
];

export const footerCompanyLinks: NavItem[] = [
  { label: "이용약관", href: "/terms" },
  { label: "개인정보처리방침", href: "/privacy" },
];
