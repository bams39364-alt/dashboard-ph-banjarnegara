import { FilterState } from "../types";

export const MONTH_NAMES_ID = [
  { value: "1", label: "Januari" },
  { value: "2", label: "Februari" },
  { value: "3", label: "Maret" },
  { value: "4", label: "April" },
  { value: "5", label: "Mei" },
  { value: "6", label: "Juni" },
  { value: "7", label: "Juli" },
  { value: "8", label: "Agustus" },
  { value: "9", label: "September" },
  { value: "10", label: "Oktober" },
  { value: "11", label: "November" },
  { value: "12", label: "Desember" },
];

/**
 * Finds column matching pattern
 */
export function findColumn(headers: string[], pattern: RegExp): string | undefined {
  return headers.find((h) => pattern.test(h.trim()));
}

/**
 * Find Wilayah / Region column (specifically recognizing Column G / WILAYAH header)
 */
export function findWilayahColumn(headers: string[]): string | undefined {
  // 1. Exact match for 'wilayah' or variations (case-insensitive & trimmed)
  const exactWilayah = headers.find((h) => {
    const clean = h.trim().toLowerCase().replace(/[\s\-_]+/g, "");
    return (
      clean === "wilayah" ||
      clean === "wilayahkerja" ||
      clean === "region" ||
      clean === "kota" ||
      clean === "cabang" ||
      clean === "area" ||
      clean === "tujuan" ||
      clean === "lokasi" ||
      clean === "hub"
    );
  });
  if (exactWilayah) return exactWilayah;

  // 2. Regex search
  const regexMatch =
    findColumn(
      headers,
      /^(wilayah|region|kota|city|area|cabang|branch|tujuan|destination|dest|provinsi|province|lokasi|zone|zona|asal|origin|hub|kabupaten|kecamatan)$/i
    ) ||
    headers.find((h) =>
      /wilayah|region|kota|city|area|cabang|branch|tujuan|destination|provinsi|lokasi|zona|asal|hub/i.test(
        h.trim()
      )
    );
  if (regexMatch) return regexMatch;

  // 3. Fallback: Check if 7th column (Column G, index 6) has a non-numeric text title
  if (
    headers.length >= 7 &&
    headers[6] &&
    !/tanggal|date|tgl|nominal|rp|jumlah|total|amount|harga|biaya/i.test(headers[6])
  ) {
    return headers[6];
  }

  return undefined;
}

/**
 * Find Date column (specifically prioritizing assign_lastmile_date_asjlm)
 */
export function findDateColumn(headers: string[]): string | undefined {
  // 1. Direct match for assign_lastmile_date_asjlm and its variants
  const exactLmDate = headers.find((h) => {
    const clean = h.trim().toLowerCase().replace(/[\s\-_]+/g, "_");
    return (
      clean === "assign_lastmile_date_asjlm" ||
      clean === "assign_lastmile_date" ||
      clean === "assign_lastmiledatap_asjlm" ||
      clean === "assign_date_asjlm" ||
      clean === "lastmile_date" ||
      clean === "assign_lastmile" ||
      clean === "assign_date" ||
      clean === "tgl_assign_lastmile" ||
      clean === "tanggal_assign_lastmile"
    );
  });
  if (exactLmDate) return exactLmDate;

  // 2. Partial match for headers containing assign + lastmile + date
  const partialLmDate = headers.find((h) => {
    const lower = h.trim().toLowerCase();
    return (
      (lower.includes("assign") && lower.includes("lastmile")) ||
      (lower.includes("assign") && lower.includes("date")) ||
      (lower.includes("lastmile") && lower.includes("date"))
    );
  });
  if (partialLmDate) return partialLmDate;

  // 3. Standard general date columns
  return (
    findColumn(
      headers,
      /^(assign_lastmile_date_asjlm|assign_lastmile_date|assign_date|lastmile_date|tanggal|date|tgl|tgl_kirim|tgl_order|tgl_pengiriman|shipment_date|order_date|created_at|waktu|tgl_transaksi|tgl_trans|hari_tanggal|hari\/tanggal|periode|tgl_do|pickup_date|delivery_date)$/i
    ) ||
    headers.find((h) =>
      /assign.*lastmile|assign.*date|tanggal|date|tgl|shipment|order_date|waktu|transaksi|pickup|delivery/i.test(
        h.trim()
      )
    )
  );
}

/**
 * Find Revenue / Amount column (prioritizing total_payment)
 */
export function findRevenueColumn(headers: string[]): string | undefined {
  return (
    findColumn(
      headers,
      /^(total_payment|total payment|totalpayment)$/i
    ) ||
    headers.find((h) =>
      /total_payment|total payment|totalpayment/i.test(h.trim())
    ) ||
    findColumn(
      headers,
      /^(revenue|omset|omzet|total_revenue|total|amount|harga|nominal|tagihan|pendapatan|grand_total|biaya_kirim|ongkir|tarif|total_biaya|biaya|nilai|sales|pembayaran)$/i
    ) ||
    headers.find((h) =>
      /revenue|omset|omzet|amount|nominal|harga|tagihan|pendapatan|ongkir|tarif/i.test(
        h.trim()
      )
    )
  );
}

/**
 * Find COP / Fix Cost Column (prioritizing fix_cost_list_cop)
 */
export function findCOPColumn(headers: string[]): string | undefined {
  return (
    findColumn(
      headers,
      /^(fix_cost_list_cop|fix_cost_cop|fix_cost_list|fixcostlistcop|fix_cost|cost_list_cop|list_cop|cop)$/i
    ) ||
    headers.find((h) =>
      /fix_cost_list_cop|fix_cost_cop|cost_list_cop|fixcost/i.test(h.trim())
    ) ||
    findCustomerTypeColumn(headers)
  );
}

/**
 * Find Customer Type column
 */
export function findCustomerTypeColumn(headers: string[]): string | undefined {
  return (
    findColumn(
      headers,
      /^(customer_type|tipe_customer|jenis_customer|cust_type|tipe_pelanggan|jenis_pelanggan|type_customer|tipe|segment|segmen|customer_category|kategori_customer)$/i
    ) ||
    headers.find((h) =>
      /customer_type|tipe_customer|cust_type|tipe_pelanggan|tipe_cust/i.test(h.trim())
    )
  );
}

/**
 * Find Service / Layanan column
 */
export function findServiceColumn(headers: string[]): string | undefined {
  return (
    findColumn(
      headers,
      /^(service|layanan|jenis_layanan|tipe_layanan|nama_layanan|jenis_service|service_type|tipe_service|paket|paket_layanan|produk|product_type|delivery_type|jenis_pengiriman)$/i
    ) ||
    headers.find((h) =>
      /^(service|layanan|paket)/i.test(h.trim())
    ) ||
    headers.find((h) =>
      /service|layanan|delivery_type/i.test(h.trim())
    )
  );
}

export function findYearColumn(headers: string[]): string | undefined {
  return (
    findColumn(headers, /^(tahun|year|thn|yr|th)$/i) ||
    headers.find((h) => /^(tahun|year|thn)/i.test(h.trim())) ||
    headers.find((h) => /tahun|year|thn/i.test(h.trim()) && !/hari|tgl|date|day/i.test(h.trim()))
  );
}

export function findMonthColumn(headers: string[]): string | undefined {
  return (
    findColumn(headers, /^(bulan|month|bln|mo|periode_bulan)$/i) ||
    headers.find((h) => /^(bulan|month|bln)/i.test(h.trim())) ||
    headers.find((h) => /bulan|month|bln/i.test(h.trim()) && !/hari|tgl|date|day/i.test(h.trim()))
  );
}

