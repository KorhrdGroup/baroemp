/*
 * /draft3 공고 탭 알약 앞 작은 그림. 다른 그림들과 같은 평면 화풍(파랑 면 + 포인트 한 군데).
 * 선택된 알약은 남색(#00184D) 바탕이라 남색 포인트는 묻힌다 - 파랑 #2469FF · 그 옅은 단계 · 흰색만 써서 흰 알약과 남색 알약 양쪽에서 보이게 한다.
 */
const MID = "#2469FF";
const SOFT = "#DEE8FF";
const ACCENT = "#7CA5FF";

const ICONS: Record<string, React.ReactNode> = {
  // 마감 임박: 자명종
  closing: (
    <>
      <circle cx="5.5" cy="5" r="2.6" fill={ACCENT} />
      <circle cx="18.5" cy="5" r="2.6" fill={ACCENT} />
      <circle cx="12" cy="13" r="8" fill={SOFT} stroke={MID} strokeWidth="2" />
      <path d="M12 9v4.2l2.8 1.8" stroke={MID} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  // 경력 없어도 돼요: 새싹
  beginner: (
    <>
      <path d="M12 21v-8" stroke={MID} strokeWidth="2.2" strokeLinecap="round" />
      <path d="M12 13C12 8.6 9 5.5 3.5 5.5c0 4.4 3 7.5 8.5 7.5z" fill={MID} />
      <path d="M12 11c0-3.6 2.4-6 6.5-6 0 3.6-2.4 6-6.5 6z" fill={ACCENT} />
    </>
  ),
  // 요양보호사: 손 위 하트
  care: (
    <>
      <path d="M12 14.5s-5.5-3.1-5.5-7a3 3 0 0 1 5.5-1.7 3 3 0 0 1 5.5 1.7c0 3.9-5.5 7-5.5 7z" fill={MID} />
      <path d="M2.5 17c2.4 0 4 2.5 6.5 2.5h5.5c1.4 0 1.4-2.2 0-2.2H11" stroke={SOFT} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="20" cy="15.5" r="1.8" fill={ACCENT} />
    </>
  ),
  // 시설관리 · 미화: 빗자루
  cleaning: (
    <>
      <path d="M12 2.5v9" stroke={MID} strokeWidth="2.2" strokeLinecap="round" />
      <path d="M7 13.5h10l2 8H5z" fill={SOFT} />
      <path d="M9.5 16.5v3M12 16.5v3M14.5 16.5v3" stroke={MID} strokeWidth="1.4" strokeLinecap="round" />
      <rect x="7" y="11" width="10" height="3.2" rx="1.2" fill={ACCENT} />
    </>
  ),
  // 조리 · 주방: 김 나는 냄비
  cook: (
    <>
      <path d="M9 2.5c-1 1.2 1 2.3 0 3.5M13 2.5c-1 1.2 1 2.3 0 3.5" stroke={ACCENT} strokeWidth="1.8" strokeLinecap="round" />
      <rect x="4" y="8" width="16" height="3" rx="1.5" fill={SOFT} />
      <path d="M5 11h14v6.5a3.5 3.5 0 0 1-3.5 3.5h-7A3.5 3.5 0 0 1 5 17.5z" fill={MID} />
      <path d="M2 13h3M19 13h3" stroke={MID} strokeWidth="2.2" strokeLinecap="round" />
    </>
  ),
};

export function JobTabIcon({ id }: { id: string }) {
  const icon = ICONS[id];
  if (!icon) return null;
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden className="size-5 shrink-0">
      {icon}
    </svg>
  );
}
