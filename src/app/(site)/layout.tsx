import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteFooterGate } from "@/components/layout/site-footer-gate";
import { BookmarkMergeOnLogin } from "@/features/auth/bookmark-merge-on-login";
import { getCurrentUser } from "@/lib/auth/session";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <SiteHeader />
      {user && <BookmarkMergeOnLogin />}
      <main className="flex-1">{children}</main>
      <SiteFooterGate>
        <SiteFooter />
      </SiteFooterGate>
    </div>
  );
}
