/*
 * 진단 첫 화면 "알 수 있는 것" 칸의 그림.
 * 홈 서비스 그림(service-icons.tsx)과 같은 화풍: 면을 채운 두 톤 - 진한 파랑은 윤곽, 옅은 파랑은 면, 노랑은 그림마다 한 군데.
 * 모서리는 둥글둥글하게: 네모는 rx 를 크게, 뾰족한 면(방패 · 학사모 · 지도 · 깃발 · 리본)은 같은 색 선(strokeLinejoin=round)을 둘러 꼭짓점을 굴린다.
 * 선만 그은 아이콘은 위쪽 서비스 그림과 따로 놀아 직접 그렸다.
 * 움직일 조각에는 li-anim + 움직임 이름(globals.css)을 붙인다. 칸마다 늦춤은 --li-delay 로 받고, 한 그림 안에서 차례가 있으면 거기에 더한다.
 */
// 색은 홈 서비스 그림과 같은 변수 고리를 읽는다 - 값을 정하지 않은 화면은 예전 색, /draft3 색 판에서는 두 파랑 + 남색 포인트.
const DEEP = "var(--icon-deep, var(--atomic-blue-600))";
const MID = "var(--icon-mid, var(--atomic-blue-400))";
const SOFT = "var(--icon-soft, var(--atomic-blue-100))";
const ACCENT = "var(--icon-accent, #FFC043)";
/** 포인트 원 위에 긋는 확인 표시. 노랑 위에서는 파랑, 남색 포인트(/draft3 색 판)에서는 흰색. */
const ON_ACCENT = "var(--icon-on-accent, var(--atomic-blue-600))";

