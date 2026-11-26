import type { Metadata } from "next";
import { BadgeCheck } from "lucide-react";
import { PageHead } from "@/components/layout/page-head";
import { ConsultingRequestForm } from "@/features/consulting/consulting-request-form";

export const metadata: Metadata = {
  title: "1:1 취업컨설팅 | 한평생 바로취업",
};

export default function ConsultingPage() {
  return (
    // /draft3 색 구성 (globals.css .draft3-theme): 흰 머리 아래 회색 바탕에 흰 신청 카드.
    <div className="draft3-theme">
      {/*
       * 다른 세부 화면과 같은 흰 바탕 화면 머리를 쓴다.
       * 유일한 유료 서비스라는 점은 진한 띠 대신 제목 옆 "유료 서비스" 표시와 폼 안 안내문으로 알린다.
       */}
      <PageHead icon="consulting"
        crumbs={[{ label: "취업 상담" }]}
        title="1:1 취업컨설팅"
        description="전문가와 함께 직업·자격·채용·지원금을 연결하는 맞춤 상담을 받아보세요."
      >
        <p className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-full bg-white px-3 py-1.5 text-body-3 font-semibold text-baro-navy sm:self-auto">
          <BadgeCheck className="size-4" />
          유료 서비스
        </p>
      </PageHead>

      {/* 폼은 한 줄이 너무 길어지지 않게 3xl 로 좁혀 둔다. */}
      <div className="bg-baro-page">
        <div className="mx-auto max-w-7xl px-4.5 pt-10 pb-16 sm:pb-20 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <ConsultingRequestForm />
          </div>
        </div>
      </div>
    </div>
  );
}
