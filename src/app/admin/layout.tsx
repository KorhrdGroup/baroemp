import Link from "next/link";
import { AdminHeader } from "@/features/admin/admin-header";
import { AdminSidebar } from "@/features/admin/admin-sidebar";
import { requireAdmin } from "@/lib/auth/session";

/**
 * /admin/** 서버사이드 Role Guard.
 *
 * requireAdmin()은 비로그인이면 /login?next=/admin으로 redirect하고,
 * 로그인했지만 ADMIN/SUPER_ADMIN이 아니면(USER, CONSULTANT 등) null을 반환한다.
 * null인 경우 이 레이아웃 트리 밖(/admin 하위가 아닌 곳)으로 redirect할 수도 있지만,
 * /admin/** 내부로 redirect하면 이 레이아웃이 다시 실행되어 무한 루프가 될 위험이 있으므로
 * 대신 안내 화면을 그 자리에서 렌더링한다. Client에서 메뉴만 숨기는 방식이 아니라
 * Server Component에서 실제 DB role을 조회해 차단하므로 우회할 수 없다.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin("/admin");

  if (!admin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-body-1 font-semibold text-slate-900">접근 권한이 없습니다</h1>
          <p className="mt-2 text-label-1 text-slate-500">
            관리자(ADMIN) 권한이 있는 계정으로 로그인해야 이 페이지에 접근할 수 있습니다.
          </p>
          <Link
            href="/"
            className="mt-6 inline-block rounded-md bg-slate-900 px-4 py-2 text-label-1 font-medium text-white hover:bg-slate-700"
          >
            홈으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <AdminSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminHeader admin={admin} />
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