/**
 * Parse numeric month (1-12) from string, number, or serial date
 */
export function parseMonthNumber(val: any): number | null {
  if (val === null || val === undefined) return null;
  
  // 1. Direct number (1-12)
  if (typeof val === "number" && !isNaN(val)) {
    if (val >= 1 && val <= 12) return Math.round(val);
    // Excel serial date (e.g. 45000)
    if (val >= 30000 && val <= 70000) {
      const d = new Date(Math.round((val - 25569) * 86400 * 1000));
      if (!isNaN(d.getTime())) return d.getUTCMonth() + 1;
    }
  }

  const s = String(val).trim().toLowerCase();
  if (!s || s === "-" || s === "n/a" || s === "null") return null;

  // 2. Numeric string "1".."12" or "01".."12"
  const numMatch = s.match(/^\s*0?([1-9]|1[0-2])\s*$/);
  if (numMatch) {
    return parseInt(numMatch[1], 10);
  }

  // 3. String containing serial number e.g. "45474"
  if (/^\d{5}(\.\d+)?$/.test(s)) {
    const num = parseFloat(s);
    if (num >= 30000 && num <= 70000) {
      const d = new Date(Math.round((num - 25569) * 86400 * 1000));
      if (!isNaN(d.getTime())) return d.getUTCMonth() + 1;
    }
  }

  // 4. Check for month names (Indonesian / English) anywhere in string
  const monthKeywords: [RegExp, number][] = [
    [/\b(jan|januari|january)\b/i, 1],
    [/\b(feb|februari|february)\b/i, 2],
    [/\b(mar|maret|march)\b/i, 3],
    [/\b(apr|april)\b/i, 4],
    [/\b(mei|may)\b/i, 5],
    [/\b(jun|juni|june)\b/i, 6],
    [/\b(jul|juli|july)\b/i, 7],
    [/\b(agu|agt|agustus|aug|august)\b/i, 8],
    [/\b(sep|sept|september)\b/i, 9],
    [/\b(okt|oct|oktober|october)\b/i, 10],
    [/\b(nov|november)\b/i, 11],
    [/\b(des|dec|desember|december)\b/i, 12],
  ];

  for (const [regex, mNum] of monthKeywords) {
    if (regex.test(s)) {
      return mNum;
    }
  }

  // 5. Check if string starts with month name prefix (e.g. "jul", "jun", "juli", "juni")
  const prefixMap: Record<string, number> = {
    juli: 7,
    july: 7,
    jul: 7,
    juni: 6,
    june: 6,
    jun: 6,
    jan: 1,
    feb: 2,
    mar: 3,
    apr: 4,
    mei: 5,
    may: 5,
    agu: 8,
    agt: 8,
    aug: 8,
    sep: 9,
    okt: 10,
    oct: 10,
    nov: 11,
    des: 12,
    dec: 12,
  };

  for (const [prefix, mNum] of Object.entries(prefixMap)) {
    if (s.startsWith(prefix) || s.includes(prefix)) {
      return mNum;
    }
  }

  // 6. Formats like "07/2024", "2024-07", "06/2024", "7-2024"
  const ymMatch = s.match(/(?:^|\D)(\d{1,2})[-/](\d{4})(?:\D|$)/);
  if (ymMatch) {
    const m = parseInt(ymMatch[1], 10);
    if (m >= 1 && m <= 12) return m;
  }
  const myMatch = s.match(/(?:^|\D)(\d{4})[-/](\d{1,2})(?:\D|$)/);
  if (myMatch) {
    const m = parseInt(myMatch[2], 10);
    if (m >= 1 && m <= 12) return m;
  }

  return null;
}

/**
 * Parse date from a single cell value into { year, month, day, dateKey }
 */
export function parseDateCell(
  val: any
): { year: number; month: number; day: number; dateKey: string } | null {
  if (val === null || val === undefined || val === "") return null;

  // 1. JS Date instance
  if (val instanceof Date && !isNaN(val.getTime())) {
    const y = val.getFullYear();
    const m = val.getMonth() + 1;
    const d = val.getDate();
    return {
      year: y,
      month: m,
      day: d,
      dateKey: `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
    };
  }

  // 2. Numeric: Excel serial date (e.g. 45474) or Unix timestamp
  if (typeof val === "number" && !isNaN(val)) {
    if (val >= 30000 && val <= 70000) {
      // Excel serial date format
      const date = new Date(Math.round((val - 25569) * 86400 * 1000));
      if (!isNaN(date.getTime())) {
        const y = date.getUTCFullYear();
        const m = date.getUTCMonth() + 1;
        const d = date.getUTCDate();
        return {
          year: y,
          month: m,
          day: d,
          dateKey: `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
        };
      }
    } else if (val > 1000000000) {
      // Unix timestamp
      const date = new Date(val > 10000000000 ? val : val * 1000);
      if (!isNaN(date.getTime())) {
        const y = date.getFullYear();
        const m = date.getMonth() + 1;
        const d = date.getDate();
        return {
          year: y,
          month: m,
          day: d,
          dateKey: `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
        };
      }
    }
  }

  // 3. String date parsing
  if (typeof val === "string") {
    const str = val.trim();
    if (!str || str === "-" || str === "N/A" || str === "null") return null;

    // Excel serial date as string e.g. "45474"
    if (/^\d{5}(\.\d+)?$/.test(str)) {
      const num = parseFloat(str);
      if (num >= 30000 && num <= 70000) {
        const date = new Date(Math.round((num - 25569) * 86400 * 1000));
        if (!isNaN(date.getTime())) {
          const y = date.getUTCFullYear();
          const m = date.getUTCMonth() + 1;
          const d = date.getUTCDate();
          return {
            year: y,
            month: m,
            day: d,
            dateKey: `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
          };
        }
      }
    }

    // GViz format: Date(2024, 6, 21) -> Note that month is 0-indexed in GViz
    const gvizMatch = str.match(/^Date\((\d{4}),\s*(\d{1,2}),\s*(\d{1,2})/i);
    if (gvizMatch) {
      const y = parseInt(gvizMatch[1], 10);
      const m = parseInt(gvizMatch[2], 10) + 1; // 0-indexed to 1-indexed
      const d = parseInt(gvizMatch[3], 10);
      return {
        year: y,
        month: m,
        day: d,
        dateKey: `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
      };
    }

    // ISO: YYYY-MM-DD or YYYY/MM/DD or YYYY.MM.DD
    const isoMatch = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
    if (isoMatch) {
      const y = parseInt(isoMatch[1], 10);
      const m = parseInt(isoMatch[2], 10);
      const d = parseInt(isoMatch[3], 10);
      if (y >= 1990 && y <= 2100 && m >= 1 && m <= 12) {
        return {
          year: y,
          month: m,
          day: d,
          dateKey: `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
        };
      }
    }

    // Indonesian / British format: DD-MM-YYYY or DD/MM/YYYY or DD.MM.YYYY
    const dmyMatch = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
    if (dmyMatch) {
      const part1 = parseInt(dmyMatch[1], 10);
      const part2 = parseInt(dmyMatch[2], 10);
      const y = parseInt(dmyMatch[3], 10);

      let d = part1;
      let m = part2;

      // If part2 > 12 and part1 <= 12, it's US format (MM/DD/YYYY)
      if (part2 > 12 && part1 <= 12) {
        m = part1;
        d = part2;
      }

      if (y >= 1990 && y <= 2100 && m >= 1 && m <= 12) {
        return {
          year: y,
          month: m,
          day: d,
          dateKey: `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
        };
      }
    }

    // 2-Digit Year: DD/MM/YY or DD-MM-YY (e.g. 21/07/24)
    const shortYearMatch = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2})$/);
    if (shortYearMatch) {
      const d = parseInt(shortYearMatch[1], 10);
      const m = parseInt(shortYearMatch[2], 10);
      const rawY = parseInt(shortYearMatch[3], 10);
      const y = rawY < 70 ? 2000 + rawY : 1900 + rawY;

      if (m >= 1 && m <= 12) {
        return {
          year: y,
          month: m,
          day: d,
          dateKey: `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
        };
      }
    }

    // Check textual date e.g. "21 Juli 2024", "21-Jul-2024", "15 Juni 2024", "Juli 2024", "Juni 2024"
    const yearSearch = str.match(/\b(19\d{2}|20\d{2})\b/);
    const mNum = parseMonthNumber(str);
    if (yearSearch && mNum !== null) {
      const y = parseInt(yearSearch[1], 10);
      const dayMatch = str.match(/\b([0-2]?\d|3[01])\b/);
      const d = dayMatch ? parseInt(dayMatch[1], 10) : 1;
      return {
        year: y,
        month: mNum,
        day: d,
        dateKey: `${y}-${String(mNum).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
      };
    }

    // Month-Year only: MM/YYYY or MM-YYYY e.g. "07/2024" or "06/2024"
    const myOnlyMatch = str.match(/^(\d{1,2})[-/](\d{4})$/);
    if (myOnlyMatch) {
      const m = parseInt(myOnlyMatch[1], 10);
      const y = parseInt(myOnlyMatch[2], 10);
      if (m >= 1 && m <= 12 && y >= 1990 && y <= 2100) {
        return {
          year: y,
          month: m,
          day: 1,
          dateKey: `${y}-${String(m).padStart(2, "0")}-01`,
        };
      }
    }

    // YYYY-MM only
    const ymOnlyMatch = str.match(/^(\d{4})[-/](\d{1,2})$/);
    if (ymOnlyMatch) {
      const y = parseInt(ymOnlyMatch[1], 10);
      const m = parseInt(ymOnlyMatch[2], 10);
      if (m >= 1 && m <= 12 && y >= 1990 && y <= 2100) {
        return {
          year: y,
          month: m,
          day: 1,
          dateKey: `${y}-${String(m).padStart(2, "0")}-01`,
        };
      }
    }

    // Standard fallback parse
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
      const y = parsed.getFullYear();
      const m = parsed.getMonth() + 1;
      const d = parsed.getDate();
      if (y >= 1990 && y <= 2100) {
        return {
          year: y,
          month: m,
          day: d,
          dateKey: `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
        };
      }
    }
  }

  return null;
}

