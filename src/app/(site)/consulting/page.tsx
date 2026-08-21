import type { Metadata } from "next";
import { ConsultingRequestForm } from "@/features/consulting/consulting-request-form";

export const metadata: Metadata = {
  title: "1:1 취업컨설팅 | 한평생 바로취업",
};

export default function ConsultingPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <p className="text-label-1 font-semibold text-slate-600">유료 서비스</p>
        <h1 className="mt-1 text-title-2 font-bold text-slate-900 sm:text-headline-3">1:1 취업컨설팅</h1>
        <p className="mt-2 text-body-2-reading text-slate-500">
          전문가와 함께 직업·자격·채용·지원금을 연결하는 맞춤 상담을 받아보세요.
        </p>
      </div>

      <ConsultingRequestForm />
    </div>
  );
}
