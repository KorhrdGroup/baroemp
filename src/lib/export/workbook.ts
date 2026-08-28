import "server-only";
import ExcelJS from "exceljs";

/**
 * 관리자 내보내기용 엑셀 생성기.
 *
 * 도메인별 데이터 수집과 파일 만들기를 갈라놓는다. 여기는 "시트를 어떻게 보이게 할지"만 알고,
 * 무엇을 담을지는 모른다. 도메인이 늘어도 이 파일은 그대로다.
 */

export interface SheetColumn<Row> {
  header: string;
  /** 열 너비(글자 수). 생략하면 헤더 길이에 맞춘다. */
  width?: number;
  value: (row: Row) => string | number | boolean | null;
}

export interface SheetSpec<Row = never> {
  name: string;
  columns: SheetColumn<Row>[];
  rows: Row[];
}

/** 헤더 줄. 굵게 깔고 고정해서 수천 행을 스크롤해도 무슨 열인지 보이게 한다. */
function styleHeader(sheet: ExcelJS.Worksheet): void {
  const header = sheet.getRow(1);
  header.font = { bold: true };
  header.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFEFF3FB" },
  };
  header.alignment = { vertical: "middle" };
  sheet.views = [{ state: "frozen", ySplit: 1 }];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- 시트마다 행 타입이 달라 한 배열에 담으려면 여기서만 느슨하게 받는다.
type AnySheetSpec = SheetSpec<any>;

function addSheet(workbook: ExcelJS.Workbook, spec: AnySheetSpec): void {
  // 시트 이름에 [ ] : * ? / \ 를 쓰면 엑셀이 파일을 못 연다. 라벨을 그대로 넘겨도 되게 여기서 턴다.
  const safeName = spec.name.replace(/[[\]:*?/\\]/g, " ").slice(0, 31);
  const sheet = workbook.addWorksheet(safeName);

  sheet.columns = spec.columns.map((column) => ({
    header: column.header,
    width: column.width ?? Math.max(column.header.length + 4, 10),
  }));
  styleHeader(sheet);

  if (spec.rows.length === 0) {
    // 빈 파일과 "받아지긴 했는데 내용이 없는 파일"은 구분돼야 한다.
    sheet.addRow([`해당 조건에 데이터가 없습니다.`]);
    return;
  }

  for (const row of spec.rows) {
    sheet.addRow(spec.columns.map((column) => column.value(row)));
  }
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: spec.columns.length },
  };
}

export async function buildWorkbook(sheets: AnySheetSpec[]): Promise<ArrayBuffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.created = new Date();
  for (const spec of sheets) addSheet(workbook, spec);
  // exceljs가 돌려주는 Buffer 타입은 Node의 Buffer와 겹치지 않는다.
  // 응답 본문에 그대로 실을 수 있는 ArrayBuffer로 받는다.
  return (await workbook.xlsx.writeBuffer()) as ArrayBuffer;
}

/**
 * 다운로드 파일명. 받는 쪽에서 여러 번 받아도 섞이지 않게 날짜와 기간을 붙인다.
 * 한글 파일명은 헤더에 그대로 못 넣으므로 RFC 5987 형식으로 함께 준다.
 */
export function contentDisposition(baseName: string, days: number): string {
  const stamp = new Date().toISOString().slice(0, 10);
  const name = `${baseName}_최근${days}일_${stamp}.xlsx`;
  return `attachment; filename="export_${stamp}.xlsx"; filename*=UTF-8''${encodeURIComponent(name)}`;
}