/**
 * Parse date and month from a row
 */
export function extractRowDateInfo(
  row: Record<string, any>,
  headers: string[]
): { year: number | null; month: number | null; day: number | null; dateKey: string | null } {
  // 1. Check primary date column first (especially assign_lastmile_date_asjlm or tanggal/date)
  const dateCol = findDateColumn(headers);
  if (dateCol && row[dateCol] !== undefined && row[dateCol] !== null && String(row[dateCol]).trim() !== "") {
    const parsed = parseDateCell(row[dateCol]);
    if (parsed) {
      return {
        year: parsed.year,
        month: parsed.month,
        day: parsed.day,
        dateKey: parsed.dateKey,
      };
    }
  }

  // 2. Check if separate year and month columns exist
  const yearCol = findYearColumn(headers);
  const monthCol = findMonthColumn(headers);

  let detectedYear: number | null = null;
  let detectedMonth: number | null = null;
  let detectedDay: number = 1;

  if (monthCol && row[monthCol] !== undefined && row[monthCol] !== null && String(row[monthCol]).trim() !== "") {
    detectedMonth = parseMonthNumber(row[monthCol]);
  }

  if (yearCol && row[yearCol] !== undefined && row[yearCol] !== null && String(row[yearCol]).trim() !== "") {
    let rawY = parseInt(String(row[yearCol]).replace(/[^0-9]/g, ""), 10);
    if (!isNaN(rawY)) {
      if (rawY < 70) rawY += 2000;
      else if (rawY < 100) rawY += 1900;
      detectedYear = rawY;
    }
  }

  // Day column check
  const dayCol = findColumn(headers, /^(hari|day|tgl|tanggal|d)$/i);
  if (dayCol && row[dayCol] !== undefined && row[dayCol] !== null) {
    const rawD = parseInt(String(row[dayCol]).replace(/[^0-9]/g, ""), 10);
    if (!isNaN(rawD) && rawD >= 1 && rawD <= 31) {
      detectedDay = rawD;
    }
  }

  // If both month and year were extracted from dedicated columns
  if (detectedMonth !== null && detectedYear !== null) {
    return {
      year: detectedYear,
      month: detectedMonth,
      day: detectedDay,
      dateKey: `${detectedYear}-${String(detectedMonth).padStart(2, "0")}-${String(detectedDay).padStart(2, "0")}`,
    };
  }

  // 3. Fallback: Scan every column in row to find any valid date value
  for (const header of headers) {
    const val = row[header];
    if (val !== undefined && val !== null && val !== "") {
      const parsed = parseDateCell(val);
      if (parsed) {
        return {
          year: detectedYear !== null ? detectedYear : parsed.year,
          month: detectedMonth !== null ? detectedMonth : parsed.month,
          day: parsed.day,
          dateKey: parsed.dateKey,
        };
      }
    }
  }

  // If only month or year was found
  if (detectedMonth !== null || detectedYear !== null) {
    return {
      year: detectedYear,
      month: detectedMonth,
      day: detectedDay,
      dateKey:
        detectedYear && detectedMonth
          ? `${detectedYear}-${String(detectedMonth).padStart(2, "0")}-${String(detectedDay).padStart(2, "0")}`
          : null,
    };
  }

  return { year: null, month: null, day: null, dateKey: null };
}

/**
 * Filter rows by Year, Month, and Wilayah
 */
export function filterRows(
  rows: Record<string, any>[],
  headers: string[],
  filters: FilterState
): Record<string, any>[] {
  const wilayahCol = findWilayahColumn(headers);

  return rows.filter((row) => {
    // 1. Wilayah filter
    if (filters.wilayah && filters.wilayah !== "all") {
      const targetW = filters.wilayah.trim().toLowerCase();
      let rowWilayah = "";

      if (wilayahCol && row[wilayahCol] !== undefined && row[wilayahCol] !== null) {
        rowWilayah = String(row[wilayahCol]).trim();
      } else {
        // Search in keys containing wilayah
        for (const k of Object.keys(row)) {
          if (/wilayah|region|area|cabang|kota|lokasi|tujuan/i.test(k)) {
            const val = String(row[k] || "").trim();
            if (val && val !== "-" && val !== "null") {
              rowWilayah = val;
              break;
            }
          }
        }
        // Fallback: 7th column (Column G, index 6)
        if (!rowWilayah && headers.length >= 7 && row[headers[6]] !== undefined && row[headers[6]] !== null) {
          const val = String(row[headers[6]]).trim();
          if (val && val !== "-" && val !== "null") {
            rowWilayah = val;
          }
        }
        // Fallback search across all values
        if (!rowWilayah) {
          const match = Object.values(row).find(
            (v) => String(v).trim().toLowerCase() === targetW
          );
          if (match) {
            rowWilayah = String(match).trim();
          }
        }
      }

      const rowWLower = rowWilayah.toLowerCase().trim();
      if (
        rowWLower !== targetW &&
        !rowWLower.includes(targetW) &&
        !targetW.includes(rowWLower)
      ) {
        return false;
      }
    }

    // 2. Year & Month filter
    if (filters.year !== "all" || filters.month !== "all") {
      const dateInfo = extractRowDateInfo(row, headers);

      // Filter by Year
      if (filters.year !== "all") {
        if (dateInfo.year === null || String(dateInfo.year) !== String(filters.year)) {
          return false;
        }
      }

      // Filter by Month
      if (filters.month !== "all") {
        if (dateInfo.month === null || String(dateInfo.month) !== String(filters.month)) {
          return false;
        }
      }
    }

    return true;
  });
}

