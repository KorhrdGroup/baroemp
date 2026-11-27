import Link from "next/link";
import { footerCompanyLinks, footerServiceLinks } from "@/lib/site-config";
import { Logo } from "./logo";

/**
 * 사이트 공용 푸터. 네 칸 짜리 표 대신 세 줄로 줄였다:
 * 로고 → 서비스 · 약관 링크 한 줄 → 사업자 정보.
 * 메뉴는 머리글에 이미 있으니 푸터는 "누가 운영하나"만 또렷하게 둔다. 고객센터 안내(전화 · 운영 시간)는 뺐다.
 */
export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-white">
      <div className="mx-auto max-w-7xl px-4.5 py-10 lg:px-8">
        <Logo height={18} />

        <nav aria-label="푸터" className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-body-3 font-medium text-slate-600">
          {footerServiceLinks.map((item) => (
            <Link key={item.href + item.label} href={item.href}>
              {item.label}
            </Link>
          ))}
          {footerCompanyLinks.map((item, i) => (
            // 개인정보처리방침은 눈에 띄게 굵게 두는 것이 관례다.
            <Link
              key={item.label + i}
              href={item.href}
              className={item.label.includes("개인정보") ? "font-bold text-slate-900" : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* 사업자 정보도 좁은 화면에서 접힌다. 낱말·번호가 가운데서 갈리지 않게 한다. */}
        <div className="mt-6 space-y-0.5 border-t border-border pt-6 text-caption-1 font-medium break-keep text-slate-600">
          <p>한평생그룹 · 대표 양병웅 · 사업자등록번호 227-88-03196 · 통신판매업 2024-서울도봉-0983</p>
          <p>직업정보제공사업 신고번호 : J1205020260013 (서울북부 제2026-13호)</p>
          <p>서울특별시 도봉구 마들로13길 61, 씨드큐브 창동 B동 9층 905, 906호 · korhrdpartners@naver.com</p>
          <p className="pt-2">&copy; {new Date().getFullYear()} Hanpyeongsaeng Baro Job. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
