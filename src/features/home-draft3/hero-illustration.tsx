/*
 * 첫 화면 오른쪽 그림. 상담 그림(consult-illustration)과 같은 평면 화풍:
 * 외곽선 없이 면만, 같은 중장년 인물(흰머리 · 하늘색 스웨터)이 공고 판을 가리키고, 맞는 공고 하나에 노란 확인 표시.
 * 남색 바탕 위라 뒤 원 · 바닥은 흰색을 아주 옅게 깐다.
 */
const SKIN = "#F6D2B8";
const SKIN_SHADE = "#EDBF9F";
const DEEP = "var(--atomic-blue-600)";
const NAVY = "#1E3A8A";
const SWEATER = "#7EA6FF";
const ACCENT = "#FFC043";
const HAIR = "#A7B0C0";

const ROWS = [100, 152];

export function HeroIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 440 320" fill="none" aria-hidden className={className}>
      {/* 바탕 */}
      <circle cx="236" cy="166" r="140" fill="#FFFFFF" fillOpacity="0.06" />
      <ellipse cx="226" cy="302" rx="176" ry="10" fill="#FFFFFF" fillOpacity="0.08" />
      <circle cx="404" cy="70" r="6" fill={ACCENT} />
      <circle cx="52" cy="96" r="4" fill="#7FAAFF" />
      <path d="M58 200l4 9 9 4-9 4-4 9-4-9-9-4 9-4z" fill="#FFFFFF" fillOpacity="0.7" />

      {/* 공고 판 */}
      <rect x="170" y="40" width="214" height="232" rx="16" fill="#FFFFFF" />
      <path d="M170 56a16 16 0 0 1 16-16h182a16 16 0 0 1 16 16v20H170z" fill="#DCE7FF" />
      <circle cx="190" cy="58" r="4" fill={SWEATER} />
      <circle cx="203" cy="58" r="4" fill={SWEATER} />
      <circle cx="216" cy="58" r="4" fill={SWEATER} />
      {ROWS.map((y) => (
        <g key={y}>
          <rect x="188" y={y} width="34" height="34" rx="9" fill="#DCE7FF" />
          <rect x="234" y={y + 5} width="104" height="8" rx="4" fill="#C9D8F5" />
          <rect x="234" y={y + 21} width="66" height="7" rx="3.5" fill="#E3EBFA" />
        </g>
      ))}
      {/* 맞는 공고 하나 */}
      <rect x="178" y="196" width="198" height="56" rx="12" fill="#EEF4FF" />
      <rect x="188" y="207" width="34" height="34" rx="9" fill={DEEP} />
      <rect x="197" y="219" width="16" height="12" rx="2.5" fill="#FFFFFF" />
      <rect x="201" y="215" width="8" height="5" rx="2" stroke="#FFFFFF" strokeWidth="2" />
      <rect x="234" y="212" width="96" height="8" rx="4" fill={SWEATER} />
      <rect x="234" y="228" width="60" height="7" rx="3.5" fill="#C9D8F5" />
      <circle cx="356" cy="224" r="12" fill={ACCENT} />
      <path d="M350.5 224l3.6 3.6 6.4-7" stroke={NAVY} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />

      {/* 인물: 다리 · 몸 · 팔 · 머리 */}
      <rect x="86" y="242" width="22" height="56" rx="8" fill="#2A3F7A" />
      <rect x="116" y="242" width="22" height="56" rx="8" fill="#2A3F7A" />
      <ellipse cx="95" cy="299" rx="15" ry="6" fill="#16224A" />
      <ellipse cx="129" cy="299" rx="15" ry="6" fill="#16224A" />
      <path d="M74 252v-64a38 38 0 0 1 76 0v64z" fill={SWEATER} />
      <path d="M140 176l42 36" stroke="#6A94F5" strokeWidth="16" strokeLinecap="round" />
      <circle cx="186" cy="215" r="8" fill={SKIN} />
      <rect x="103" y="134" width="18" height="18" rx="6" fill={SKIN_SHADE} />
      <circle cx="112" cy="116" r="25" fill={SKIN} />
      <path d="M87 114a25 25 0 0 1 50-2c-8-5-17-7-27-5-9 2-16 5-23 7z" fill={HAIR} />
      <path d="M87 114c-1 8 0 14 3 18 1-7 1-12-3-18z" fill={HAIR} />
    </svg>
  );
}