/**
 * Extract available filter options from the dataset
 */
export function getAvailableFilterOptions(
  rows: Record<string, any>[],
  headers: string[],
  extraRows: Record<string, any>[] = [],
  extraHeaders: string[] = []
): {
  years: string[];
  months: { value: string; label: string }[];
  wilayahList: string[];
} {
  const yearsSet = new Set<string>();
  const monthsSet = new Set<string>();
  const wilayahSet = new Set<string>();

  const processRows = (rList: Record<string, any>[], hList: string[]) => {
    const wilayahCol = findWilayahColumn(hList);

    rList.forEach((row) => {
      // 1. Wilayah options
      let wVal = "";
      if (wilayahCol && row[wilayahCol] !== undefined && row[wilayahCol] !== null) {
        wVal = String(row[wilayahCol]).trim();
      } else {
        // If no designated wilayah column, check headers with region/city/area keywords
        for (const h of hList) {
          if (/wilayah|region|kota|area|cabang|tujuan|provinsi|lokasi|hub/i.test(h)) {
            const val = String(row[h] || "").trim();
            if (val && val !== "-" && val !== "null" && val !== "undefined") {
              wVal = val;
              break;
            }
          }
        }
        // Check 7th column (Column G, index 6)
        if (!wVal && hList.length >= 7 && row[hList[6]] !== undefined && row[hList[6]] !== null) {
          const val = String(row[hList[6]]).trim();
          if (val && val !== "-" && val !== "null" && val !== "undefined") {
            wVal = val;
          }
        }
      }

      if (wVal && wVal !== "" && wVal !== "-" && wVal !== "null" && wVal !== "undefined") {
        wilayahSet.add(wVal);
      }

      // 2. Date options
      const dateInfo = extractRowDateInfo(row, hList);
      if (dateInfo.year !== null) {
        yearsSet.add(String(dateInfo.year));
      }
      if (dateInfo.month !== null) {
        monthsSet.add(String(dateInfo.month));
      }
    });
  };

  processRows(rows, headers);
  if (extraRows.length > 0) {
    processRows(extraRows, extraHeaders.length > 0 ? extraHeaders : headers);
  }

  // If no years detected from data at all, add current year as fallback
  if (yearsSet.size === 0) {
    yearsSet.add(String(new Date().getFullYear()));
  }

  const sortedYears = Array.from(yearsSet).sort((a, b) => parseInt(b, 10) - parseInt(a, 10));
  const sortedWilayah = Array.from(wilayahSet).sort((a, b) => a.localeCompare(b, "id"));

  return {
    years: sortedYears,
    months: MONTH_NAMES_ID,
    wilayahList: sortedWilayah,
  };
}

/**
 * Parse numeric revenue value safely
 */
export function parseNumericValue(val: any): number {
  if (val === null || val === undefined || val === "") return 0;
  if (typeof val === "number") return isNaN(val) ? 0 : val;
  if (typeof val === "string") {
    let s = val.trim();
    // Remove Currency prefix like Rp, IDR, $, etc.
    s = s.replace(/^(rp\.?|idr|\$)\s*/i, "").trim();

    // Check if format is Indonesian (1.500.000,50) vs US (1,500,000.50)
    if (s.includes(".") && s.includes(",")) {
      if (s.lastIndexOf(",") > s.lastIndexOf(".")) {
        // 1.500.000,50 -> remove dots, replace comma with dot
        s = s.replace(/\./g, "").replace(",", ".");
      } else {
        // 1,500,000.50 -> remove commas
        s = s.replace(/,/g, "");
      }
    } else if (s.includes(".")) {
      const parts = s.split(".");
      if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3)) {
        s = s.replace(/\./g, "");
      }
    } else if (s.includes(",")) {
      const parts = s.split(",");
      if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3)) {
        s = s.replace(/,/g, "");
      } else {
        s = s.replace(",", ".");
      }
    }

    const clean = s.replace(/[^0-9.-]+/g, "");
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
  }
  return 0;
}

/**
 * Calculate the effective total payment / revenue for a single row.
 * Rule: If customer_type contains 'MULTIPLE', effective payment = total_payment + fix_cost_list_cop.
 * Otherwise, effective payment = total_payment.
 */
export function getRowTotalPayment(
  row: Record<string, any>,
  headers: string[],
  revenueCol?: string,
  copCol?: string,
  custTypeCol?: string
): number {
  const revHeader = revenueCol || findRevenueColumn(headers);
  const copHeader = copCol || findCOPColumn(headers);
  const custHeader = custTypeCol || findCustomerTypeColumn(headers);

  // 1. Base total payment
  let basePayment = 0;
  if (revHeader && row[revHeader] !== undefined && row[revHeader] !== null) {
    basePayment = parseNumericValue(row[revHeader]);
  } else {
    for (const h of headers) {
      if (/total_payment|total payment|revenue|omset|amount|total|nominal|harga|tarif/i.test(h)) {
        basePayment = parseNumericValue(row[h]);
        if (basePayment > 0) break;
      }
    }
  }

  // 2. Check if customer_type contains MULTIPLE
  let isMultiple = false;
  if (custHeader && row[custHeader] !== undefined && row[custHeader] !== null) {
    const ct = String(row[custHeader]).trim().toUpperCase();
    if (ct === "MULTIPLE" || ct.includes("MULTIPLE")) {
      isMultiple = true;
    }
  } else {
    for (const val of Object.values(row)) {
      const s = String(val).trim().toUpperCase();
      if (s === "MULTIPLE" || s.includes("MULTIPLE")) {
        isMultiple = true;
        break;
      }
    }
  }

  // If MULTIPLE, add fix_cost_list_cop to total_payment
  if (isMultiple) {
    let copVal = 0;
    if (copHeader && row[copHeader] !== undefined && row[copHeader] !== null) {
      copVal = parseNumericValue(row[copHeader]);
    } else {
      for (const h of headers) {
        if (/fix_cost_list_cop|fix_cost_cop|cost_list_cop|fixcost/i.test(h)) {
          copVal = parseNumericValue(row[h]);
          if (copVal > 0) break;
        }
      }
    }
    return basePayment + copVal;
  }

  return basePayment;
}

/**
 * Calculate KPI summary based on filtered rows
 */
