/*
 * 입구 카드 아이콘. 공공기관 누리집처럼 면을 채운 두 톤 그림을 이 서비스에 맞춰 직접 그렸다.
 * 옅은 색 네모 바탕 없이 그림만 크게 놓는다.
 */
const SIZE = "size-10 sm:size-12";

/* 직접 그린 그림의 색. 진한 파랑은 윤곽 역할, 옅은 파랑은 면, 노랑은 그림마다 한 군데만 쓴다. */
/* 각 색은 --icon-* 변수로 화면마다 바꿀 수 있다(없으면 아래 기본값). /draft3 은 두 파랑(#2469FF · #00184D)으로 덮어쓴다. */
const DEEP = "var(--icon-deep, var(--atomic-blue-600))";
const MID = "var(--icon-mid, var(--atomic-blue-400))";
const SOFT = "var(--icon-soft, var(--atomic-blue-100))";
const ACCENT = "var(--icon-accent, #FFC043)";

function CustomSvg({ children, className = SIZE }: { children: React.ReactNode; className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden className={className}>
      {children}
    </svg>
  );
}

const CUSTOM: Record<string, React.ReactNode> = {
  // 직업진단: 검사지와 돋보기
  assessment: (
    <CustomSvg>
      <rect x="7" y="8" width="26" height="34" rx="4" fill={SOFT} />
      <rect x="14" y="4" width="12" height="8" rx="3" fill={DEEP} />
      <rect x="12" y="18" width="16" height="3" rx="1.5" fill={MID} />
      <rect x="12" y="24" width="11" height="3" rx="1.5" fill={MID} />
      <circle cx="31" cy="31" r="8" fill="white" stroke={DEEP} strokeWidth="3.5" />
      <path d="M37 37l5.5 5.5" stroke={DEEP} strokeWidth="4.5" strokeLinecap="round" />
      <path d="M27.5 31l2.5 2.5 4.5-5" stroke={ACCENT} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </CustomSvg>
  ),
  // 일자리: 서류 가방
  jobs: (
    <CustomSvg>
      <path d="M17 14v-3a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v3" stroke={DEEP} strokeWidth="3.5" />
      <rect x="5" y="14" width="38" height="27" rx="5" fill={MID} />
      <path d="M5 19a5 5 0 0 1 5-5h28a5 5 0 0 1 5 5v5a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4v-5z" fill={DEEP} />
      <rect x="20" y="24" width="8" height="8" rx="2" fill={ACCENT} />
    </CustomSvg>
  ),
  // 지원금: 동전 두 닢
  support: (
    <CustomSvg>
      <circle cx="31" cy="17" r="12" fill={SOFT} />
      <circle cx="31" cy="17" r="7" stroke={MID} strokeWidth="2" />
      <circle cx="19" cy="30" r="14" fill={DEEP} />
      <circle cx="19" cy="30" r="10" fill={MID} />
      <path d="M13 26l2.5 9 3.5-9 3.5 9 2.5-9M12 30h14" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </CustomSvg>
  ),
  // 이력서 첨삭: 문서와 연필
  resume: (
    <CustomSvg>
      <rect x="7" y="5" width="28" height="38" rx="4" fill={SOFT} />
      <rect x="13" y="13" width="16" height="3" rx="1.5" fill={MID} />
      <rect x="13" y="19" width="16" height="3" rx="1.5" fill={MID} />
      <rect x="13" y="25" width="9" height="3" rx="1.5" fill={MID} />
      <path d="M39.5 21.5l-12 12" stroke={DEEP} strokeWidth="7" strokeLinecap="round" />
      <path d="M41 20l1-1" stroke={ACCENT} strokeWidth="7" strokeLinecap="round" />
      <path d="M22 41l1.8-6.8 5 5L22 41z" fill={DEEP} />
    </CustomSvg>
  ),
  // 경력 없어도 되는 일자리: 화분의 새싹
  beginner: (
    <CustomSvg>
      <path d="M24 21c-1-7-7-11-15-10 0 7 7 11 15 10z" fill={MID} />
      <path d="M24 18c1-6 6-10 14-9 0 6-6 10-14 9z" fill={SOFT} />
      <path d="M24 29V15" stroke={DEEP} strokeWidth="3" strokeLinecap="round" />
      <rect x="11" y="28" width="26" height="5" rx="2.5" fill={MID} />
      <path d="M14 33h20l-3 10H17l-3-10z" fill={DEEP} />
      <circle cx="40" cy="25" r="3.5" fill={ACCENT} />
    </CustomSvg>
  ),
  // 1:1 취업컨설팅: 주고받는 말풍선
  consulting: (
    <CustomSvg>
      <rect x="16" y="5" width="27" height="20" rx="6" fill={SOFT} />
      <path d="M35 25l4 6-9-6h5z" fill={SOFT} />
      <rect x="5" y="15" width="28" height="21" rx="6" fill={DEEP} />
      <path d="M11 36l-2 7 8-7h-6z" fill={DEEP} />
      <circle cx="12.5" cy="25.5" r="2.2" fill="white" />
      <circle cx="19" cy="25.5" r="2.2" fill="white" />
      <circle cx="25.5" cy="25.5" r="2.2" fill="white" />
      <circle cx="40" cy="8" r="4" fill={ACCENT} />
    </CustomSvg>
  ),
  // 곧 마감되는 공고: 자명종
  closing: (
    <CustomSvg>
      <path d="M7 14a7 7 0 0 1 9-7M41 14a7 7 0 0 0-9-7" stroke={MID} strokeWidth="4" strokeLinecap="round" />
      <circle cx="24" cy="26" r="16" fill={SOFT} stroke={DEEP} strokeWidth="3.5" />
      <path d="M24 17v9l6 4" stroke={DEEP} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="24" cy="26" r="2.5" fill={ACCENT} />
    </CustomSvg>
  ),
  // 급여 높은 공고: 오르는 막대와 화살표
  salary: (
    <CustomSvg>
      <rect x="6" y="30" width="8" height="13" rx="2" fill={SOFT} />
      <rect x="18" y="23" width="8" height="20" rx="2" fill={MID} />
      <rect x="30" y="16" width="8" height="27" rx="2" fill={DEEP} />
      <path d="M6 22l11-9 6 5 15-12M31 6h7v7" stroke={ACCENT} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
    </CustomSvg>
  ),
  // 자기소개서 첨삭: 봉투에서 나온 편지
  coverLetter: (
    <CustomSvg>
      <rect x="11" y="5" width="26" height="28" rx="3" fill={SOFT} />
      <rect x="16" y="11" width="16" height="3" rx="1.5" fill={MID} />
      <rect x="16" y="17" width="10" height="3" rx="1.5" fill={MID} />
      <path d="M5 21l19 12 19-12v17a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V21z" fill={DEEP} />
      <circle cx="24" cy="34" r="3.5" fill={ACCENT} />
    </CustomSvg>
  ),
};

