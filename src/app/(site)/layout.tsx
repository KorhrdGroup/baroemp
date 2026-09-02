import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteFooterGate } from "@/components/layout/site-footer-gate";
import { BookmarkMergeOnLogin } from "@/features/auth/bookmark-merge-on-login";
import { SessionSync } from "@/features/auth/session-sync";
import { getCurrentUser } from "@/lib/auth/session";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <SiteHeader />
      {/* 세션이 끊기거나 다른 탭에서 바뀌어도 헤더가 서버 상태 그대로 남지 않게 한다. */}
      <SessionSync serverHasUser={Boolean(user)} />
      {user && <BookmarkMergeOnLogin />}
      <main className="flex-1">{children}</main>
      <SiteFooterGate>
        <SiteFooter />
      </SiteFooterGate>
    </div>
  );
}
