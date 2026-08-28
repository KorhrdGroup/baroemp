import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser, isAdminRole } from "@/lib/auth/session";
import { buildWorkbook, contentDisposition } from "@/lib/export/workbook";
import { EXPORT_LABELS, buildExportSheets, isExportDomain } from "@/services/admin-export.service";

/** 기본 조회 기간. 화면에서 고르지 않고 들어와도 쓸 만한 파일이 나오게 한다. */
const DEFAULT_DAYS = 30;
const MAX_DAYS = 365;

function parseDays(raw: string | null): number {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_DAYS;
  return Math.min(Math.floor(parsed), MAX_DAYS);
}

/**
 * 관리자 엑셀 내보내기.
 *
 * 페이지가 아니라 Route Handler라 requireAdmin(리다이렉트)을 쓰지 않는다.
 * 다운로드가 실패했는지 로그인 화면 HTML이 xlsx로 저장됐는지 구분되게 상태코드로 답한다.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ domain: string }> }) {
  const { domain } = await params;
  if (!isExportDomain(domain)) {
    return NextResponse.json({ error: "지원하지 않는 내보내기 대상입니다." }, { status: 404 });
  }

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  if (!isAdminRole(user.role)) return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  const days = parseDays(request.nextUrl.searchParams.get("days"));

  try {
    const sheets = await buildExportSheets(domain, days);
    const buffer = await buildWorkbook(sheets);

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": contentDisposition(EXPORT_LABELS[domain], days),
        // 집계 결과라 캐시되면 오래된 파일을 받게 된다.
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "알 수 없는 오류";
    console.error("[admin-export] failed", { domain, days, message });
    return NextResponse.json({ error: `내보내기에 실패했습니다: ${message}` }, { status: 500 });
  }
}
