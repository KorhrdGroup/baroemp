import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cardBorderClass, cardShadowClass } from "@/lib/ui-classes";
import { Badge } from "@/components/ui/badge";
import { coreServices } from "./core-services.data";
import { cn } from "@/lib/utils";

/*
 * 카드 줄을 히어로 그라데이션 위로 살짝 끌어올려 겹친다.
 * 히어로가 아래쪽에서 흰색으로 페이드되므로 카드가 그 경계에 걸쳐 앉는다.
 * z-10 이 없으면 히어로의 blur 원들이 카드를 덮는다.
 */
export function CoreServicesSection() {
  return (
    <section className="relative z-10 -mt-12 pb-14 sm:-mt-16">
      {/* 홈의 다른 섹션과 같은 max-w-7xl. 이 섹션만 5xl이라 위 히어로와 좌우 라인이 어긋났다. */}
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
        {coreServices.map((service) => {
          const Icon = service.icon;
          return (
            <div
              key={service.id}
              className={cn("flex flex-col gap-4 rounded-xl bg-white p-5", cardBorderClass, cardShadowClass)}
            >
              {/* 아이콘을 왼쪽에 두고 이름·설명을 오른쪽에 쌓는다. */}
              <div className="flex items-start gap-3">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-brand-blue-400 text-white">
                  <Icon className="size-6" strokeWidth={1.8} />
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="text-body-2 font-bold text-slate-900">{service.title}</p>
                    {service.badge && (
                      <Badge
                        className={cn(
                          "rounded-full border-0 px-2 py-0.5 text-label-2 font-semibold",
                          service.badge === "유료" && "bg-slate-200 text-slate-700",
                          service.badge === "준비중" && "bg-slate-100 text-slate-500",
                        )}
                      >
                        {service.badge}
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 text-label-1 text-slate-500">{service.description}</p>
                </div>
              </div>

              {/*
                이동은 이 줄에서만 일어난다. 카드 전체를 링크로 두면 어디를 눌러야 하는지 흐려진다.
                mt-auto 로 카드 높이가 달라도 바로가기 줄은 아래에 맞춰 정렬한다.
              */}
              <Link
                href={service.href}
                className="mt-auto flex h-10 items-center justify-center gap-1 rounded-lg border border-border text-label-1 font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 active:bg-slate-100"
              >
                바로가기
                <ChevronRight className="size-4" />
              </Link>
            </div>
          );
        })}
      </div>
    </section>
  );
}
