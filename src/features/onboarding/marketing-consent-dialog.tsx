"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { setMarketingConsentAction } from "@/features/profile/marketing-consent-actions";

/**
 * 소셜 로그인으로 가입한 회원에게 온보딩에 앞서 한 번 묻는 알림톡 수신 동의.
 * 이메일 가입은 가입 화면에 [선택] 체크가 있지만 소셜 가입은 그 화면을 거치지 않아 물을 자리가 없었다.
 * "나중에"를 고르면 그냥 닫히고, 온보딩 마지막 스텝과 마이페이지 정보 수정에서 다시 켤 수 있다.
 */
export function MarketingConsentDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const [pending, startTransition] = useTransition();

  const agree = () => {
    startTransition(async () => {
      try {
        await setMarketingConsentAction({ consent: true });
        router.refresh(); // 온보딩 마지막 스텝의 동의 체크가 다시 안 나오게 서버 상태를 반영한다.
      } finally {
        setOpen(false);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !pending && setOpen(next)}>
      {/* 아래 여백은 기본보다 줄인다. 버튼 둘 아래에 판이 길게 남았다. */}
      <DialogContent className="max-w-md gap-6 px-5 pb-4 pt-6" showCloseButton={false}>
        <DialogHeader className="items-center gap-3 text-center sm:text-center">
          <span className="mb-1 flex size-12 items-center justify-center rounded-full bg-brand-blue-50 text-brand-blue-600">
            <BellRing className="size-6" />
          </span>
          <DialogTitle className="text-title-3 font-bold text-slate-900">맞춤 정보를 알림톡으로 받아보시겠어요?</DialogTitle>
          <DialogDescription className="break-keep text-body-2 leading-relaxed text-slate-500">
            내 조건에 맞는 새 공고와 지원금 소식을
            <br />
            카카오 알림톡으로 보내드려요.
            {/* 부가 설명은 한 단계 작고 옅게. 본문과 같은 크기면 세 줄이 한 덩어리로 읽힌다. */}
            {/* 부가 설명과 동의 내용 링크는 한 줄. 작고 옅게 두어 본문 두 줄이 주인공으로 남게. */}
            <span className="mt-3 block text-label-2 text-slate-400">
              마이페이지에서 언제든 끌 수 있어요 ·{" "}
              <a
                href="/marketing-consent"
                target="_blank"
                rel="noopener"
                className="underline underline-offset-2 hover:text-slate-600"
              >
                동의 내용 자세히 보기
              </a>
            </span>
          </DialogDescription>
        </DialogHeader>
        {/* DialogFooter 의 회색 띠·윗선을 쓰지 않는다. 창 하나가 흰 판 하나로 읽히게. */}
        <div className="flex flex-col gap-1">
          <Button size="lg" className="w-full bg-brand-blue-400 text-body-2 font-bold hover:bg-brand-blue-600" onClick={agree} disabled={pending}>
            {pending ? "저장 중..." : "네, 받아볼게요"}
          </Button>
          {/* 보조 버튼은 주 버튼만큼 높을 이유가 없다. 위아래를 줄여 주 버튼에 붙인다. */}
          <Button variant="ghost" className="h-10 w-full text-slate-500" onClick={() => setOpen(false)} disabled={pending}>
            나중에 할게요
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
