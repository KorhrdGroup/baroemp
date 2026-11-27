import Link from "next/link";
import { SearchX } from "lucide-react";
import { StatusScreen, statusPrimaryClass, statusSecondaryClass } from "@/components/common/status-screen";

/**
 * 사이트 안에서 없는 것을 찾았을 때 (없어진 공고 · 지원제도 등 notFound() 를 부른 화면).
 * 사이트 레이아웃 안에 그려져 머리글 · 아래 탭이 그대로 남는다.
 */
export default function SiteNotFound() {
  return (
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
  );
}
