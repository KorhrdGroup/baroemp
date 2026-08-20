"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { EmploymentDestination, Occupation } from "@/types";

/** 관리자 시장 요구조건 분석(스펙 40번) 대상(직업/취업처) 선택기. */
export function CareerGapMarketSelector({
  occupations,
  destinationsByOccupationId,
  occupationId,
  destinationId,
}: {
  occupations: Occupation[];
  destinationsByOccupationId: Record<string, EmploymentDestination[]>;
  occupationId?: string;
  destinationId?: string;
}) {
  const router = useRouter();
  const destinations = useMemo(
    () => destinationsByOccupationId[occupationId ?? ""] ?? [],
    [destinationsByOccupationId, occupationId],
  );

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="w-56">
        <p className="mb-1 text-label-2 text-slate-500">직업</p>
        <Select
          value={occupationId ?? ""}
          onValueChange={(value) => router.push(`/admin/career-gap?occupationId=${value}`)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="직업 선택" />
          </SelectTrigger>
          <SelectContent>
            {occupations.map((o) => (
              <SelectItem key={o.id} value={o.id}>
                {o.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="w-56">
        <p className="mb-1 text-label-2 text-slate-500">취업처 (선택)</p>
        <Select
          value={destinationId ?? "__all__"}
          disabled={!occupationId}
          onValueChange={(value) =>
            router.push(
              `/admin/career-gap?occupationId=${occupationId}${value !== "__all__" ? `&destinationId=${value}` : ""}`,
            )
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="전체" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">전체 (직업 단위)</SelectItem>
            {destinations.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
