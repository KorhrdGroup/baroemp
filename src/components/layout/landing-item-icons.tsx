/*
 * 진단 첫 화면 "알 수 있는 것" 칸의 그림.
 * 홈 서비스 그림(service-icons.tsx)과 같은 화풍: 면을 채운 두 톤 - 진한 파랑은 윤곽, 옅은 파랑은 면, 노랑은 그림마다 한 군데.
 * 선만 그은 아이콘은 위쪽 서비스 그림과 따로 놀아 직접 그렸다.
 */
const DEEP = "var(--atomic-blue-600)";
const MID = "var(--atomic-blue-400)";
const SOFT = "var(--atomic-blue-100)";
const ACCENT = "#FFC043";

const ICONS: Record<string, React.ReactNode> = {
  // 나에게 맞는 직업: 사람과 확인 표시
  match: (
    <>
      <circle cx="24" cy="24" r="19" fill={SOFT} />
      <circle cx="24" cy="18.5" r="6.5" fill={DEEP} />
      <path d="M11.5 37c1.6-6.6 6.6-10 12.5-10s10.9 3.4 12.5 10z" fill={MID} />
      <circle cx="37" cy="36" r="7" fill={ACCENT} />
      <path d="M33.8 36l2.3 2.3 4.2-4.6" stroke={DEEP} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  // 직업별 적합도: 막대그래프
  fit: (
    <>
      <rect x="5" y="8" width="38" height="34" rx="5" fill={SOFT} />
      <rect x="11" y="27" width="6.5" height="9" rx="2" fill={MID} />
      <rect x="20.75" y="20" width="6.5" height="16" rx="2" fill={MID} />
      <rect x="30.5" y="13" width="6.5" height="23" rx="2" fill={DEEP} />
      <circle cx="41" cy="7" r="4" fill={ACCENT} />
    </>
  ),
  // 현재 준비도: 방패와 확인 표시
  ready: (
    <>
      <path d="M24 4l16 6v12c0 10.5-6.8 18.6-16 22-9.2-3.4-16-11.5-16-22V10l16-6z" fill={DEEP} />
      <path d="M24 9.5l11 4.2V22c0 7.6-4.6 13.4-11 16.2-6.4-2.8-11-8.6-11-16.2v-8.3l11-4.2z" fill={MID} />
      <path d="M18 23.5l4.5 4.5 8-8.5" stroke="white" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="41" cy="7" r="3.5" fill={ACCENT} />
    </>
  ),
  // 부족한 조건: 점검표에 하나만 비어 있음
  gap: (
    <>
      <rect x="8" y="7" width="31" height="37" rx="4" fill={SOFT} />
      <rect x="16.5" y="3" width="14" height="8" rx="3" fill={DEEP} />
      <path d="M13.5 18l2.5 2.5 4.5-5M13.5 27l2.5 2.5 4.5-5" stroke={DEEP} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="24" y="16.5" width="10" height="3" rx="1.5" fill={MID} />
      <rect x="24" y="25.5" width="10" height="3" rx="1.5" fill={MID} />
      <circle cx="17" cy="36" r="3.6" fill="white" stroke={ACCENT} strokeWidth="2.6" />
      <rect x="24" y="34.5" width="10" height="3" rx="1.5" fill={MID} />
    </>
  ),
  // 필요한 자격 · 교육: 학사모
  cert: (
    <>
      <path d="M12 22v10c0 4 5.4 7 12 7s12-3 12-7V22l-12 6-12-6z" fill={MID} />
      <path d="M24 8L3 18.5 24 29l21-10.5z" fill={DEEP} />
      <path d="M39 21v11" stroke={ACCENT} strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="39" cy="35" r="3.4" fill={ACCENT} />
    </>
  ),
  // 추천 취업경로: 출발점에서 깃발까지 이어진 길
  route: (
    <>
      <path d="M10 38c13 0 7-15 20-15h7" stroke={SOFT} strokeWidth="10" strokeLinecap="round" />
      <path d="M10 38c13 0 7-15 20-15h7" stroke={MID} strokeWidth="2.6" strokeLinecap="round" strokeDasharray="0.5 5.5" />
      <circle cx="10" cy="38" r="6" fill={DEEP} />
      <circle cx="10" cy="38" r="2.3" fill="white" />
      <path d="M37 5v19" stroke={DEEP} strokeWidth="3.2" strokeLinecap="round" />
      <path d="M38 5.5h7.5l-2.8 4.2 2.8 4.3H38z" fill={ACCENT} />
    </>
  ),
  // 취업 · 훈련 지원금: 지갑
  wallet: (
    <>
      <rect x="10" y="6" width="24" height="14" rx="3" fill={SOFT} />
      <rect x="5" y="13" width="38" height="29" rx="5" fill={MID} />
      <rect x="27" y="21.5" width="16" height="13" rx="4" fill={DEEP} />
      <circle cx="33.5" cy="28" r="2.8" fill={ACCENT} />
    </>
  ),
  // 생활 · 지역 지원제도: 지도 위 위치 표시
  region: (
    <>
      <path d="M4 15l12-5 16 5 12-5v26l-12 5-16-5-12 5z" fill={SOFT} />
      <path d="M24 5c-7 0-12 5.2-12 11.6C12 25 24 37 24 37s12-12 12-20.4C36 10.2 31 5 24 5z" fill={DEEP} />
      <circle cx="24" cy="16.5" r="4.6" fill={ACCENT} />
    </>
  ),
  // 지원 가능성 등급: 메달
  grade: (
    <>
      <path d="M15 27l-5 16 7-2.8 4 6 5-15.2zM33 27l5 16-7-2.8-4 6-5-15.2z" fill={MID} />
      <circle cx="24" cy="19" r="14" fill={DEEP} />
      <circle cx="24" cy="19" r="9.5" fill={MID} />
      <path d="M24 12.5l2 4.3 4.7.5-3.5 3.2 1 4.6-4.2-2.4-4.2 2.4 1-4.6-3.5-3.2 4.7-.5z" fill={ACCENT} />
    </>
  ),
  // 신청 방법과 서류: 겹친 서류와 확인 도장
  docs: (
    <>
      <rect x="15" y="4" width="26" height="33" rx="4" fill={SOFT} />
      <rect x="7" y="10" width="26" height="33" rx="4" fill={MID} />
      <rect x="12" y="17" width="16" height="3" rx="1.5" fill="white" />
      <rect x="12" y="23" width="16" height="3" rx="1.5" fill="white" />
      <rect x="12" y="29" width="9" height="3" rx="1.5" fill="white" />
      <circle cx="36" cy="37" r="8" fill={ACCENT} />
      <path d="M32.3 37l2.6 2.6 4.8-5.2" stroke={DEEP} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
};

export function LandingItemIcon({ id }: { id: string }) {
  const icon = ICONS[id];
  if (!icon) return null;
  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden className="size-11 shrink-0 sm:size-12">
      {icon}
    </svg>
  );
}
