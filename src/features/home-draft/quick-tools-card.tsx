import Link from "next/link";
import { ServiceIcon } from "./service-icons";

/** 일자리 찾기는 머리글 검색과 가운데 공고 판이 맡아, 나머지 도구만 둔다. */
const TOOLS = [
  { id: "assessment", label: "직업진단", desc: "나에게 맞는 일 찾기", href: "/assessment" },
  { id: "resume", label: "이력서 첨삭", desc: "경력을 이력서로 정리", href: "/resume" },
  { id: "coverLetter", label: "자기소개서", desc: "질문 따라 쉽게 쓰기", href: "/cover-letter" },
  { id: "support", label: "지원금 찾기", desc: "받을 수 있는 돈 확인", href: "/support" },
  { id: "consulting", label: "취업 상담", desc: "전문가와 1:1 상담", href: "/consulting" },
];

/**
 * 도구 상자 (사람인의 "AI서류합격코칭 · 맞춤법 검사" 자리).
 * 첫 줄 아래 전체 폭 한 줄. 도구마다 따로 흰 카드로 나누고, 사이 간격은 위 첫 줄과 같게 둔다.
 * 넓은 화면은 다섯 칸을 한 줄에 두고 그림 옆에 이름 · 한 줄 설명을 놓는다.
 * 휴대폰·태블릿은 세 칸씩 두 줄로, 그림 위 · 이름 아래로 쌓고 설명은 뺀다 - 칸이 좁아 두 줄로 꺾이면 더 어지럽다.
 */
export function QuickToolsCard() {
  return (
    <nav
      aria-label="바로가기"
      className="grid grid-cols-3 gap-3 sm:gap-4 lg:grid-cols-5"
    >
      {TOOLS.map((tool) => (
        <Link
          key={tool.id}
          href={tool.href}
          className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-white px-2 py-4 text-center lg:flex-row lg:gap-3 lg:px-4 lg:py-5 lg:text-left"
        >
          <ServiceIcon id={tool.id} />
          <span className="flex flex-col">
            <span className="text-body-3 font-semibold break-keep text-slate-800">{tool.label}</span>
            <span className="hidden text-caption-1 font-medium text-slate-600 lg:block">{tool.desc}</span>
          </span>
        </Link>
      ))}
    </nav>
  );
}
