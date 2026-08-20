import type { Metadata } from "next";
import { SupportFlow } from "@/features/support/support-flow";

export const metadata: Metadata = {
  title: "지원금 찾기 | 한평생 바로취업",
};

export default function SupportPage() {
  return (
    <div>
      <SupportFlow />
    </div>
  );
}
