import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

/**
 * HDS 타이포 토큰(text-label-2 등)은 tailwind-merge가 기본으로 모르는
 * 이름이라, text-slate-500 같은 색상 클래스와 충돌하는 것으로 보고
 * 크기 클래스를 지워버린다. font-size 그룹에 명시적으로 등록한다.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        {
          text: [
            "display-1",
            "display-2",
            "headline-1",
            "headline-2",
            "headline-3",
            "title-1",
            "title-2",
            "title-3",
            "body-1",
            "body-1-reading",
            "body-2",
            "body-2-reading",
            "label-1",
            "label-2",
          ],
        },
      ],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
