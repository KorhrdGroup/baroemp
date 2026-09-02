"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { setMarketingConsentAction } from "@/features/profile/profile-actions";

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
      <DialogContent className="max-w-md" showCloseButton={false}>
        <DialogHeader className="items-center text-center sm:text-center">
          <span className="mb-2 flex size-12 items-center justify-center rounded-full bg-brand-blue-50 text-brand-blue-600">
            <BellRing className="size-6" />
          </span>
          <DialogTitle className="text-title-3 font-bold text-slate-900">맞춤 정보를 알림톡으로 받아보시겠어요?</DialogTitle>
          <DialogDescription className="break-keep text-body-2 leading-relaxed text-slate-600">
            동의하시면 내 조건에 맞는 새 채용공고와 받을 수 있는 지원금 소식을 카카오 알림톡으로 보내드려요.
            <br />
            무료이니 한번 받아보세요. 나중에 마이페이지 정보 수정에서 언제든 철회할 수 있어요.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button size="lg" className="w-full bg-brand-blue-400 hover:bg-brand-blue-600" onClick={agree} disabled={pending}>
            {pending ? "저장 중..." : "네, 받아볼게요"}
          </Button>
          <Button size="lg" variant="ghost" className="w-full text-slate-500" onClick={() => setOpen(false)} disabled={pending}>
            나중에 할게요
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
