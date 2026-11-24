import Link from "next/link";
import { ServiceIcon } from "./service-icons";

/** 일자리 찾기는 머리글 검색과 가운데 공고 판이 맡아, 나머지 세 도구만 둔다. */
const TOOLS = [
  { id: "assessment", label: "직업진단", href: "/assessment" },
  { id: "resume", label: "이력서 첨삭", href: "/resume" },
  { id: "support", label: "지원금 찾기", href: "/support" },
];

/**
 * 로그인 카드 아래 도구 상자 (사람인 오른쪽의 "AI서류합격코칭 · 맞춤법 검사" 자리).
 * 그림 위 · 이름 아래인 정사각 칸 셋이라 누를 자리가 크다.
 */
export function QuickToolsCard() {
  return (
    <nav aria-label="바로가기" className="grid grid-cols-3 gap-2 rounded-2xl border border-border bg-white p-3">
      {TOOLS.map((tool) => (
        <Link
          key={tool.id}
          href={tool.href}
          className="flex flex-col items-center gap-2 rounded-xl px-1 py-3 text-center transition-colors hover:bg-slate-50"
        >
          <ServiceIcon id={tool.id} />
          <span className="text-label-1 font-semibold break-keep text-slate-800">{tool.label}</span>
        </Link>
      ))}
    </nav>
  );
}
