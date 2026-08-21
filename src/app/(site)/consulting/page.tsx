import type { Metadata } from "next";
import { BadgeCheck } from "lucide-react";
import { ConsultingRequestForm } from "@/features/consulting/consulting-request-form";

export const metadata: Metadata = {
  title: "1:1 취업컨설팅 | 한평생 바로취업",
};

export default function ConsultingPage() {
  return (
    <div>
      {/*
       * 유일한 유료 서비스라 다른 화면과 다르게 보여야 한다.
       * 딥 네이비 그라데이션 밴드로 무게를 주고, 신청 폼은 그 아래에 흰 카드로 얹는다.
       * 헤더 구성(아이브로우 / 제목 / 설명)과 좌측 정렬은 다른 페이지와 동일하게 유지한다.
       */}
      <section className="relative overflow-hidden bg-[linear-gradient(135deg,var(--atomic-blue-900)_0%,var(--atomic-blue-800)_45%,var(--atomic-blue-700)_100%)]">
        <span
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-brand-blue-400/25 blur-3xl"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute -bottom-32 left-1/4 size-80 rounded-full bg-brand-blue-500/20 blur-3xl"
        />

        <div className="relative mx-auto max-w-3xl px-4 pb-28 pt-20 sm:px-6 lg:px-8">
          <p className="flex items-center gap-1.5 text-label-1 font-semibold text-brand-blue-200">
            <BadgeCheck className="size-4" />
            유료 서비스
          </p>
          <h1 className="mt-2 break-keep text-title-2 font-bold text-white sm:text-headline-3">1:1 취업컨설팅</h1>
          <p className="mt-2 max-w-xl break-keep text-body-2-reading text-brand-blue-100">
            전문가와 함께 직업·자격·채용·지원금을 연결하는 맞춤 상담을 받아보세요.
          </p>
        </div>
      </section>

      {/* 그라데이션 밴드 아래로 폼을 걸쳐 놓는다. 형제로 빼야 마진 상쇄를 피할 수 있다. */}
      <div className="relative z-10 mx-auto -mt-20 max-w-3xl px-4 pb-12 sm:px-6 lg:px-8">
        <ConsultingRequestForm />
      </div>
    </div>
  );
}
