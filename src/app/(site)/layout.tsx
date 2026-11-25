import { SiteFooter } from "@/components/layout/site-footer";
import { SiteFooterGate } from "@/components/layout/site-footer-gate";
import { SiteBottomTabs } from "@/components/layout/site-bottom-tabs";
import { BookmarkMergeOnLogin } from "@/features/auth/bookmark-merge-on-login";
import { SessionSync } from "@/features/auth/session-sync";
import { SiteHeaderDraft } from "@/features/home-draft/site-header-draft";
import { getCurrentUser } from "@/lib/auth/session";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  return (
    /*
      디자인 리뉴얼: 세부 화면도 두 홈 시안(/draft · /draft2)과 같은 머리글 · 쿨그레이를 쓴다 -
      어느 시안에서 들어와도 머리글이 바뀌지 않게. 휴대폰 아래 탭 줄도 같이 두되, 고정 단추가 있는 화면에서는 SiteBottomTabs 가 감춘다.
    */
    <div className="draft-cool-grey flex min-h-screen flex-col bg-white">
      {/* /draft3 머리글(시안 D)로 맞춘다 - 홈 시안에서 세부 화면으로 넘어가도 머리글이 바뀌지 않게. */}
      <SiteHeaderDraft look="draft3" user={user ? { name: user.name, email: user.email, role: user.role } : null} />
      {/* 세션이 끊기거나 다른 탭에서 바뀌어도 헤더가 서버 상태 그대로 남지 않게 한다. */}
      <SessionSync serverHasUser={Boolean(user)} />
      {user && <BookmarkMergeOnLogin />}
      <main className="flex-1">{children}</main>
      <SiteFooterGate>
        <SiteFooter />
      </SiteFooterGate>
      <SiteBottomTabs />
    </div>
  );
}
