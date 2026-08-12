import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { DashboardKpi } from "@/mocks/dashboard-kpi.mock";
import { cn } from "@/lib/utils";

interface KpiCardsProps {
  items: DashboardKpi[];
}

export function KpiCards({ items }: KpiCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-4">
      {items.map((kpi) => {
        const TrendIcon =
          kpi.changeDirection === "up"
            ? TrendingUp
            : kpi.changeDirection === "down"
              ? TrendingDown
              : Minus;

        return (
          <Card
            key={kpi.key}
            className="rounded-xl border-0 bg-white py-0 shadow-none ring-1 ring-slate-200"
          >
            <CardContent className="px-4 py-4">
              <p className="text-[12px] font-medium text-slate-500">{kpi.label}</p>
              <p className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900">
                {kpi.value}
              </p>
              {kpi.changeLabel && (
                <p
                  className={cn(
                    "mt-2 flex items-center gap-1 text-[11px] font-medium",
                    kpi.changeDirection === "up" && "text-emerald-600",
                    kpi.changeDirection === "down" && "text-red-500",
                    kpi.changeDirection === "flat" && "text-slate-400",
                  )}
                >
                  <TrendIcon className="size-3" />
                  {kpi.changeLabel}
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
