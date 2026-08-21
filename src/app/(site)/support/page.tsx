import type { Metadata } from "next";
import { SupportFlow } from "@/features/support/support-flow";

export const metadata: Metadata = {
  title: "지원금 찾기 | 한평생 바로취업",
};

export default async function SupportPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string }>;
}) {
  const { start } = await searchParams;

  return (
    <div>
      {/* ?start=1: 이미 무엇을 하려는지 아는 경로(마이페이지 등)에서 소개 화면을 건너뛴다. */}
      <SupportFlow autoStart={start === "1"} />
    </div>
  );
}
