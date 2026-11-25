/*
 * /draft3 "자격증으로 찾기" 단추 그림. 진단 화면 그림(landing-item-icons)과 같은 화풍:
 * 면을 채운 두 톤 - 진한 파랑은 중심, 중간 파랑은 면, 민트는 그림마다 한 군데.
 */
const DEEP = "var(--atomic-blue-600)";
const MID = "var(--atomic-blue-400)";
const SOFT = "var(--atomic-blue-100)";
const ACCENT = "#2EC4A6";

const ICONS: Record<string, React.ReactNode> = {
  // 요양보호사: 감싸 안은 손 위 하트
  요양보호사: (
    <>
      <circle cx="24" cy="24" r="20" fill={SOFT} />
      <path d="M24 31s-9-5.2-9-11.6a5 5 0 0 1 9-3 5 5 0 0 1 9 3C33 25.8 24 31 24 31z" fill={DEEP} />
      <path d="M7 31c4 0 7 4 11 4h10c2 0 2-3 0-3h-6" stroke={MID} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="38" cy="11" r="3.5" fill={ACCENT} />
    </>
  ),
  // 사회복지사: 나란히 선 두 사람
  사회복지사: (
    <>
      <circle cx="31" cy="15" r="5.5" fill={MID} />
      <path d="M21 36c1-6.2 4.6-9.5 10-9.5s9 3.3 10 9.5z" fill={MID} />
      <circle cx="18" cy="18.5" r="6.5" fill={DEEP} />
      <path d="M6 41c1.4-7 5.8-10.5 12-10.5S28.6 34 30 41z" fill={DEEP} />
      <circle cx="41" cy="8" r="3.5" fill={ACCENT} />
    </>
  ),
  // 조리사: 요리사 모자
  조리사: (
    <>
      <circle cx="15" cy="20" r="8" fill={MID} />
      <circle cx="24" cy="14" r="9.5" fill={MID} />
      <circle cx="33" cy="20" r="8" fill={MID} />
      <rect x="14" y="20" width="20" height="14" fill={MID} />
      <rect x="14" y="33" width="20" height="7" rx="2" fill={DEEP} />
      <circle cx="40" cy="40" r="3.5" fill={ACCENT} />
    </>
  ),
  // 간호조무사: 의료 십자
  간호조무사: (
    <>
      <rect x="5" y="5" width="38" height="38" rx="11" fill={SOFT} />
      <rect x="19.5" y="12" width="9" height="24" rx="2.5" fill={DEEP} />
      <rect x="12" y="19.5" width="24" height="9" rx="2.5" fill={DEEP} />
      <circle cx="39" cy="9" r="3.5" fill={ACCENT} />
    </>
  ),
  // 지게차: 상자를 든 지게차
  지게차: (
    <>
      <path d="M11 22V11h10l5 11" stroke={DEEP} strokeWidth="3" strokeLinejoin="round" />
      <rect x="6" y="21" width="24" height="13" rx="3" fill={MID} />
      <rect x="31" y="7" width="3.4" height="29" rx="1.5" fill={DEEP} />
      <path d="M33 36h11" stroke={DEEP} strokeWidth="3" strokeLinecap="round" />
      <rect x="35" y="23" width="9" height="10" rx="1.5" fill={ACCENT} />
      <circle cx="12" cy="37" r="5" fill={DEEP} />
      <circle cx="12" cy="37" r="1.8" fill="white" />
      <circle cx="25" cy="37" r="5" fill={DEEP} />
      <circle cx="25" cy="37" r="1.8" fill="white" />
    </>
  ),
  // 전기기사: 번개
  전기기사: (
    <>
      <circle cx="24" cy="24" r="20" fill={SOFT} />
      <path d="M27 6L13 27h9.5L19 42l16-22h-9.5z" fill={DEEP} />
      <circle cx="38" cy="38" r="3.5" fill={ACCENT} />
    </>
  ),
};

export function QualificationIcon({ name }: { name: string }) {
  const icon = ICONS[name];
  if (!icon) return null;
  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden className="size-8 shrink-0">
      {icon}
    </svg>
  );
}
