import Link from "next/link";
import { Phone } from "lucide-react";
import { footerCompanyLinks, footerServiceLinks, siteConfig } from "@/lib/site-config";
import { Logo } from "./logo";

export function SiteFooter() {
  return (
    <footer className="bg-slate-50">
      <div className="mx-auto max-w-7xl px-4.5 py-12 lg:px-8">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Logo height={18} />
            {/* break-keep 이 없으면 "직업진단부터 취 / 업" 처럼 낱말 가운데서 잘린다. */}
            <p className="mt-3 max-w-xs break-keep text-label-1 text-slate-500">
              중장년의 새로운 시작, 한평생 함께합니다. 직업진단부터 취업, 지원금까지 하나의
              플랫폼에서 이어집니다.
            </p>
          </div>

          <div>
            <h3 className="text-label-1 font-semibold text-slate-900">서비스</h3>
            <ul className="mt-3 space-y-2">
              {footerServiceLinks.map((item) => (
                <li key={item.href + item.label}>
                  <Link href={item.href} className="text-label-1 text-slate-500">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-label-1 font-semibold text-slate-900">회사</h3>
            <ul className="mt-3 space-y-2">
              {footerCompanyLinks.map((item, i) => (
                <li key={item.label + i}>
                  <Link href={item.href} className="text-label-1 text-slate-500">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-label-1 font-semibold text-slate-900">고객센터</h3>
            <p className="mt-3 flex items-center gap-2 text-title-3 font-bold text-brand-blue-600">
              <Phone className="size-5" />
              {siteConfig.supportPhone}
            </p>
            <p className="mt-1 text-label-1 text-slate-500">평일 09:00 - 18:00 (주말·공휴일 휴무)</p>
          </div>
        </div>

        {/* 사업자 정보도 좁은 화면에서 접힌다. 낱말·번호가 가운데서 갈리지 않게 한다. */}
        <div className="mt-10 border-t border-border pt-6 text-label-2 break-keep text-slate-400">
          <p>한평생그룹 · 대표 양병웅 · 사업자등록번호 227-88-03196 · 통신판매업 2024-서울도봉-0983</p>
          <p>서울특별시 도봉구 마들로13길 61, 씨드큐브 창동 B동 9층 905, 906호 · korhrdpartners@naver.com</p>
          <p className="mt-2">&copy; {new Date().getFullYear()} Hanpyeongsaeng Baro Job. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