const ICONS: Record<string, React.ReactNode> = {
  // 나에게 맞는 직업: 사람과 확인 표시
  match: (
    <>
      <circle cx="24" cy="24" r="19" fill={SOFT} />
      <circle cx="24" cy="18.5" r="6.5" fill={DEEP} />
      <path d="M12.5 36c1.6-6 6.4-9 11.5-9s9.9 3 11.5 9z" fill={MID} stroke={MID} strokeWidth="2.6" strokeLinejoin="round" />
      <circle cx="37" cy="36" r="7" fill={ACCENT} className="li-anim li-twinkle" />
      <path d="M33.8 36l2.3 2.3 4.2-4.6" pathLength={1} stroke={ON_ACCENT} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="li-anim li-draw" style={{ animationDelay: "calc(var(--li-delay, 0ms) + 300ms)" }} />
    </>
  ),
  // 직업별 적합도: 막대그래프
  fit: (
    <>
      <rect x="5" y="8" width="38" height="34" rx="9" fill={SOFT} />
      <rect x="11" y="27" width="6.5" height="9" rx="3.25" fill={MID} className="li-anim li-grow" />
      <rect x="20.75" y="20" width="6.5" height="16" rx="3.25" fill={MID} className="li-anim li-grow" style={{ animationDelay: "calc(var(--li-delay, 0ms) + 110ms)" }} />
      <rect x="30.5" y="13" width="6.5" height="23" rx="3.25" fill={DEEP} className="li-anim li-grow" style={{ animationDelay: "calc(var(--li-delay, 0ms) + 220ms)" }} />
    </>
  ),
  // 현재 준비도: 방패와 확인 표시
  ready: (
    <>
      <path d="M24 5.5l14.5 5.4v11.1c0 9.8-6.3 17.3-14.5 20.5-8.2-3.2-14.5-10.7-14.5-20.5V10.9z" fill={DEEP} stroke={DEEP} strokeWidth="3" strokeLinejoin="round" />
      <path d="M24 10.5l10 3.8V22c0 7-4.2 12.4-10 15-5.8-2.6-10-8-10-15v-7.7z" fill={MID} stroke={MID} strokeWidth="2.6" strokeLinejoin="round" />
      <path d="M18 23.5l4.5 4.5 8-8.5" pathLength={1} stroke="white" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" className="li-anim li-draw" />
    </>
  ),
  // 부족한 조건: 점검표에 하나만 비어 있음
  gap: (
    <>
      <rect x="8" y="7" width="31" height="37" rx="8" fill={SOFT} />
      <rect x="16.5" y="3" width="14" height="8" rx="4" fill={DEEP} />
      <path d="M13.5 18l2.5 2.5 4.5-5" pathLength={1} stroke={DEEP} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" className="li-anim li-draw" />
      <path d="M13.5 27l2.5 2.5 4.5-5" pathLength={1} stroke={DEEP} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" className="li-anim li-draw" style={{ animationDelay: "calc(var(--li-delay, 0ms) + 220ms)" }} />
      <rect x="24" y="16.5" width="10" height="3" rx="1.5" fill={MID} />
      <rect x="24" y="25.5" width="10" height="3" rx="1.5" fill={MID} />
      <circle cx="17" cy="36" r="3.6" fill="white" stroke={ACCENT} strokeWidth="2.6" className="li-anim li-twinkle" style={{ animationDelay: "calc(var(--li-delay, 0ms) + 440ms)" }} />
      <rect x="24" y="34.5" width="10" height="3" rx="1.5" fill={MID} />
    </>
  ),
  // 필요한 자격 · 교육: 학사모
  cert: (
    <>
      <path d="M13 22.5v9.5c0 3.8 4.9 6.5 11 6.5s11-2.7 11-6.5v-9.5l-11 5.5z" fill={MID} stroke={MID} strokeWidth="2.6" strokeLinejoin="round" />
      <path d="M24 9.5L5 18.5 24 27.5l19-9z" fill={DEEP} stroke={DEEP} strokeWidth="3.4" strokeLinejoin="round" />
      <g className="li-anim li-swing">
        <path d="M39 21v11" stroke={ACCENT} strokeWidth="2.6" strokeLinecap="round" />
        <circle cx="39" cy="35" r="3.4" fill={ACCENT} />
      </g>
    </>
  ),
  // 추천 취업경로: 출발점에서 깃발까지 이어진 길
  route: (
    <>
      <path d="M10 38c13 0 7-15 20-15h7" stroke={SOFT} strokeWidth="10" strokeLinecap="round" />
      <path d="M10 38c13 0 7-15 20-15h7" stroke={MID} strokeWidth="2.6" strokeLinecap="round" strokeDasharray="0.5 5.5" className="li-anim li-flow" />
      <circle cx="10" cy="38" r="6" fill={DEEP} />
      <circle cx="10" cy="38" r="2.3" fill="white" />
      <path d="M37 5v19" stroke={DEEP} strokeWidth="3.2" strokeLinecap="round" />
      <path d="M38.5 6h6.5l-2.6 4 2.6 4h-6.5z" fill={ACCENT} stroke={ACCENT} strokeWidth="2" strokeLinejoin="round" className="li-anim li-swing" style={{ transformOrigin: "left center", animationDelay: "calc(var(--li-delay, 0ms) + 300ms)" }} />
    </>
  ),
  // 취업 · 훈련 지원금: 지갑
  wallet: (
    <>
      <rect x="10" y="6" width="24" height="14" rx="5" fill={SOFT} className="li-anim li-pop" />
      <rect x="5" y="13" width="38" height="29" rx="9" fill={MID} />
      <rect x="27" y="21.5" width="16" height="13" rx="6.5" fill={DEEP} />
      <circle cx="33.5" cy="28" r="2.8" fill={ACCENT} className="li-anim li-twinkle" style={{ animationDelay: "calc(var(--li-delay, 0ms) + 380ms)" }} />
    </>
  ),
  // 생활 · 지역 지원제도: 지도 위 위치 표시
  region: (
    <>
      <path d="M5.5 15.5l10.5-4.3 16 5 10.5-4.3v23.6l-10.5 4.3-16-5-10.5 4.3z" fill={SOFT} stroke={SOFT} strokeWidth="3" strokeLinejoin="round" />
      <g className="li-anim li-drop">
        <path d="M24 5c-7 0-12 5.2-12 11.6C12 25 24 37 24 37s12-12 12-20.4C36 10.2 31 5 24 5z" fill={DEEP} />
        <circle cx="24" cy="16.5" r="4.6" fill={ACCENT} />
      </g>
    </>
  ),
  // 지원 가능성 등급: 메달
  grade: (
    <>
      <path d="M15.5 28l-4.5 14 6.3-2.5 3.7 5.4 4.5-13.6zM32.5 28l4.5 14-6.3-2.5-3.7 5.4-4.5-13.6z" fill={MID} stroke={MID} strokeWidth="2.6" strokeLinejoin="round" />
      <circle cx="24" cy="19" r="14" fill={DEEP} />
      <circle cx="24" cy="19" r="9.5" fill={MID} />
      <path d="M24 12.5l2 4.3 4.7.5-3.5 3.2 1 4.6-4.2-2.4-4.2 2.4 1-4.6-3.5-3.2 4.7-.5z" fill={ACCENT} stroke={ACCENT} strokeWidth="1.6" strokeLinejoin="round" className="li-anim li-twinkle" />
    </>
  ),
  // 신청 방법과 서류: 겹친 서류와 확인 도장
  docs: (
    <>
      <rect x="15" y="4" width="26" height="33" rx="7" fill={SOFT} />
      <rect x="7" y="10" width="26" height="33" rx="7" fill={MID} />
      <rect x="12" y="17" width="16" height="3" rx="1.5" fill="white" />
      <rect x="12" y="23" width="16" height="3" rx="1.5" fill="white" />
      <rect x="12" y="29" width="9" height="3" rx="1.5" fill="white" />
      <circle cx="36" cy="37" r="8" fill={ACCENT} className="li-anim li-twinkle" />
      <path d="M32.3 37l2.6 2.6 4.8-5.2" pathLength={1} stroke={ON_ACCENT} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" className="li-anim li-draw" style={{ animationDelay: "calc(var(--li-delay, 0ms) + 300ms)" }} />
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
