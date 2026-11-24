import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * 첫 줄 오른쪽 카드. 로그인 전에는 "로그인하면 무엇이 좋은지"를 말하고,
 * 로그인 뒤에는 이름을 불러 맞춤 공고로 보낸다 (잡아바의 로그인 카드 자리).
 * 휴대폰에서는 아래 탭의 "마이"가 같은 일을 하므로 넓은 화면에서만 보인다.
 */
export function AccountCard({ user }: { user: { name?: string } | null }) {
  return (
    <div className="flex h-full flex-col justify-between rounded-2xl border border-border bg-white p-6">
      {user ? (
        <>
          <div>
            <p className="text-title-2 font-bold break-keep text-slate-900">{user.name ? `${user.name}님` : "회원님"}</p>
            <div className="mt-4 flex flex-col divide-y divide-border border-y border-border">
              {[
                { label: "찜한 공고", href: "/mypage/bookmarks" },
                { label: "내 이력서", href: "/resume" },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center justify-between py-3 text-body-1 text-slate-700"
                >
                  {item.label}
                  <ChevronRight className="size-4 text-slate-500" />
                </Link>
              ))}
            </div>
          </div>
          <div className="mt-6 flex flex-col gap-2">
            <Button asChild size="lg" className="w-full">
              <Link href="/jobs">나에게 맞는 공고 보기</Link>
            </Button>
            <Link href="/mypage" className="py-1 text-center text-body-3 text-slate-600">
              마이페이지
            </Link>
          </div>
        </>
      ) : (
        <>
          <div>
            <p className="text-title-2 font-bold text-slate-900">로그인</p>
            <p className="mt-2 text-body-1 break-keep text-slate-700">맞춤 공고를 먼저 보여드려요</p>
          </div>
          <div className="mt-6 flex flex-col gap-2">
            <Button asChild size="lg" className="w-full">
              <Link href="/login">로그인</Link>
            </Button>
            <Link href="/signup" className="py-1 text-center text-body-3 text-slate-600">
              회원가입
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