export function ServiceIcon({ id }: { id: string }) {
  return CUSTOM[id] ?? null;
}

/* 자격증 타일 아이콘. 타일이 작아 입구 카드보다 한 단계 작게 놓는다. */
const QUALIFICATION_SIZE = "size-10 shrink-0";
const HEART = "M24 34s-12-7-12-16a7 7 0 0 1 12-4.8A7 7 0 0 1 36 18c0 9-12 16-12 16z";
const BOLT = "M26 5L11 26h10l-3 17 17-23H25l1-15z";

const QUALIFICATION: Record<string, React.ReactNode> = {
  // 요양보호사: 손바닥 위의 하트
  요양보호사: (
    <CustomSvg className={QUALIFICATION_SIZE}>
      <path d="M5 30c2 8 9 13 19 13s17-5 19-13" stroke={SOFT} strokeWidth="6" strokeLinecap="round" />
      <path d={HEART} fill={DEEP} />
      <path d="M17.5 15.5a3.5 3.5 0 0 1 3.5-2" stroke={SOFT} strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="39" cy="9" r="3.5" fill={ACCENT} />
    </CustomSvg>
  ),
  // 사회복지사: 나란히 선 두 사람
  사회복지사: (
    <CustomSvg className={QUALIFICATION_SIZE}>
      <circle cx="33" cy="14" r="6.5" fill={SOFT} />
      <path d="M23 42c0-8 4-13 10-13s10 5 10 13H23z" fill={SOFT} />
      <circle cx="18" cy="15" r="7.5" fill={MID} />
      <path d="M4 42c0-9 6-15 14-15s14 6 14 15H4z" fill={DEEP} />
      <circle cx="18" cy="35" r="3" fill={ACCENT} />
    </CustomSvg>
  ),
  // 조리사: 조리모
  조리사: (
    <CustomSvg className={QUALIFICATION_SIZE}>
      <circle cx="14" cy="18" r="8" fill={SOFT} />
      <circle cx="34" cy="18" r="8" fill={SOFT} />
      <circle cx="24" cy="14" r="10" fill={SOFT} />
      <rect x="12" y="18" width="24" height="12" fill={SOFT} />
      <rect x="11" y="28" width="26" height="10" rx="3" fill={DEEP} />
      <rect x="11" y="41" width="26" height="3" rx="1.5" fill={ACCENT} />
    </CustomSvg>
  ),
  // 간호조무사: 의료 십자
  간호조무사: (
    <CustomSvg className={QUALIFICATION_SIZE}>
      <rect x="5" y="8" width="38" height="34" rx="8" fill={SOFT} />
      <rect x="19.5" y="13" width="9" height="24" rx="2.5" fill={DEEP} />
      <rect x="12" y="20.5" width="24" height="9" rx="2.5" fill={DEEP} />
      <circle cx="39" cy="10" r="4.5" fill={ACCENT} />
    </CustomSvg>
  ),
  // 지게차: 짐을 든 지게차
  지게차: (
    <CustomSvg className={QUALIFICATION_SIZE}>
      <path d="M11 24V13a2 2 0 0 1 2-2h8l6 13" fill={SOFT} stroke={DEEP} strokeWidth="3" strokeLinejoin="round" />
      <rect x="5" y="23" width="25" height="13" rx="3" fill={MID} />
      <rect x="32" y="7" width="3.5" height="31" rx="1.5" fill={DEEP} />
      <path d="M35 35h9" stroke={DEEP} strokeWidth="3.5" strokeLinecap="round" />
      <rect x="36.5" y="23" width="8" height="9" rx="1.5" fill={ACCENT} />
      <circle cx="12" cy="38" r="5.5" fill={DEEP} />
      <circle cx="12" cy="38" r="2" fill="white" />
      <circle cx="25" cy="38" r="5.5" fill={DEEP} />
      <circle cx="25" cy="38" r="2" fill="white" />
    </CustomSvg>
  ),
  // 전기기사: 번개
  전기기사: (
    <CustomSvg className={QUALIFICATION_SIZE}>
      <path d={BOLT} fill={SOFT} transform="translate(5 2)" />
      <path d={BOLT} fill={DEEP} />
      <path d="M8 10l3 3M5 18h4" stroke={ACCENT} strokeWidth="3" strokeLinecap="round" />
    </CustomSvg>
  ),
};

export function QualificationIcon({ name }: { name: string }) {
  return QUALIFICATION[name] ?? null;
}
