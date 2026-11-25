/*
 * 상담 장면 그림. 정부 · 공공기관 누리집에서 흔히 쓰는 평면 그림 방식:
 * 외곽선 없이 면만, 사람은 동그란 머리와 둥근 몸통으로 단순하게, 뒤에 옅은 파랑 큰 원.
 * 색은 서비스 그림과 같은 파랑 계열 + 노랑 한 군데 + 화분 초록.
 * 왼쪽은 상담받는 중장년(흰머리 · 하늘색 스웨터), 오른쪽은 상담사(남색 재킷 · 목걸이 명찰).
 */
const SKIN = "#F6D2B8";
const SKIN_SHADE = "#EDBF9F";
const DEEP = "var(--atomic-blue-600)";
const SOFT = "var(--atomic-blue-100)";
const NAVY = "#1E3A8A";
const SWEATER = "#7EA6FF";
const ACCENT = "#FFC043";

export function ConsultIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 480 340" fill="none" aria-hidden className={className}>
      {/* 바탕: 큰 원과 바닥 그림자, 작은 장식 */}
      <circle cx="240" cy="180" r="150" fill="#DCE7FF" />
      <ellipse cx="240" cy="318" rx="190" ry="12" fill="#CCDBF8" />
      <circle cx="420" cy="86" r="7" fill={ACCENT} />
      <circle cx="62" cy="120" r="5" fill={SOFT} />
      <path d="M418 200l4 9 9 4-9 4-4 9-4-9-9-4 9-4z" fill="#FFFFFF" />

      {/* 말풍선: 왼쪽은 질문(점 셋), 오른쪽은 답(확인 표시) */}
      <rect x="96" y="40" width="70" height="42" rx="14" fill="#FFFFFF" />
      <path d="M128 82l6 10 6-10z" fill="#FFFFFF" />
      <circle cx="118" cy="61" r="4" fill={SWEATER} />
      <circle cx="131" cy="61" r="4" fill={SWEATER} />
      <circle cx="144" cy="61" r="4" fill={SWEATER} />
      <rect x="318" y="30" width="78" height="46" rx="14" fill={DEEP} />
      <path d="M342 76l6 10 6-10z" fill={DEEP} />
      <path d="M344 53l8 8 16-16" stroke="#FFFFFF" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />

      {/* 상담받는 사람 */}
      <path d="M118 236v-44a47 47 0 0 1 94 0v44z" fill={SWEATER} />
      <rect x="156" y="130" width="18" height="18" rx="6" fill={SKIN_SHADE} />
      <circle cx="165" cy="112" r="25" fill={SKIN} />
      <path d="M140 110a25 25 0 0 1 50-2c-8-5-17-7-27-5-9 2-16 5-23 7z" fill="#A7B0C0" />
      <path d="M140 110c-1 8 0 14 3 18 1-7 1-12-3-18z" fill="#A7B0C0" />

      {/* 상담사 */}
      <path d="M272 236v-44a47 47 0 0 1 94 0v44z" fill={NAVY} />
      <path d="M306 147l13 24 13-24z" fill="#FFFFFF" />
      <path d="M309 150l10 40 10-40" stroke={SOFT} strokeWidth="2.5" />
      <rect x="312" y="186" width="14" height="18" rx="3" fill="#FFFFFF" />
      <rect x="310" y="130" width="18" height="18" rx="6" fill={SKIN_SHADE} />
      <circle cx="319" cy="112" r="25" fill={SKIN} />
      <path d="M294 112a25 25 0 0 1 50 0c-5-12-14-18-25-18s-20 6-25 18z" fill="#2B3445" />
      <circle cx="343" cy="94" r="10" fill="#2B3445" />

      {/* 함께 보는 서류 */}
      <rect x="208" y="150" width="62" height="74" rx="6" fill="#FFFFFF" transform="rotate(-4 239 187)" />
      <g transform="rotate(-4 239 187)">
        <rect x="218" y="164" width="34" height="5" rx="2.5" fill={SOFT} />
        <rect x="218" y="176" width="42" height="5" rx="2.5" fill={SOFT} />
        <rect x="218" y="188" width="26" height="5" rx="2.5" fill={SOFT} />
        <circle cx="252" cy="208" r="9" fill={ACCENT} />
        <path d="M247.5 208l3 3 5.5-6" stroke={NAVY} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      </g>

      {/* 팔 · 손 (서류를 잡고 있다) */}
      <rect x="168" y="208" width="52" height="16" rx="8" fill="#6A94F5" />
      <circle cx="218" cy="214" r="8" fill={SKIN} />
      <rect x="262" y="208" width="52" height="16" rx="8" fill="#2A4BA8" />
      <circle cx="264" cy="214" r="8" fill={SKIN} />

      {/* 책상과 노트북 · 화분 */}
      <rect x="64" y="226" width="352" height="16" rx="8" fill="#B7CAF2" />
      <rect x="96" y="242" width="12" height="74" rx="4" fill="#A0B6E6" />
      <rect x="372" y="242" width="12" height="74" rx="4" fill="#A0B6E6" />
      <path d="M346 226l7-40h54l-7 40z" fill="#DCE3EE" />
      <rect x="338" y="222" width="72" height="6" rx="3" fill="#C4CEDD" />
      <circle cx="377" cy="206" r="4" fill="#FFFFFF" />
      <path d="M78 226l4-24h28l4 24z" fill={ACCENT} />
      <ellipse cx="88" cy="186" rx="9" ry="16" fill="#5DB98B" transform="rotate(-24 88 186)" />
      <ellipse cx="104" cy="184" rx="9" ry="17" fill="#4CA77A" transform="rotate(20 104 184)" />
      <ellipse cx="96" cy="176" rx="8" ry="16" fill="#6BC799" />
    </svg>
  );
}
