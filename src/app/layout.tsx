import type { Metadata } from "next";
import Script from "next/script";
import { Noto_Sans_KR } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const notoSansKr = Noto_Sans_KR({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "한평생 바로취업 | 중장년 취업 원스톱 플랫폼",
  description:
    "내게 맞는 일자리를 찾고 취업 성공까지 한 번에. 직업진단부터 채용정보, 지원금, 이력서 첨삭, 취업컨설팅까지 함께하는 한평생 바로취업입니다.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // Typekit 스크립트가 하이드레이션 전에 <html>에 wf-loading 클래스를 붙인다
    <html
      lang="ko"
      className={`${notoSansKr.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-white text-foreground">
        {/* Adobe Fonts(Typekit) 독립고딕 킷 - rixdongnimgothic-pro */}
        <link
          rel="preconnect"
          href="https://use.typekit.net"
          crossOrigin="anonymous"
        />
        <Script id="adobe-typekit" strategy="beforeInteractive">
          {String.raw`(function(d) {
    var config = {
      kitId: 'sik2tky',
      scriptTimeout: 3000,
      async: true
    },
    h=d.documentElement,t=setTimeout(function(){h.className=h.className.replace(/\bwf-loading\b/g,"")+" wf-inactive";},config.scriptTimeout),tk=d.createElement("script"),f=false,s=d.getElementsByTagName("script")[0],a;h.className+=" wf-loading";tk.src='https://use.typekit.net/'+config.kitId+'.js';tk.async=true;tk.onload=tk.onreadystatechange=function(){a=this.readyState;if(f||a&&a!="complete"&&a!="loaded")return;f=true;clearTimeout(t);try{Typekit.load(config)}catch(e){}};s.parentNode.insertBefore(tk,s)
  })(document);`}
        </Script>
        <TooltipProvider delayDuration={150}>{children}</TooltipProvider>
      </body>
    </html>
  );
}
