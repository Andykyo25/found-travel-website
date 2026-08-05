// Excel 等試算表會把這些開頭視為公式，即使 CSV 欄位已用雙引號包住。
// 在原值前加單引號，保留可讀內容，同時強制以純文字開啟。
const spreadsheetFormulaPrefix = /^[\u0000-\u0020]*[=+\-@]/;

export function escapeCsvCell(value: string) {
  const safeValue = spreadsheetFormulaPrefix.test(value) ? `'${value}` : value;
  return `"${safeValue.replace(/"/g, '""')}"`;
}
