import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { coreServices } from "./core-services.data";
import { cn } from "@/lib/utils";

export function CoreServicesSection() {
  return (
    <section className="pb-14 pt-14">
      {/* 홈의 다른 섹션과 같은 max-w-7xl. 이 섹션만 5xl이라 위 히어로와 좌우 라인이 어긋났다. */}
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-4 px-4 sm:px-6 lg:grid-cols-4 lg:px-8">
        {coreServices.map((service) => {
          const Icon = service.icon;
          return (
            <Link
              key={service.id}
              href={service.href}
              className="group flex flex-col items-center gap-3 rounded-xl border border-border bg-white px-3 py-6 text-center transition-colors hover:border-brand-blue-200"
            >
              {/* 고용24 메인의 상징인 원형 아이콘 타일 */}
              <span className="flex size-16 items-center justify-center rounded-full bg-brand-blue-400 text-white transition-colors group-hover:bg-brand-blue-600">
                <Icon className="size-7" strokeWidth={1.8} />
              </span>
              <div>
                <p className="text-body-2 font-semibold text-slate-900">{service.title}</p>
                <p className="mt-1 text-label-2 text-slate-500">{service.description}</p>
              </div>
              <Badge
                className={cn(
                  "rounded-full border-0 px-2.5 py-1 text-label-2 font-semibold",
                  service.badge === "무료" && "bg-brand-blue-50 text-brand-blue-600",
                  service.badge === "유료" && "bg-slate-200 text-slate-700",
                  service.badge === "준비중" && "bg-slate-100 text-slate-500",
                )}
              >
                {service.badge}
              </Badge>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
