import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { coreServices } from "./core-services.data";
import { cn } from "@/lib/utils";

export function CoreServicesSection() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {coreServices.map((service) => {
          const Icon = service.icon;
          return (
            <Link
              key={service.id}
              href={service.href}
              className="group flex flex-col items-center gap-3 rounded-2xl border border-border bg-white px-3 py-6 text-center transition-colors hover:border-brand-blue-200"
            >
              <span className="flex size-12 items-center justify-center rounded-2xl bg-brand-blue-50 text-brand-blue-600 transition-colors group-hover:bg-brand-blue-500 group-hover:text-white">
                <Icon className="size-6" />
              </span>
              <div>
                <p className="text-body-2 font-semibold text-slate-900">{service.title}</p>
                <p className="mt-1 text-label-2 text-slate-500">{service.description}</p>
              </div>
              <Badge
                className={cn(
                  "rounded-full border-0 px-2.5 py-1 text-label-2 font-semibold",
                  service.badge === "무료" && "bg-brand-blue-50 text-brand-blue-600",
                  service.badge === "유료" && "bg-amber-50 text-amber-600",
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
