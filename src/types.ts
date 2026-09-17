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

export interface FarmaDeliveryRecord {
  id: string;
  rawTimestamp: string;
  date: string; // YYYY-MM-DD
  day: number;
  month: number;
  year: number;
  faskes?: "RSUD BANJARNEGARA" | "RSI BANJARNEGARA" | string;
  patientName: string;
  address: string;
  kecamatan: string;
  courierName: string;
  paymentType: "COD" | "GRATIS" | "REGULER" | "VIP" | string;
  ongkir: number;
}

export interface FarmaExpenseRecord {
  id: string;
  rawTimestamp: string;
  date: string; // YYYY-MM-DD
  day: number;
  month: number;
  year: number;
  category: string; // KET e.g. "Incentive Hero", "BBM", "Operasional"
  description: string; // DESKRIPSI e.g. "Rama", "Yoga", "Perlengkapan"
  nominal: number; // NOMINAL e.g. 60000
}
