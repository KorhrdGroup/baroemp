import Link from "next/link";
import { ChevronRight } from "lucide-react";

/**
 * 첫 줄 아래 가로 띠 배너 (사람인의 광고 띠 자리).
 * 꾸밈은 한평생그룹 누리집(korhrdcorp.co.kr)을 따른다: 옅은 하늘색 바탕 · 물결 선 · 반짝이는 입체 그림.
 * 한 장만 두고 넘어가지 않는다 - 저절로 바뀌는 배너는 중장년 이용자가 놓치기 쉽다.
 */
export function SupportBanner() {
  // 놓이는 칸의 폭(첫 줄 오른쪽 좁은 칸 / 휴대폰 / 넓은 띠)에 따라 모양을 바꾸려고 화면 폭이 아닌 배너 폭(@container)을 본다.
  return (
    <div className="@container h-full">
    <Link
      href="/support"
      className="relative flex h-full items-center justify-between gap-4 overflow-hidden rounded-2xl bg-gradient-to-r from-[#E4EEFF] via-[#EEF4FF] to-[#F6F9FF] px-5 py-6 @2xl:px-10 @2xl:py-7"
    >
      <Waves />

      <div className="relative min-w-0">
        <p className="text-body-1 font-bold break-keep text-slate-900 @2xl:text-title-2">
          국민내일배움카드로 훈련비 <span className="whitespace-nowrap text-brand-blue-600">최대 500만원</span>
        </p>
        {/* 하늘색 바탕 위 흰 알약. 테두리 없이 면 색만으로 띄운다. */}
        <span className="mt-3 inline-flex items-center gap-0.5 rounded-full bg-white py-2 pr-3 pl-4 text-body-3 font-semibold text-slate-800 @2xl:mt-4">
          받을 수 있는지 보기
          <ChevronRight className="size-4" />
        </span>
      </div>

      <CardIllustration />
    </Link>
    </div>
  );
}

/** 바탕의 물결 선. 한평생그룹 누리집 첫 화면의 선 묶음을 가볍게 옮겼다. */
function Waves() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 1200 200"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-0 h-full w-full text-brand-blue-400"
    >
      {Array.from({ length: 9 }, (_, i) => (
        <path
          key={i}
          d={`M0 ${150 - i * 6} C 250 ${40 + i * 8}, 500 ${200 - i * 4}, 750 ${90 + i * 5} S 1100 ${20 + i * 7}, 1200 ${70 + i * 4}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          opacity={0.1 + i * 0.015}
        />
      ))}
    </svg>
  );
}

/** 반짝이는 카드 그림. 면은 그라데이션, 위쪽에 흰 반사광을 얹어 입체로 보이게 한다. */
function CardIllustration() {
  return (
    <svg aria-hidden viewBox="0 0 160 120" className="relative hidden h-28 w-36 shrink-0 @2xl:block">
      <defs>
        <linearGradient id="sb-card-back" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#C9DAFF" />
          <stop offset="1" stopColor="#8FB0FF" />
        </linearGradient>
        <linearGradient id="sb-card-front" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5B8CFF" />
          <stop offset="1" stopColor="#1F4FE0" />
        </linearGradient>
        <linearGradient id="sb-shine" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.55" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="sb-coin" cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#FFE7A3" />
          <stop offset="1" stopColor="#F5B01C" />
        </radialGradient>
      </defs>
      <ellipse cx="80" cy="112" rx="56" ry="5" fill="#1F4FE0" opacity="0.12" />
      <rect x="34" y="14" width="96" height="62" rx="10" fill="url(#sb-card-back)" transform="rotate(-10 82 45)" />
      <rect x="22" y="34" width="100" height="64" rx="10" fill="url(#sb-card-front)" />
      <rect x="22" y="34" width="100" height="30" rx="10" fill="url(#sb-shine)" />
      <rect x="34" y="50" width="18" height="13" rx="3" fill="#FFD66B" />
      <rect x="34" y="78" width="44" height="5" rx="2.5" fill="#FFFFFF" opacity="0.7" />
      <circle cx="126" cy="30" r="16" fill="url(#sb-coin)" />
      <circle cx="121" cy="24" r="5" fill="#FFFFFF" opacity="0.6" />
      <text x="126" y="35" textAnchor="middle" fontSize="14" fontWeight="800" fill="#B9780A">₩</text>
    </svg>
  );
}
