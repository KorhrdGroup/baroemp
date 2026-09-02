import type { Metadata } from "next";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

/*
  OG/Twitter 카드용 절대 URL 기준. 배포 도메인이 정해지면 NEXT_PUBLIC_SITE_URL 로 넘긴다.
  값이 없으면 로컬에서 metadataBase 경고가 뜨지만 배포가 아니어서 무해하다.
*/
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
const siteTitle = "한평생 바로취업 | 중장년 취업 원스톱 플랫폼";
const siteDescription =
  "내게 맞는 일자리를 찾고 취업 성공까지 한 번에. 직업진단부터 채용정보, 지원금, 이력서 첨삭, 취업컨설팅까지 함께하는 한평생 바로취업입니다.";
/*
  이미지 파일명은 한글·공백이 없는 og-image.png 사본을 참조한다.
  원본(public/한평생 직업훈련 OG.png)은 그대로 두었고, 크롤러 호환성 때문에 사본을 쓴다.
*/
const ogImage = "/og-image.png";

export const metadata: Metadata = {
  metadataBase: siteUrl ? new URL(siteUrl) : undefined,
  title: siteTitle,
  description: siteDescription,
  openGraph: {
    type: "website",
    title: siteTitle,
    description: siteDescription,
    siteName: "한평생 바로취업",
    locale: "ko_KR",
    images: [{ url: ogImage, width: 1200, height: 630, alt: "한평생 바로취업 - 중장년 취업 원스톱 플랫폼" }],
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
    images: [ogImage],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-white text-foreground">
        <link
          rel="preconnect"
          href="https://cdn.jsdelivr.net"
          crossOrigin="anonymous"
        />
        {/* Pretendard - 본문·제목 공통 서체. 한글 글자수가 많아 동적 서브셋본 사용 */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
          precedence="default"
        />
        <TooltipProvider delayDuration={150}>{children}</TooltipProvider>
      </body>
    </html>
  );
}
