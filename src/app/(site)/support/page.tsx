import type { Metadata } from "next";
import { SupportFlow } from "@/features/support/support-flow";

export const metadata: Metadata = {
  title: "지원금 찾기 | 한평생 바로취업",
};

export default function SupportPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
      <SupportFlow />
    </div>
  );
}
