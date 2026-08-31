import * as React from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * 고르는 칸.
 *
 * 누르면 브라우저·OS 기본 피커가 뜬다. 모바일에서는 이게 손에 익고, 연도처럼 항목이 많을 때
 * 특히 낫다(화면을 덮는 목록 대신 아래에서 올라오는 휠). 대신 상자와 화살표는 사이트 규격으로
 * 맞춰, 옆에 선 입력칸과 층이 지지 않게 한다.
 *
 * 커스텀 목록이 필요한 자리(검색이 붙거나 항목마다 설명이 필요한 경우)에는 ui/select 를 쓴다.
 */
function NativeSelect({ className, children, ...props }: React.ComponentProps<"select">) {
  return (
    <div className="relative">
      <select
        data-slot="native-select"
        className={cn(
          "h-12 w-full cursor-pointer appearance-none rounded-lg border border-input bg-background pr-11 pl-4 text-body-2 transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-label-1",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      {/* 화살표는 그림이라 클릭을 통과시킨다. 어디를 눌러도 피커가 열려야 한다. */}
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2 text-slate-400"
      />
    </div>
  );
}

export { NativeSelect };
