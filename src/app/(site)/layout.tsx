import { SiteHeader } from "@/components/layout/site-header";
import { SiteNoticeBar } from "@/components/layout/site-notice-bar";
import { SiteFooter } from "@/components/layout/site-footer";
import { BookmarkMergeOnLogin } from "@/features/auth/bookmark-merge-on-login";
import { getCurrentUser } from "@/lib/auth/session";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* 헤더가 sticky 라 스크롤하면 띠배너는 올라가고 헤더만 남는다. */}
      <SiteNoticeBar />
      <SiteHeader />
      {user && <BookmarkMergeOnLogin />}
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
