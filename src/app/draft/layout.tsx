import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/layout/site-footer";
import { BottomTabBar } from "@/features/home-draft/bottom-tab-bar";
import { SiteHeaderDraft } from "@/features/home-draft/site-header-draft";
import { getCurrentUser } from "@/lib/auth/session";

/*
  디자인 리뉴얼 시안(/draft). 지금 홈(/)은 그대로 두고 옆에서 견줘 보려는 화면이다.
  시안이라 운영 사이트에서는 열리지 않는다. Vercel 미리보기 배포(VERCEL_ENV=preview)와
  로컬에서는 열어 팀이 함께 볼 수 있게 한다. 검색엔진에는 올리지 않는다.
*/
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function DraftLayout({ children }: { children: React.ReactNode }) {
  if (process.env.VERCEL_ENV === "production") notFound();
  const user = await getCurrentUser();
  return (
    // 회색 바탕 위에 흰 카드를 얹는다. 좁은 화면은 아래 탭(64px)에 푸터가 가리지 않게 그만큼 비운다.
    // 회색은 시안 전용 쿨그레이(globals.css 의 .draft-cool-grey)로 맞춘다.
    <div className="draft-cool-grey flex min-h-screen flex-col bg-gov-surface pb-16 lg:pb-0">
      <SiteHeaderDraft user={user ? { name: user.name, email: user.email, role: user.role } : null} />
      <main className="flex-1">{children}</main>
      <SiteFooter />
      <BottomTabBar />
    </div>
  );
}
