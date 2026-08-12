import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { listExperienceBankForUser } from "@/services/experience-bank.service";
import { ExperienceBankManager } from "@/features/experience-bank/experience-bank-manager";

export const metadata: Metadata = {
  title: "경험뱅크 | 한평생 바로취업",
};

export default async function ExperienceBankPage() {
  const user = await requireUser("/experience-bank");
  const items = await listExperienceBankForUser(user.id);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <p className="text-sm font-semibold text-brand-blue-600">경험뱅크</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">나의 경험을 저장해두세요.</h1>
        <p className="mt-2 text-[15px] text-slate-500">
          한 번 저장한 경험은 여러 자기소개서 문항에서 다시 꺼내 쓸 수 있어요.
        </p>
      </div>
      <ExperienceBankManager initialItems={items} />
    </div>
  );
}