export function calculateFilteredMetrics(
  rows: Record<string, any>[],
  headers: string[]
): {
  totalPengiriman: number;
  totalRevenue: number;
  totalCOPRevenue: number;
  totalCOPPengiriman: number;
  avgRevenuePerHari: number;
  activeDaysCount: number;
  customerTypeCol?: string;
  copCol?: string;
  revenueCol?: string;
  wilayahCol?: string;
} {
  const revenueCol = findRevenueColumn(headers);
  const copCol = findCOPColumn(headers);
  const custTypeCol = findCustomerTypeColumn(headers);
  const wilayahCol = findWilayahColumn(headers);

  const totalPengiriman = rows.length;
  let totalRevenue = 0;
  let totalCOPRevenue = 0;
  let totalCOPPengiriman = 0;
  const uniqueDates = new Set<string>();

  rows.forEach((row) => {
    // 1. Total Revenue: calculated strictly from total_payment (plus fix_cost_list_cop if customer_type == MULTIPLE)
    const rowRev = getRowTotalPayment(row, headers, revenueCol, copCol, custTypeCol);
    totalRevenue += rowRev;

    // 2. COP Calculation: calculated specifically from fix_cost_list_cop header
    let isCOP = false;
    let copValue = 0;

    if (copCol && row[copCol] !== undefined && row[copCol] !== null && row[copCol] !== "") {
      const rawCOP = row[copCol];
      const parsedCOP = parseNumericValue(rawCOP);
      if (parsedCOP > 0) {
        isCOP = true;
        copValue = parsedCOP;
      } else {
        const sVal = String(rawCOP).trim().toUpperCase();
        if (sVal === "COP" || sVal.includes("COP") || sVal === "TRUE" || sVal === "1" || sVal === "YES" || sVal === "YA") {
          isCOP = true;
          copValue = rowRev;
        }
      }
    } else if (custTypeCol && row[custTypeCol] !== undefined) {
      const cType = String(row[custTypeCol]).trim().toUpperCase();
      if (cType === "COP" || cType.includes("COP") || cType === "C.O.P") {
        isCOP = true;
        copValue = rowRev;
      }
    }

    if (isCOP) {
      totalCOPRevenue += copValue;
      totalCOPPengiriman += 1;
    }

    // Track active days
    const dateInfo = extractRowDateInfo(row, headers);
    if (dateInfo.dateKey) {
      uniqueDates.add(dateInfo.dateKey);
    }
  });

  const activeDaysCount = uniqueDates.size > 0 ? uniqueDates.size : 1;
  const avgRevenuePerHari = totalPengiriman > 0 ? totalRevenue / activeDaysCount : 0;

  return {
    totalPengiriman,
    totalRevenue,
    totalCOPRevenue,
    totalCOPPengiriman,
    avgRevenuePerHari,
    activeDaysCount: uniqueDates.size,
    customerTypeCol: custTypeCol,
    copCol,
    revenueCol,
    wilayahCol,
  };
}

