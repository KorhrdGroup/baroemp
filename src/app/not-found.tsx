import Link from "next/link";
import { SearchX } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { StatusScreen, statusPrimaryClass, statusSecondaryClass } from "@/components/common/status-screen";
import { siteConfig } from "@/lib/site-config";

/**
 * 어느 화면에도 맞지 않는 주소로 들어왔을 때.
 * 이 파일은 루트 레이아웃 바로 아래에 그려져 사이트 머리글이 없다. 그래서 로고 한 줄만 직접 둔다.
 * 사이트 안에서 notFound() 를 부른 경우는 (site)/not-found.tsx 가 머리글과 함께 보여 준다.
 */
export default function NotFound() {
  return (
    <div className="draft-cool-grey flex min-h-screen flex-col bg-white">
      <header className="border-b border-border/70 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center px-4.5 lg:h-20 lg:px-8">
          <Link href="/" aria-label={siteConfig.name} className="flex shrink-0 items-center">
            <Logo height={18} priority className="lg:hidden" />
            <Logo height={22} priority className="hidden lg:block" />
          </Link>
        </div>
      </header>
      <StatusScreen
        icon={SearchX}
        title="페이지를 찾을 수 없어요"
        description={["주소가 바뀌었거나 없어진 화면이에요.", "아래 단추로 다시 찾아보세요."]}
      >
        <Link href="/" className={statusPrimaryClass}>
          홈으로 가기
        </Link>
        <Link href="/jobs" className={statusSecondaryClass}>
          일자리 찾기
        </Link>
      </StatusScreen>
    </div>
  );
}
