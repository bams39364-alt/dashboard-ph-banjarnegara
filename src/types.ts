export interface SheetFile {
  id: string;
  name: string;
  modifiedTime?: string;
  webViewLink?: string;
}

export interface SheetTab {
  sheetId: number;
  title: string;
  rowCount?: number;
  columnCount?: number;
}

export interface SheetData {
  spreadsheetId: string;
  spreadsheetTitle: string;
  sheets: SheetTab[];
  activeSheetTitle: string;
  headers: string[];
  rows: Record<string, any>[];
  rawValues: any[][];
}

export interface FilterState {
  year: string; // e.g. "2026" or "all"
  month: string; // e.g. "8" (1-12) or "all"
  wilayah: string; // e.g. "Jakarta" or "all"
}