export function formatIDR(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Find LM (Last Mile) / Volume column in headers
 */
export function findLmColumn(headers: string[]): string | undefined {
  return (
    findColumn(
      headers,
      /^(total_lm|total lm|totallm|lm|jumlah_lm|jumlah lm|vol_lm|volume_lm|volume lm|last_mile|lastmile|total_delivery|total_kirim|total_paket|total_resi|qty_lm|qty|quantity|volume)$/i
    ) ||
    headers.find((h) =>
      /^(total_lm|total lm|totallm|lm|jumlah_lm|last_mile|lastmile)/i.test(h.trim())
    ) ||
    headers.find((h) =>
      /\b(lm|last_mile|lastmile)\b/i.test(h.trim()) && !/film|helm|claim/i.test(h.trim())
    ) ||
    findColumn(headers, /^(total|jumlah|qty)$/i)
  );
}

export interface DailyLmRecord {
  dateKey: string; // e.g. "2024-07-01"
  day: number;
  month: number;
  year: number;
  formattedDate: string; // e.g. "01 Jul 2024"
  fullFormattedDate: string; // e.g. "Senin, 01 Juli 2024"
  shortDate: string; // e.g. "01/07"
  dayName: string; // e.g. "Senin"
  totalLm: number;
  totalRecords: number;
  wilayahBreakdown: Record<string, number>;
  topWilayah: string;
  percentageOfTotal: number;
}

export interface LmDailyStats {
  grandTotalLm: number;
  totalRecords: number;
  activeDaysCount: number;
  avgLmPerDay: number;
  peakDay: { dateKey: string; formattedDate: string; totalLm: number } | null;
  lowestDay: { dateKey: string; formattedDate: string; totalLm: number } | null;
  dailyData: DailyLmRecord[];
  wilayahSummary: { wilayah: string; totalLm: number; percentage: number }[];
  dateColumnName: string | null;
  lmColumnName: string | null;
}

const INDO_DAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const INDO_MONTHS_SHORT = [
  "",
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];
const INDO_MONTHS_FULL = [
  "",
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

/**
 * Extract and aggregate LM (Last Mile) data by date (Count of rows / entries per date)
 */
export function extractLmDailyStats(
  rows: Record<string, any>[],
  headers: string[],
  filters?: FilterState
): LmDailyStats {
  const filteredRows = filters ? filterRows(rows, headers, filters) : rows;
  const dateCol = findDateColumn(headers);
  const wilayahCol = findWilayahColumn(headers);

  const dateMap = new Map<
    string,
    {
      dateKey: string;
      day: number;
      month: number;
      year: number;
      totalLm: number;
      totalRecords: number;
      wilayahMap: Record<string, number>;
    }
  >();

  const overallWilayahMap: Record<string, number> = {};
  let grandTotalLm = 0;
  let totalRecords = 0;

  filteredRows.forEach((row) => {
    // Ignore completely empty rows
    const hasValues = Object.values(row).some(
      (v) => v !== null && v !== undefined && String(v).trim() !== ""
    );
    if (!hasValues) return;

    const dateInfo = extractRowDateInfo(row, headers);
    
    // As per requirement: count number of data/records (COUNT = 1 per row)
    const rowLmValue = 1;

    // Determine Wilayah
    let wilayahName = "Lainnya";
    if (wilayahCol && row[wilayahCol] !== undefined && row[wilayahCol] !== null && String(row[wilayahCol]).trim() !== "") {
      wilayahName = String(row[wilayahCol]).trim();
    }

    // Determine Key
    let dKey = dateInfo.dateKey;
    let day = dateInfo.day || 1;
    let month = dateInfo.month || 1;
    let year = dateInfo.year || new Date().getFullYear();

    if (!dKey) {
      if (dateInfo.year && dateInfo.month) {
        dKey = `${dateInfo.year}-${String(dateInfo.month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      } else {
        dKey = `TGL-${String(day).padStart(2, "0")}`;
      }
    }

    grandTotalLm += rowLmValue;
    totalRecords += 1;

    overallWilayahMap[wilayahName] = (overallWilayahMap[wilayahName] || 0) + rowLmValue;

    if (!dateMap.has(dKey)) {
      dateMap.set(dKey, {
        dateKey: dKey,
        day,
        month,
        year,
        totalLm: 0,
        totalRecords: 0,
        wilayahMap: {},
      });
    }

    const entry = dateMap.get(dKey)!;
    entry.totalLm += rowLmValue;
    entry.totalRecords += 1;
    entry.wilayahMap[wilayahName] = (entry.wilayahMap[wilayahName] || 0) + rowLmValue;
  });

  // Convert map to sorted daily records
  const rawDailyList = Array.from(dateMap.values());

  // Sort chronologically by dateKey
  rawDailyList.sort((a, b) => a.dateKey.localeCompare(b.dateKey));

  let peakDay: { dateKey: string; formattedDate: string; totalLm: number } | null = null;
  let lowestDay: { dateKey: string; formattedDate: string; totalLm: number } | null = null;

  const dailyData: DailyLmRecord[] = rawDailyList.map((item) => {
    // Format date string
    let formattedDate = `${String(item.day).padStart(2, "0")} ${INDO_MONTHS_SHORT[item.month] || ""} ${item.year}`;
    let fullFormattedDate = formattedDate;
    let dayName = "";

    try {
      const dt = new Date(item.year, item.month - 1, item.day);
      if (!isNaN(dt.getTime())) {
        const dIdx = dt.getDay();
        dayName = INDO_DAYS[dIdx] || "";
        fullFormattedDate = `${dayName}, ${String(item.day).padStart(2, "0")} ${INDO_MONTHS_FULL[item.month] || ""} ${item.year}`;
      }
    } catch {
      // fallback
    }

    // Top Wilayah for this day
    let topWilayah = "-";
    let maxWilayahVal = 0;
    Object.entries(item.wilayahMap).forEach(([w, val]) => {
      if (val > maxWilayahVal) {
        maxWilayahVal = val;
        topWilayah = w;
      }
    });

    const percentageOfTotal = grandTotalLm > 0 ? (item.totalLm / grandTotalLm) * 100 : 0;

    // Track peak and lowest day
    if (!peakDay || item.totalLm > peakDay.totalLm) {
      peakDay = {
        dateKey: item.dateKey,
        formattedDate,
        totalLm: item.totalLm,
      };
    }
    if (!lowestDay || item.totalLm < lowestDay.totalLm) {
      lowestDay = {
        dateKey: item.dateKey,
        formattedDate,
        totalLm: item.totalLm,
      };
    }

    return {
      dateKey: item.dateKey,
      day: item.day,
      month: item.month,
      year: item.year,
      formattedDate,
      fullFormattedDate,
      shortDate: `${String(item.day).padStart(2, "0")}/${String(item.month).padStart(2, "0")}`,
      dayName,
      totalLm: item.totalLm,
      totalRecords: item.totalRecords,
      wilayahBreakdown: item.wilayahMap,
      topWilayah,
      percentageOfTotal,
    };
  });

  const activeDaysCount = dailyData.length;
  const avgLmPerDay = activeDaysCount > 0 ? Math.round(grandTotalLm / activeDaysCount) : 0;

  // Wilayah summary list
  const wilayahSummary = Object.entries(overallWilayahMap)
    .map(([wilayah, totalLm]) => ({
      wilayah,
      totalLm,
      percentage: grandTotalLm > 0 ? (totalLm / grandTotalLm) * 100 : 0,
    }))
    .sort((a, b) => b.totalLm - a.totalLm);

  return {
    grandTotalLm,
    totalRecords,
    activeDaysCount,
    avgLmPerDay,
    peakDay,
    lowestDay,
    dailyData,
    wilayahSummary,
    dateColumnName: dateCol || null,
    lmColumnName: null,
  };
}

/**
 * =========================================================================
 * EXPENSE (PENGELUARAN) HELPER FUNCTIONS & AGGREGATIONS
 * =========================================================================
 */

export function findExpenseAmountColumn(headers: string[]): string | undefined {
  return (
    findColumn(
      headers,
      /^(nominal|amount|total|biaya|jumlah|nilai|pengeluaran|debit|total_biaya|total_expense|expense|harga|pengeluaran_rp|total_rp|subtotal)$/i
    ) ||
    headers.find((h) =>
      /nominal|amount|total_biaya|pengeluaran|expense|total_rp|debit/i.test(h.trim())
    ) ||
    findRevenueColumn(headers)
  );
}

export function findExpenseCategoryColumn(headers: string[]): string | undefined {
  return (
    findColumn(
      headers,
      /^(kategori|category|pos_biaya|jenis_pengeluaran|jenis_biaya|akun|tipe_biaya|keperluan|kategori_biaya|pos_anggaran|tipe)$/i
    ) ||
    headers.find((h) =>
      /kategori|category|pos_biaya|jenis_pengeluaran|jenis_biaya|pos_anggaran/i.test(h.trim())
    ) ||
    findServiceColumn(headers)
  );
}

export function findExpenseDescriptionColumn(headers: string[]): string | undefined {
  return (
    findColumn(
      headers,
      /^(keterangan|deskripsi|description|uraian|rincian|catatan|note|memo|detail|keperluan|nama_pengeluaran|item)$/i
    ) ||
    headers.find((h) =>
      /keterangan|deskripsi|description|uraian|rincian|catatan|memo/i.test(h.trim())
    )
  );
}

export function findExpensePaymentMethodColumn(headers: string[]): string | undefined {
  return (
    findColumn(
      headers,
      /^(metode_pembayaran|metode|payment_method|via|rekening|sumber_dana|tipe_bayar|cara_bayar|bank|payment|status_pembayaran)$/i
    ) ||
    headers.find((h) =>
      /metode|payment|rekening|sumber_dana|cara_bayar/i.test(h.trim())
    )
  );
}

export function findExpenseVendorColumn(headers: string[]): string | undefined {
  return (
    findColumn(
      headers,
      /^(vendor|penerima|toko|supplier|pic|petugas|driver|nama_penerima|pihak_ketiga|merchant)$/i
    ) ||
    headers.find((h) =>
      /vendor|penerima|supplier|pic|petugas|driver|merchant/i.test(h.trim())
    )
  );
}

export interface DailyExpenseRecord {
  dateKey: string;
  day: number;
  month: number;
  year: number;
  formattedDate: string;
  fullFormattedDate: string;
  shortDate: string;
  dayName: string;
  totalAmount: number;
  count: number;
  topCategory: string;
  percentageOfTotal: number;
}

export interface ExpenseCategoryBreakdown {
  category: string;
  totalAmount: number;
  count: number;
  percentage: number;
  color?: string;
}

export interface ExpensePaymentBreakdown {
  method: string;
  totalAmount: number;
  count: number;
  percentage: number;
}

export interface ExpenseWilayahBreakdown {
  wilayah: string;
  totalAmount: number;
  count: number;
  percentage: number;
}

export interface ExpenseTransactionItem {
  id: string;
  rawDate: any;
  formattedDate: string;
  category: string;
  description: string;
  amount: number;
  paymentMethod: string;
  vendor: string;
  wilayah: string;
  rawRow: Record<string, any>;
}

export interface ExpenseStats {
  grandTotalExpense: number;
  totalTransactions: number;
  activeDaysCount: number;
  avgExpensePerDay: number;
  avgExpensePerTransaction: number;
  peakDay: { dateKey: string; formattedDate: string; totalAmount: number; topCategory: string } | null;
  lowestDay: { dateKey: string; formattedDate: string; totalAmount: number } | null;
  largestTransaction: ExpenseTransactionItem | null;
  dailyData: DailyExpenseRecord[];
  categoryBreakdown: ExpenseCategoryBreakdown[];
  paymentMethodBreakdown: ExpensePaymentBreakdown[];
  wilayahBreakdown: ExpenseWilayahBreakdown[];
  transactions: ExpenseTransactionItem[];
  categoriesList: string[];
  wilayahList: string[];
  dateColumnName: string | null;
  amountColumnName: string | null;
  categoryColumnName: string | null;
  wilayahColumnName: string | null;
}

const CATEGORY_PALETTE = [
  "#10b981", // emerald
  "#3b82f6", // blue
  "#f59e0b", // amber
  "#ec4899", // pink
  "#8b5cf6", // purple
  "#06b6d4", // cyan
  "#f97316", // orange
  "#14b8a6", // teal
  "#6366f1", // indigo
  "#84cc16", // lime
];

/**
 * Extract and aggregate Expense data from EXPENSE sheet rows
 */
export function extractExpenseStats(
  rows: Record<string, any>[],
  headers: string[],
  filters?: FilterState
): ExpenseStats {
  const filteredRows = filters ? filterRows(rows, headers, filters) : rows;

  const dateCol = findDateColumn(headers);
  const amountCol = findExpenseAmountColumn(headers);
  const categoryCol = findExpenseCategoryColumn(headers);
  const descCol = findExpenseDescriptionColumn(headers);
  const payMethodCol = findExpensePaymentMethodColumn(headers);
  const vendorCol = findExpenseVendorColumn(headers);
  const wilayahCol = findWilayahColumn(headers);

  let grandTotalExpense = 0;
  let totalTransactions = 0;

  const dateMap = new Map<
    string,
    {
      dateKey: string;
      day: number;
      month: number;
      year: number;
      totalAmount: number;
      count: number;
      categoryMap: Record<string, number>;
    }
  >();

  const categoryMap: Record<string, { totalAmount: number; count: number }> = {};
  const paymentMap: Record<string, { totalAmount: number; count: number }> = {};
  const wilayahMap: Record<string, { totalAmount: number; count: number }> = {};
  const transactions: ExpenseTransactionItem[] = [];

  filteredRows.forEach((row, idx) => {
    // Check if row is not empty
    const hasValues = Object.values(row).some(
      (v) => v !== null && v !== undefined && String(v).trim() !== ""
    );
    if (!hasValues) return;

    // Parse amount
    let amount = 0;
    if (amountCol && row[amountCol] !== undefined && row[amountCol] !== null) {
      amount = parseNumericValue(row[amountCol]);
    } else {
      // Fallback: search for any numeric field that looks like amount
      for (const h of headers) {
        if (/nominal|biaya|jumlah|total|amount|harga|rp/i.test(h)) {
          const val = parseNumericValue(row[h]);
          if (val > 0) {
            amount = val;
            break;
          }
        }
      }
    }

    // Category
    let category = "Operasional";
    if (categoryCol && row[categoryCol] !== undefined && row[categoryCol] !== null && String(row[categoryCol]).trim() !== "") {
      category = String(row[categoryCol]).trim();
    }

    // Description
    let description = "-";
    if (descCol && row[descCol] !== undefined && row[descCol] !== null && String(row[descCol]).trim() !== "") {
      description = String(row[descCol]).trim();
    } else {
      // Fallback to first text column
      const textHeader = headers.find((h) => h !== dateCol && h !== amountCol && h !== categoryCol && row[h]);
      if (textHeader && row[textHeader]) {
        description = String(row[textHeader]).trim();
      }
    }

    // Payment Method
    let paymentMethod = "Tunai / Cash";
    if (payMethodCol && row[payMethodCol] !== undefined && row[payMethodCol] !== null && String(row[payMethodCol]).trim() !== "") {
      paymentMethod = String(row[payMethodCol]).trim();
    }

    // Vendor / PIC
    let vendor = "-";
    if (vendorCol && row[vendorCol] !== undefined && row[vendorCol] !== null && String(row[vendorCol]).trim() !== "") {
      vendor = String(row[vendorCol]).trim();
    }

    // Wilayah (Column G / WILAYAH header)
    let wilayah = "";
    if (wilayahCol && row[wilayahCol] !== undefined && row[wilayahCol] !== null && String(row[wilayahCol]).trim() !== "") {
      wilayah = String(row[wilayahCol]).trim();
    } else {
      // Search in row for any key with wilayah/region/cabang/kota/lokasi
      for (const k of Object.keys(row)) {
        if (/wilayah|region|area|cabang|kota|lokasi|tujuan|asal|branch/i.test(k)) {
          const val = String(row[k] || "").trim();
          if (val && val !== "-" && val !== "null" && val !== "undefined") {
            wilayah = val;
            break;
          }
        }
      }
      // Check 7th column (Column G, index 6)
      if (!wilayah && headers.length >= 7 && row[headers[6]] !== undefined && row[headers[6]] !== null) {
        const val = String(row[headers[6]]).trim();
        if (val && val !== "-" && val !== "null" && val !== "undefined") {
          wilayah = val;
        }
      }
    }
    if (!wilayah || wilayah === "-" || wilayah === "null") {
      wilayah = "Banjarnegara";
    }

    const dateInfo = extractRowDateInfo(row, headers);
    let dKey = dateInfo.dateKey;
    let day = dateInfo.day || 1;
    let month = dateInfo.month || 1;
    let year = dateInfo.year || new Date().getFullYear();

    if (!dKey) {
      if (dateInfo.year && dateInfo.month) {
        dKey = `${dateInfo.year}-${String(dateInfo.month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      } else {
        dKey = `TGL-${String(day).padStart(2, "0")}`;
      }
    }

    let formattedDate = `${String(day).padStart(2, "0")} ${INDO_MONTHS_SHORT[month] || ""} ${year}`;

    grandTotalExpense += amount;
    totalTransactions += 1;

    // Category aggregation
    if (!categoryMap[category]) {
      categoryMap[category] = { totalAmount: 0, count: 0 };
    }
    categoryMap[category].totalAmount += amount;
    categoryMap[category].count += 1;

    // Payment aggregation
    if (!paymentMap[paymentMethod]) {
      paymentMap[paymentMethod] = { totalAmount: 0, count: 0 };
    }
    paymentMap[paymentMethod].totalAmount += amount;
    paymentMap[paymentMethod].count += 1;

    // Wilayah aggregation
    if (!wilayahMap[wilayah]) {
      wilayahMap[wilayah] = { totalAmount: 0, count: 0 };
    }
    wilayahMap[wilayah].totalAmount += amount;
    wilayahMap[wilayah].count += 1;

    // Date Map aggregation
    if (!dateMap.has(dKey)) {
      dateMap.set(dKey, {
        dateKey: dKey,
        day,
        month,
        year,
        totalAmount: 0,
        count: 0,
        categoryMap: {},
      });
    }
    const dEntry = dateMap.get(dKey)!;
    dEntry.totalAmount += amount;
    dEntry.count += 1;
    dEntry.categoryMap[category] = (dEntry.categoryMap[category] || 0) + amount;

    // Add to list
    transactions.push({
      id: `exp-${idx}-${dKey}`,
      rawDate: dateCol ? row[dateCol] : "",
      formattedDate,
      category,
      description,
      amount,
      paymentMethod,
      vendor,
      wilayah,
      rawRow: row,
    });
  });

  // Sort daily data chronologically
  const rawDailyList = Array.from(dateMap.values());
  rawDailyList.sort((a, b) => a.dateKey.localeCompare(b.dateKey));

  let peakDay: { dateKey: string; formattedDate: string; totalAmount: number; topCategory: string } | null = null;
  let lowestDay: { dateKey: string; formattedDate: string; totalAmount: number } | null = null;

  const dailyData: DailyExpenseRecord[] = rawDailyList.map((item) => {
    let formattedDate = `${String(item.day).padStart(2, "0")} ${INDO_MONTHS_SHORT[item.month] || ""} ${item.year}`;
    let fullFormattedDate = formattedDate;
    let dayName = "";

    try {
      const dt = new Date(item.year, item.month - 1, item.day);
      if (!isNaN(dt.getTime())) {
        const dIdx = dt.getDay();
        dayName = INDO_DAYS[dIdx] || "";
        fullFormattedDate = `${dayName}, ${String(item.day).padStart(2, "0")} ${INDO_MONTHS_FULL[item.month] || ""} ${item.year}`;
      }
    } catch {}

    let topCategory = "-";
    let maxCatVal = 0;
    Object.entries(item.categoryMap).forEach(([cat, val]) => {
      if (val > maxCatVal) {
        maxCatVal = val;
        topCategory = cat;
      }
    });

    const percentageOfTotal = grandTotalExpense > 0 ? (item.totalAmount / grandTotalExpense) * 100 : 0;

    if (!peakDay || item.totalAmount > peakDay.totalAmount) {
      peakDay = {
        dateKey: item.dateKey,
        formattedDate,
        totalAmount: item.totalAmount,
        topCategory,
      };
    }
    if (!lowestDay || item.totalAmount < lowestDay.totalAmount) {
      lowestDay = {
        dateKey: item.dateKey,
        formattedDate,
        totalAmount: item.totalAmount,
      };
    }

    return {
      dateKey: item.dateKey,
      day: item.day,
      month: item.month,
      year: item.year,
      formattedDate,
      fullFormattedDate,
      shortDate: `${String(item.day).padStart(2, "0")}/${String(item.month).padStart(2, "0")}`,
      dayName,
      totalAmount: item.totalAmount,
      count: item.count,
      topCategory,
      percentageOfTotal,
    };
  });

  const activeDaysCount = dailyData.length;
  const avgExpensePerDay = activeDaysCount > 0 ? Math.round(grandTotalExpense / activeDaysCount) : 0;
  const avgExpensePerTransaction = totalTransactions > 0 ? Math.round(grandTotalExpense / totalTransactions) : 0;

  // Category breakdown
  const categoryBreakdown: ExpenseCategoryBreakdown[] = Object.entries(categoryMap)
    .map(([category, info], i) => ({
      category,
      totalAmount: info.totalAmount,
      count: info.count,
      percentage: grandTotalExpense > 0 ? (info.totalAmount / grandTotalExpense) * 100 : 0,
      color: CATEGORY_PALETTE[i % CATEGORY_PALETTE.length],
    }))
    .sort((a, b) => b.totalAmount - a.totalAmount);

  // Payment method breakdown
  const paymentMethodBreakdown: ExpensePaymentBreakdown[] = Object.entries(paymentMap)
    .map(([method, info]) => ({
      method,
      totalAmount: info.totalAmount,
      count: info.count,
      percentage: grandTotalExpense > 0 ? (info.totalAmount / grandTotalExpense) * 100 : 0,
    }))
    .sort((a, b) => b.totalAmount - a.totalAmount);

  // Wilayah breakdown
  const wilayahBreakdown: ExpenseWilayahBreakdown[] = Object.entries(wilayahMap)
    .map(([wilayah, info]) => ({
      wilayah,
      totalAmount: info.totalAmount,
      count: info.count,
      percentage: grandTotalExpense > 0 ? (info.totalAmount / grandTotalExpense) * 100 : 0,
    }))
    .sort((a, b) => b.totalAmount - a.totalAmount);

  // Find largest transaction
  let largestTransaction: ExpenseTransactionItem | null = null;
  transactions.forEach((tx) => {
    if (!largestTransaction || tx.amount > largestTransaction.amount) {
      largestTransaction = tx;
    }
  });

  // Sort transactions by date descending
  transactions.sort((a, b) => {
    const dComp = b.formattedDate.localeCompare(a.formattedDate);
    if (dComp !== 0) return dComp;
    return b.amount - a.amount;
  });

  return {
    grandTotalExpense,
    totalTransactions,
    activeDaysCount,
    avgExpensePerDay,
    avgExpensePerTransaction,
    peakDay,
    lowestDay,
    largestTransaction,
    dailyData,
    categoryBreakdown,
    paymentMethodBreakdown,
    wilayahBreakdown,
    transactions,
    categoriesList: categoryBreakdown.map((c) => c.category),
    wilayahList: wilayahBreakdown.map((w) => w.wilayah),
    dateColumnName: dateCol || null,
    amountColumnName: amountCol || null,
    categoryColumnName: categoryCol || null,
    wilayahColumnName: wilayahCol || (headers.length >= 7 ? headers[6] : null),
  };
}

/**
 * Generate fallback demo data for EXPENSE sheet if live Google Sheet tab is empty or not yet filled
 */
export function generateSampleExpenseRows(currentYear: number = new Date().getFullYear()): {
  headers: string[];
  rows: Record<string, any>[];
} {
  const headers = [
    "Tanggal",
    "Kategori",
    "Keterangan",
    "Nominal",
    "Metode Pembayaran",
    "Vendor / PIC",
    "Wilayah",
  ];

  const sampleCategories = [
    { cat: "BBM & Solar Armada", avg: 250000, methods: ["Petty Cash", "BCA Operasional"], vendors: ["SPBU Pertamina Mandiraja", "SPBU Klampok", "SPBU Banjarnegara"] },
    { cat: "Uang Jalan Driver", avg: 180000, methods: ["Transfer Bank", "Petty Cash"], vendors: ["Driver Lastmile A", "Driver Shuttle B", "Kurir Express"] },
    { cat: "Maintenance & Servis Armada", avg: 650000, methods: ["Transfer Bank"], vendors: ["Bengkel Mobil Berkah", "Toko Sparepart Jaya", "Tambal Ban & Cuci"] },
    { cat: "ATK & Lakban Packing", avg: 120000, methods: ["Petty Cash"], vendors: ["Toko Alat Tulis Pelangi", "Distributor Lakban & Plastik"] },
    { cat: "Konsumsi & Air Galon Ops", avg: 75000, methods: ["Petty Cash"], vendors: ["Depot Air Mineral Sehat", "Warung Berkah Ops"] },
    { cat: "Listrik, Air & Internet Hub", avg: 850000, methods: ["Transfer Bank"], vendors: ["PLN Prabayar", "Indihome Telkom", "PDAM Banjarnegara"] },
    { cat: "Sewa Tempat & Kebersihan Hub", avg: 500000, methods: ["Transfer Bank"], vendors: ["Petugas Kebersihan Hub", "Keamanan Lingkungan"] },
  ];

  const rows: Record<string, any>[] = [];
  const curMonth = new Date().getMonth() + 1;

  // Generate 25 realistic records across current month
  for (let d = 1; d <= 28; d += (d % 2 === 0 ? 1 : 2)) {
    const dateStr = `${currentYear}-${String(curMonth).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const catItem = sampleCategories[d % sampleCategories.length];
    const amountVariance = (Math.sin(d) * 0.3 + 1) * catItem.avg;
    const nominal = Math.round(amountVariance / 5000) * 5000;
    const method = catItem.methods[d % catItem.methods.length];
    const vendor = catItem.vendors[d % catItem.vendors.length];

    rows.push({
      Tanggal: dateStr,
      Kategori: catItem.cat,
      Keterangan: `Operasional harian ${catItem.cat} Banjarnegara`,
      Nominal: nominal,
      "Metode Pembayaran": method,
      "Vendor / PIC": vendor,
      Wilayah: "Banjarnegara",
    });
  }

  return { headers, rows };
}
