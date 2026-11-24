import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/layout/site-footer";
import { BottomTabBar } from "@/features/home-draft/bottom-tab-bar";
import { SiteHeaderDraft } from "@/features/home-draft/site-header-draft";
import { getCurrentUser } from "@/lib/auth/session";

/*
  디자인 리뉴얼 시안(/draft). 지금 홈(/)은 그대로 두고 옆에서 견줘 보려는 화면이다.
  시안이라 운영에서는 열리지 않는다.
*/
export default async function DraftLayout({ children }: { children: React.ReactNode }) {
  if (process.env.NODE_ENV === "production") notFound();
  const user = await getCurrentUser();
  return (
    // 회색 바탕 위에 흰 카드를 얹는다. 좁은 화면은 아래 탭(64px)에 푸터가 가리지 않게 그만큼 비운다.
    <div className="flex min-h-screen flex-col bg-gov-surface pb-16 lg:pb-0">
      <SiteHeaderDraft user={user ? { name: user.name, email: user.email, role: user.role } : null} />
      <main className="flex-1">{children}</main>
      <SiteFooter />
      <BottomTabBar />
    </div>
  );
}
