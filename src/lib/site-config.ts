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
  { label: "채용공고", href: "/jobs" },
  { label: "취업컨설팅", href: "/consulting" },
  { label: "지원금찾기", href: "/support" },
  { label: "정보센터", href: "/resume" }, // STEP 1: 이력서·정보 허브로 연결, 추후 /info 분리 가능
];

export const footerServiceLinks: NavItem[] = [
  { label: "직업진단", href: "/assessment" },
  { label: "채용공고", href: "/jobs" },
  { label: "지원금찾기", href: "/support" },
  { label: "이력서·자소서 첨삭", href: "/resume" },
  { label: "취업컨설팅", href: "/consulting" },
];

export const footerCompanyLinks: NavItem[] = [
  { label: "회사소개", href: "/" },
  { label: "이용약관", href: "/" },
  { label: "개인정보처리방침", href: "/" },
  { label: "제휴문의", href: "/" },
];
