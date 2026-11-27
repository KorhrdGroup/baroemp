"use client";

import { usePathname } from "next/navigation";
import { BottomTabBar } from "@/features/home-draft/bottom-tab-bar";

/*
  휴대폰 아래 탭 줄 (홈 시안과 같은 것). 시안 머리글은 좁은 화면에서 메뉴 · 마이페이지를 이 탭에 맡겨,
  세부 화면에도 두어야 길을 잃지 않는다.
  다만 자기 고정 단추(지원하기 · 다음 · 저장)가 화면 아래에 있는 곳에서는 겹치므로 감춘다 -
  경로로 알 수 있는 곳은 아래 목록으로, 한 경로 안에서 상태로 바뀌는 위저드(지원금 찾기)는
  globals.css 의 data-wizard 규칙으로 감춘다.
*/
const HIDDEN_PATTERNS = [
  /^\/jobs\/[^/]+$/, // 공고 상세
  /^\/support\/(?!result\/)[^/]+$/, // 지원제도 상세
  /^\/assessment\/.+/, // 진단 문항 · 결과
  /\/edit$/, // 이력서 · 자기소개서 편집기
  /^\/onboarding\//,
];

export function SiteBottomTabs() {
  const pathname = usePathname();
  if (HIDDEN_PATTERNS.some((p) => p.test(pathname))) return null;
  return (
    // draft3-theme: 고른 탭의 파랑이 세부 화면과 같은 바로취업 파랑으로 나오게 한다 (레이아웃에서 그려져 화면의 테마 밖이다).
    <div className="site-bottom-tabs draft3-theme lg:hidden">
      {/* 탭 줄(64px)이 푸터 끝을 가리지 않게 그만큼 비운다. */}
      <div aria-hidden className="h-16" />
      <BottomTabBar />
    </div>
  );
}
