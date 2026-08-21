import type { Metadata } from "next";
import { SupportFlow } from "@/features/support/support-flow";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "지원금 찾기 | 한평생 바로취업",
};

export default async function SupportPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string }>;
}) {
  const { start } = await searchParams;
  // 직업진단과 같은 이유로 로그인 필요. 로그인 후 시작 지점으로 그대로 돌아온다.
  await requireUser(start === "1" ? "/support?start=1" : "/support");

  return (
    <div>
      {/* ?start=1: 이미 무엇을 하려는지 아는 경로(마이페이지 등)에서 소개 화면을 건너뛴다. */}
      <SupportFlow autoStart={start === "1"} />
    </div>
  );
}
