import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { ServiceIcon } from "./service-icons";

/** 일자리 찾기는 머리글 검색과 가운데 공고 판이 맡아, 나머지 도구만 둔다. 첫째가 넓은 칸에 놓인다. */
const TOOLS = [
  { id: "assessment", label: "직업진단", desc: "나에게 맞는 일 찾기", href: "/assessment" },
  { id: "resume", label: "이력서 첨삭", desc: "경력을 이력서로 정리", href: "/resume" },
  { id: "coverLetter", label: "자기소개서", desc: "질문 따라 쉽게 쓰기", href: "/cover-letter" },
  { id: "support", label: "지원금 찾기", desc: "받을 수 있는 돈 확인", href: "/support" },
  { id: "consulting", label: "취업 상담", desc: "전문가와 1:1 상담", href: "/consulting" },
];

/**
 * 도구 상자 (사람인의 "AI서류합격코칭 · 맞춤법 검사" 자리).
 * 같은 크기 다섯 칸은 무게가 같아 어디부터 누를지 안 보여, 처음 온 사람이 할 일(직업진단)만 넓은 칸으로 키운다.
 * 두 줄 높이의 큰 칸은 바로 위 첫 줄(공고 판 · 로그인 · 배너)과 겹쳐 무거워 보여, 넓은 화면은 한 줄로 낮게 둔다:
 * 넓은 칸(두 몫) + 작은 칸 넷. 휴대폰은 넓은 칸이 맨 위 한 줄, 아래 작은 칸 2×2.
 */
export function QuickToolsCard() {
  const [main, ...rest] = TOOLS;
  return (
    <nav aria-label="바로가기" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-6">
      <Link
        href={main.href}
        className="col-span-2 flex items-center justify-between gap-4 rounded-2xl bg-brand-blue-50 px-5 py-4 lg:px-6"
      >
        <span className="flex flex-col items-start">
          <span className="text-body-1 font-bold text-slate-900">{main.label}</span>
          <span className="mt-0.5 text-body-3 font-medium text-slate-700">{main.desc}</span>
          {/* 누르는 곳임이 보이게 흰 알약 단추 모양으로. 링크는 카드 전체다. */}
          <span className="mt-2.5 inline-flex items-center gap-0.5 rounded-full bg-white py-1 pr-2 pl-3 text-body-3 font-semibold text-brand-blue-600">
            시작하기
            <ChevronRight className="size-4" />
          </span>
        </span>
        <span className="shrink-0 [&>svg]:size-[72px]">
          <ServiceIcon id={main.id} />
        </span>
      </Link>

      {/*
        작은 칸: 위에 그림 · 오른쪽 위 꺾쇠, 아래에 이름 · 설명. 가로로 늘어놓으면 칸이 좁아
        설명이 빠지고 이름만 남아 비어 보였다. 세로로 쌓으면 설명까지 한 줄씩 들어간다.
      */}
      {rest.map((tool) => (
        <Link
          key={tool.id}
          href={tool.href}
          className="flex flex-col justify-between gap-2 rounded-2xl border border-border bg-white p-4"
        >
          <span className="flex items-start justify-between">
            <span className="[&>svg]:size-9">
              <ServiceIcon id={tool.id} />
            </span>
            <ChevronRight className="size-4 shrink-0 text-slate-500" aria-hidden />
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="text-body-3 font-semibold whitespace-nowrap text-slate-900">{tool.label}</span>
            <span className="truncate text-caption-1 font-medium text-slate-600">{tool.desc}</span>
          </span>
        </Link>
      ))}
    </nav>
  );
}
