import Link from "next/link";
import { SectionHeading } from "@/components/common/section-heading";
import { coreServices } from "./core-services.data";

export function QuickLinksSection() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
      <SectionHeading title="취업 성공을 위한 맞춤 서비스" description="필요한 서비스를 선택해서 바로 이용해보세요." align="center" />

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {coreServices.map((service) => {
          const Icon = service.icon;
          return (
            <div
              key={service.id}
              className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-white px-4 py-7 text-center"
            >
              <span className="flex size-11 items-center justify-center rounded-full bg-brand-blue-50 text-brand-blue-600">
                <Icon className="size-5" />
              </span>
              <p className="text-label-1 font-semibold text-slate-800">{service.title}</p>
              <Link
                href={service.href}
                className="rounded-full border border-border px-4 py-1.5 text-label-2 font-medium text-slate-600 transition-colors hover:border-brand-blue-300 hover:text-brand-blue-600"
              >
                바로가기
              </Link>
            </div>
          );
        })}
      </div>
    </section>
  );
}
