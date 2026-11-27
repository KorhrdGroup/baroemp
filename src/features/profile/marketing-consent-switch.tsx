"use client";

import { useState, useTransition } from "react";
import { cn } from "@/lib/utils";
import { setMarketingConsentAction } from "./marketing-consent-actions";

/**
 * 마케팅 정보 · 알림톡 받기 스위치. 누르는 즉시 바뀐 모양을 보이고 저장한다 - 실패하면 되돌린다.
 * 가입 때 한 번 묻고 끝나면 철회할 길이 없어(마케팅 동의 안내의 "철회 방법"), 내 정보(/mypage/account)에 둔다.
 */
export function MarketingConsentSwitch({ initial, labelledBy }: { initial: boolean; labelledBy: string }) {
  const [on, setOn] = useState(initial);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next = !on;
    setOn(next);
    startTransition(async () => {
      try {
        const result = await setMarketingConsentAction({ consent: next });
        setOn(result.consent);
      } catch {
        setOn(!next);
      }
    });
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-labelledby={labelledBy}
      disabled={pending}
      onClick={toggle}
      className={cn(
        "relative tap-44 h-7 w-12 shrink-0 rounded-full transition-colors duration-200",
        on ? "bg-baro-blue" : "bg-slate-300",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "absolute top-1 left-1 size-5 rounded-full bg-white transition-transform duration-200 motion-reduce:transition-none",
          on && "translate-x-5",
        )}
      />
    </button>
  );
}
