"use client";

import { usePathname } from "next/navigation";
import { ShieldCheck } from "lucide-react";

/**
 * 메인 상단 띠배너.
 *
 * 고용24(work24.go.kr)의 상단 안내 띠를 참고했다. 다만 그쪽 문구인
 * "대한민국 공식 전자정부 누리집"은 쓸 수 없다. 이 사이트는 (주)한평생바로취업이
 * 운영하는 민간 서비스라 정부 누리집을 자처하면 사실과 다르다.
 * 형식만 빌리고, 문구는 운영 주체를 있는 그대로 밝히는 쪽으로 적었다.
 *
 * 문구는 운영팀이 정한 것을 그대로 쓴다.
 * 다만 1:1 취업컨설팅은 유료다(consulting-request-form 에 결제 안내가 있다).
 * 컨설팅이 계속 유료라면 이 띠의 "무료"와 어긋나므로, 표기 방식을 바꾸게 될 때
 * 두 곳을 같이 봐야 한다.
 *
 * 메인에서만 띄운다. 안쪽 화면까지 따라다니면 매번 같은 안내를 읽히게 되고
 * 헤더가 그만큼 아래로 밀린다.
 */
export function SiteNoticeBar() {
  const pathname = usePathname();
  if (pathname !== "/") return null;

  return (
    <div className="border-b border-slate-200 bg-slate-50">
      <div className="mx-auto flex max-w-7xl items-center gap-1.5 px-4 py-1.5 sm:px-6 lg:px-8">
        <ShieldCheck aria-hidden className="size-3.5 shrink-0 text-slate-400" />
        <p className="text-label-2 break-keep text-slate-500">
          <span className="font-medium text-slate-600">(주)한평생바로취업</span>이 운영하는 중장년
          취업지원 서비스입니다.
        </p>
      </div>
    </div>
  );
}
