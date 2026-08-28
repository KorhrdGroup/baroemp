/**
 * 관리자 엑셀 내보내기 검증 스크립트.
 * 네 도메인이 실제 데이터로 시트를 만들고 파일이 열리는 크기로 나오는지 확인한다.
 *
 * 실행: npm run check:admin-export
 */
import { buildExportSheets, EXPORT_DOMAINS, EXPORT_LABELS } from "@/services/admin-export.service";
import { buildWorkbook } from "@/lib/export/workbook";

async function main() {
  for (const domain of EXPORT_DOMAINS) {
    const sheets = await buildExportSheets(domain, 30);
    const buffer = await buildWorkbook(sheets);
    const detail = sheets.map((s) => `${s.name}(${s.rows.length}행)`).join(" / ");
    console.log(`${EXPORT_LABELS[domain].padEnd(8)} ${(buffer.byteLength / 1024).toFixed(1)}KB  ${detail}`);
  }
}

main().catch((error) => {
  console.error("실패:", error);
  process.exit(1);
});
