import type { Metadata } from "next";
import { ConsultingRequestForm } from "@/features/consulting/consulting-request-form";

export const metadata: Metadata = {
  title: "1:1 취업컨설팅 | 한평생 바로취업",
};

export default function ConsultingPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 text-center">
        <p className="text-sm font-semibold text-amber-600">유료 서비스</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">1:1 취업컨설팅</h1>
        <p className="mt-2 text-[15px] leading-7 text-slate-500">
          전문가와 함께 직업·자격·채용·지원금을 연결하는 맞춤 상담을 받아보세요.
        </p>
      </div>

      <ConsultingRequestForm />
    </div>
  );
}
