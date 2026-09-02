"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { UserRoundPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/**
 * 비로그인으로 일자리찾기를 볼 때의 문지기.
 *
 * 첫 화면은 로그인 없이 열어 두되, 공고를 열거나 조건을 바꾸는 순간에는 회원이 되어야 한다.
 * 그때 곧바로 로그인 화면으로 보내면 "보던 것이 사라지고 로그인부터 하라"는 말로 읽혀 대부분 떠난다.
 * 대신 이 자리에서 무료라는 것과 무엇이 좋아지는지 알려주고, 가입할지 회원이 정하게 한다.
 *
 * 자식 컴포넌트를 고치지 않는다 - 누르는 순간을 캡처 단계에서 가로채, 로그인이 필요한 것만 막는다.
 * (캡처 단계라 자식의 onClick·<Link> 이동보다 먼저 실행된다.)
 */
export function GuestGate({ active, children }: { active: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(false);

  /** 로그인이 필요한 동작인지. 필터 창을 열어 보는 것까지 막으면 둘러볼 수조차 없다. */
  function needsLogin(target: HTMLElement): boolean {
    // 공고 상세로 가는 링크, 다음 쪽으로 가는 링크
    const link = target.closest("a[href]");
    if (link) {
      const href = link.getAttribute("href") ?? "";
      return /^\/jobs\/[^/]/.test(href) || href.includes("page=");
    }
    // 검색·적용하기(조건을 걸어 목록을 다시 부르는 것), 찜하기
    const button = target.closest("button");
    if (!button) return false;
    if (button.type === "submit") return true;
    const label = button.textContent?.trim() ?? "";
    return label === "적용하기" || button.getAttribute("aria-label") === "찜하기";
  }

  function guard(e: React.MouseEvent | React.KeyboardEvent) {
    if (!active) return;
    if (!needsLogin(e.target as HTMLElement)) return;
    e.preventDefault();
    e.stopPropagation();
    setOpen(true);
  }

  return (
    <>
      <div onClickCapture={guard}>{children}</div>

      <Dialog open={open} onOpenChange={setOpen}>
        {/* 알림톡 동의 창과 같은 모양: 동그란 아이콘 · 가운데 정렬 · 주 버튼 + 옅은 보조 버튼. */}
        <DialogContent className="max-w-md gap-6 px-5 pt-6 pb-4" showCloseButton={false}>
          <DialogHeader className="items-center gap-3 text-center sm:text-center">
            <span className="mb-1 flex size-12 items-center justify-center rounded-full bg-brand-blue-50 text-brand-blue-600">
              <UserRoundPlus className="size-6" />
            </span>
            <DialogTitle className="text-title-3 font-bold text-slate-900">회원가입하고 무료로 이용해보세요</DialogTitle>
            <DialogDescription className="text-body-2 leading-relaxed break-keep text-slate-500">
              가입하시면 공고 자세히 보기와 찜하기,
              <br />내 조건에 맞는 맞춤 공고까지 모두 무료입니다.
              <span className="mt-3 block text-label-2 text-slate-400">
                직업진단·지원금 찾기·이력서 첨삭도 함께 쓰실 수 있어요.
              </span>
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-1">
            <Button size="lg" className="w-full bg-brand-blue-400 text-body-2 font-bold hover:bg-brand-blue-600" asChild>
              <Link href="/signup?next=/jobs">무료로 회원가입</Link>
            </Button>
            <Button variant="ghost" className="h-10 w-full text-slate-500 hover:bg-transparent hover:text-slate-600" asChild>
              <Link href="/login?next=/jobs">이미 회원이에요 · 로그인</Link>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
