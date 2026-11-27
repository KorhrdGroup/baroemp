"use client"; // 오류 경계는 클라이언트 컴포넌트여야 한다.

import { useEffect } from "react";
import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import { StatusScreen, statusPrimaryClass, statusSecondaryClass } from "@/components/common/status-screen";

/**
 * 사이트 화면을 그리다 예상하지 못한 오류가 났을 때.
 * 사이트 레이아웃 안에 그려져 머리글 · 아래 탭이 그대로 남는다. 오류 내용은 회원에게 보여 주지 않고 콘솔에만 남긴다.
 * "다시 시도"는 retry() - 이 화면이 감싼 부분을 서버에서 다시 받아 그린다 (Next 16.3).
 */
export default function SiteError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <StatusScreen
      icon={TriangleAlert}
      title="잠시 문제가 생겼어요"
      description={["화면을 불러오지 못했어요.", "다시 시도해도 안 되면 잠시 후에 다시 들어와 주세요."]}
    >
      <button type="button" onClick={() => retry()} className={statusPrimaryClass}>
        다시 시도
      </button>
      <Link href="/" className={statusSecondaryClass}>
        홈으로 가기
      </Link>
    </StatusScreen>
  );
}
