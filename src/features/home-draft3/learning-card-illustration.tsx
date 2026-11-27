/*
 * 국민내일배움카드 그림. 상담 그림(consult-illustration)과 같은 공공기관 누리집식 평면 그림:
 * 외곽선 없이 면만, 뒤에 흰 원 하나. 펼친 책 위로 배움카드가 서 있고, 학사모와 동전으로 "배우면서 지원받는다"를 보인다.
 * 색은 /draft3 의 두 파랑(#2469FF · #00184D)과 옅은 단계뿐.
 */
const BLUE = "#2469FF";
const NAVY = "#00184D";
const MID = "#7CA5FF";
const SOFT = "#DEE8FF";

export function LearningCardIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 220 150" fill="none" aria-hidden className={className}>
      {/* 바탕 원과 바닥 그림자 */}
      <circle cx="122" cy="78" r="66" fill="#FFFFFF" />
      <ellipse cx="118" cy="143" rx="86" ry="5" fill={SOFT} />

      {/* 배움카드: 남색 카드에 파란 띠 · 칩 */}
      <g transform="rotate(-8 140 62)">
        <rect x="90" y="26" width="100" height="64" rx="9" fill={NAVY} />
        <rect x="90" y="40" width="100" height="10" fill={BLUE} />
        <rect x="102" y="60" width="18" height="13" rx="3" fill={MID} />
        <rect x="130" y="64" width="44" height="5" rx="2.5" fill="#FFFFFF" fillOpacity="0.5" />
        <rect x="130" y="74" width="28" height="5" rx="2.5" fill="#FFFFFF" fillOpacity="0.3" />
      </g>

      {/* 펼친 책: 파란 겉장 위에 흰 두 쪽 */}
      <path d="M50 114q34-9 68 4q34-13 68-4v26q-34-8-68 5q-34-13-68-5z" fill={BLUE} />
      <path d="M55 110q32-8 63 5v24q-31-12-63-4z" fill="#FFFFFF" />
      <path d="M181 110q-32-8-63 5v24q31-12 63-4z" fill="#F5F8FF" />
      <path d="M66 119q20-4 40 2M66 127q20-4 40 2M130 121q20-6 40-2M130 129q20-6 40-2" stroke={SOFT} strokeWidth="2.4" strokeLinecap="round" />

      {/* 학사모 */}
      <path d="M44 86v13q20 10 40 0v-13l-20 8z" fill={BLUE} />
      <path d="M28 78l36-14 36 14-36 14z" fill={NAVY} />
      <path d="M92 81v17" stroke={MID} strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="92" cy="100" r="3.4" fill={MID} />

      {/* 지원금 동전 */}
      <circle cx="196" cy="94" r="15" fill={MID} />
      <circle cx="196" cy="94" r="10.5" fill={BLUE} />
      <path d="M190 88l3 12 3-9 3 9 3-12M188.5 93h15" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

      {/* 반짝임 */}
      <path d="M58 30l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" fill={MID} />
    </svg>
  );
}
