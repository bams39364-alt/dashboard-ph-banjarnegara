import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  Pill,
  Search,
  Download,
  Copy,
  Check,
  Code2,
  Link2,
  RefreshCw,
  TrendingUp,
  PackageCheck,
  Coins,
  Truck,
  MapPin,
  Calendar,
  X,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Layers,
  ShieldCheck,
  AlertCircle,
  Settings2,
  CheckCircle2,
  Upload,
  FileText,
  AlertTriangle,
  Code,
  Receipt,
  Wallet,
  TrendingDown,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { motion, AnimatePresence } from "motion/react";
import { FarmaDeliveryRecord, FarmaExpenseRecord } from "../types";
import { DEFAULT_FARMA_RECORDS, FARMA_DEFAULT_WEBAPP_URL } from "../data/paxelFarmaData";
import { DEFAULT_FARMA_EXPENSES } from "../data/defaultFarmaExpenses";
import { GOOGLE_APPS_SCRIPT_CODE } from "../data/googleAppsScriptCode";
import { FarmaExpenseSection } from "./FarmaExpenseSection";
import { formatIDR } from "../utils/dataHelper";
import { useTheme } from "../context/ThemeContext";

const MONTH_NAMES: Record<number, string> = {
  1: "Januari",
  2: "Februari",
  3: "Maret",
  4: "April",
  5: "Mei",
  6: "Juni",
  7: "Juli",
  8: "Agustus",
  9: "September",
  10: "Oktober",
  11: "November",
  12: "Desember",
};

function formatDisplayDate(dateStr: string, rawTimestamp: string): string {
  if (dateStr && dateStr.includes("-")) {
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      const day = parseInt(parts[2], 10);
      const mNum = parseInt(parts[1], 10);
      const year = parts[0];
      const mName = MONTH_NAMES[mNum] ? MONTH_NAMES[mNum].slice(0, 3) : parts[1];
      return `${day} ${mName} ${year}`;
    }
  }
  if (rawTimestamp && rawTimestamp.includes("GMT")) {
    const d = new Date(rawTimestamp);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
    }
  }
  return rawTimestamp || dateStr;
}

export const PaxelFarmaDashboardView: React.FC = () => {
  const { isDark } = useTheme();

  // Sub-navigation tab: 'delivery' (RSUD & RSI) vs 'expense' (Sheet EXPENSE)
  const [farmaTab, setFarmaTab] = useState<"delivery" | "expense">("delivery");

  // Records state (defaults to preloaded RSUD & RSI records, automatically auto-updated via Google Apps Script)
  const [records, setRecords] = useState<FarmaDeliveryRecord[]>(DEFAULT_FARMA_RECORDS);
  // Expenses state (defaults to preloaded EXPENSE records, auto-updated via Google Apps Script)
  const [expenses, setExpenses] = useState<FarmaExpenseRecord[]>(DEFAULT_FARMA_EXPENSES);

  const [faskesFilter, setFaskesFilter] = useState<"ALL" | "RSUD BANJARNEGARA" | "RSI BANJARNEGARA">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [paymentFilter, setPaymentFilter] = useState<string>("ALL");
  // Default to current month (e.g. September) if data exists
  const [monthFilter, setMonthFilter] = useState<string>(() => {
    const curMonth = new Date().getMonth() + 1;
    const hasCurrent = DEFAULT_FARMA_RECORDS.some((r) => r.month === curMonth);
    return hasCurrent ? String(curMonth) : "ALL";
  });
  const [kecamatanFilter, setKecamatanFilter] = useState<string>("ALL");
  const [courierFilter, setCourierFilter] = useState<string>("ALL");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Modals
  const [isKodeModalOpen, setIsKodeModalOpen] = useState(false);
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [isUploadRsiModalOpen, setIsUploadRsiModalOpen] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);

  // Manual RSI CSV state
  const [csvText, setCsvText] = useState("");
  const [csvImportError, setCsvImportError] = useState("");

  // Tracking remote RSI detection
  const [remoteHasRsi, setRemoteHasRsi] = useState(false);

  // Permanent Live Apps Script Sync
  const [webAppUrl, setWebAppUrl] = useState(() => {
    return localStorage.getItem("paxel_farma_webapp_url") || FARMA_DEFAULT_WEBAPP_URL;
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedTime, setLastSyncedTime] = useState<string>(() => {
    return new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  });
  const [syncStatus, setSyncStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Auto-fetch data from Google Apps Script Web App
  const syncFromWebApp = useCallback(
    async (customUrl?: string, isManual = false) => {
      const endpoint = (customUrl || webAppUrl || FARMA_DEFAULT_WEBAPP_URL).trim();
      setIsSyncing(true);
      if (isManual) setSyncStatus(null);

      try {
        const response = await fetch(endpoint, { method: "GET" });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const json = await response.json();

        if (json && Array.isArray(json.data) && json.data.length > 0) {
          // Filter out any header or summary rows
          const cleanData: FarmaDeliveryRecord[] = json.data
            .filter((r: any) => {
              const name = String(r.patientName || "").trim().toLowerCase();
              const rawT = String(r.rawTimestamp || "").trim().toLowerCase();
              return (
                name !== "nama pasien" &&
                name !== "pasien" &&
                name !== "" &&
                !name.includes("total") &&
                !name.includes("jumlah") &&
                rawT !== "timestamp" &&
                rawT !== ""
              );
            })
            .map((r: any, idx: number) => {
              const rawFaskes = r.faskes ? String(r.faskes) : "";
              const isRsi =
                rawFaskes.toUpperCase().includes("RSI") ||
                String(r.id || "").toUpperCase().includes("RSI") ||
                String(r.sheet || "").toUpperCase().includes("RSI");

              let dStr = r.date ? String(r.date) : "";
              let dDay = Number(r.day);
              let dMonth = Number(r.month);
              let dYear = Number(r.year);

              if (!dStr || isNaN(dMonth) || dMonth < 1 || dMonth > 12) {
                const rawT = String(r.rawTimestamp || "");
                const dObj = new Date(rawT);
                if (!isNaN(dObj.getTime())) {
                  dYear = dObj.getFullYear();
                  dMonth = dObj.getMonth() + 1;
                  dDay = dObj.getDate();
                  dStr = `${dYear}-${String(dMonth).padStart(2, "0")}-${String(dDay).padStart(2, "0")}`;
                } else {
                  dYear = 2026;
                  dMonth = 5;
                  dDay = 29;
                  dStr = "2026-05-29";
                }
              }

              const rawKec = String(r.kecamatan || "BANJARNEGARA").trim().toUpperCase().replace(/^KEC\.?\s*/i, "");
              const rawP = String(r.paymentType || "").trim().toUpperCase();
              let payType = "COD";
              if (isRsi) {
                payType = rawP.includes("VIP") ? "VIP" : "REGULER";
              } else {
                payType =
                  rawP.includes("GRATIS") ||
                  rawP.includes("NON") ||
                  rawP.includes("BPJS") ||
                  rawP.includes("SUBSIDI")
                    ? "GRATIS"
                    : "COD";
              }

              return {
                id: r.id || (isRsi ? `RSI-${idx + 1}` : `RSUD-${idx + 1}`),
                rawTimestamp: String(r.rawTimestamp || ""),
                date: dStr,
                day: dDay,
                month: dMonth,
                year: dYear,
                faskes: isRsi ? "RSI BANJARNEGARA" : "RSUD BANJARNEGARA",
                patientName: String(r.patientName || "").trim(),
                address: String(r.address || "").trim(),
                kecamatan: rawKec || "BANJARNEGARA",
                courierName: String(r.courierName || "Kurir").trim(),
                paymentType: payType,
                ongkir: Number(r.ongkir) || (payType === "GRATIS" ? 0 : (isRsi ? 13000 : 8000)),
              };
            });

          if (cleanData.length > 0) {
            const hasRsi = cleanData.some((r) => r.faskes === "RSI BANJARNEGARA");
            setRemoteHasRsi(hasRsi);
            setRecords(cleanData);
            const now = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
            setLastSyncedTime(now);

            // Persist custom URL if valid
            if (customUrl) {
              localStorage.setItem("paxel_farma_webapp_url", customUrl);
            }

            // Also check and parse expenses if present in the payload
            let syncedExpenseCount = 0;
            if (json && Array.isArray(json.expenses) && json.expenses.length > 0) {
              const cleanExp: FarmaExpenseRecord[] = json.expenses
                .filter((e: any) => {
                  const cat = String(e.category || "").trim().toLowerCase();
                  const nom = Number(e.nominal) || 0;
                  return cat !== "ket" && !cat.includes("total") && (nom > 0 || e.description);
                })
                .map((e: any, idx: number) => {
                  let dStr = e.date ? String(e.date) : "";
                  let dDay = Number(e.day);
                  let dMonth = Number(e.month);
                  let dYear = Number(e.year);

                  if (!dStr || isNaN(dMonth) || dMonth < 1 || dMonth > 12) {
                    const rawT = String(e.rawTimestamp || "");
                    const dObj = new Date(rawT);
                    if (!isNaN(dObj.getTime())) {
                      dYear = dObj.getFullYear();
                      dMonth = dObj.getMonth() + 1;
                      dDay = dObj.getDate();
                      dStr = `${dYear}-${String(dMonth).padStart(2, "0")}-${String(dDay).padStart(2, "0")}`;
                    } else {
                      dYear = 2026;
                      dMonth = 6;
                      dDay = 1;
                      dStr = "2026-06-01";
                    }
                  }

                  return {
                    id: e.id || `EXP-${idx + 1}`,
                    rawTimestamp: String(e.rawTimestamp || ""),
                    date: dStr,
                    day: dDay || 1,
                    month: dMonth || 6,
                    year: dYear || 2026,
                    category: String(e.category || "Operasional").trim(),
                    description: String(e.description || "-").trim(),
                    nominal: Number(e.nominal) || 0,
                  };
                });

              if (cleanExp.length > 0) {
                setExpenses(cleanExp);
                syncedExpenseCount = cleanExp.length;
              }
            }

            if (isManual) {
              setSyncStatus({
                type: "success",
                message: `Sinkronisasi berhasil! ${cleanData.length.toLocaleString("id-ID")} pengiriman & ${
                  syncedExpenseCount > 0
                    ? `${syncedExpenseCount.toLocaleString("id-ID")} pengeluaran (EXPENSE)`
                    : "pengeluaran default"
                } termutakhir.${
                  hasRsi
                    ? " (Data sheet RSUD & RSI terbaca penuh)"
                    : " (Catatan: Baru sheet RSUD yang terkirim. Update script untuk sheet RSI & EXPENSE)"
                }`,
              });
              setIsConnectModalOpen(false);
            }
          }
        } else {
          throw new Error("Respon Google Sheets kosong atau format tidak sesuai.");
        }
      } catch (err: any) {
        console.warn("Gagal mengambil data dari Google Apps Script:", err);
        if (isManual) {
          setSyncStatus({
            type: "error",
            message: `Gagal sinkronisasi: ${err.message || "Periksa kembali URL Web App dan pastikan akses diset ke 'Anyone'."}`,
          });
        }
      } finally {
        setIsSyncing(false);
      }
    },
    [webAppUrl]
  );

  // Manual CSV Import handler for RSI
  const handleImportRsiCsv = (text: string) => {
    try {
      const lines = text.trim().split(/\r?\n/);
      if (lines.length < 2) throw new Error("CSV/Teks minimal harus memiliki 2 baris (header dan isi data).");

      const parseCsvLine = (line: string) => {
        const result: string[] = [];
        let curr = "";
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if ((char === "," || char === "\t" || char === ";") && !inQuotes) {
            result.push(curr.trim().replace(/^"+|"+$/g, ""));
            curr = "";
          } else {
            curr += char;
          }
        }
        result.push(curr.trim().replace(/^"+|"+$/g, ""));
        return result;
      };

      const rows = lines.map(parseCsvLine);
      let headerIdx = -1;
      let colMap = { time: 0, name: 1, addr: 2, kec: 3, courier: 4, pay: -1, ongkir: -1 };

      for (let r = 0; r < Math.min(10, rows.length); r++) {
        const rowStr = rows[r].join(" ").toLowerCase();
        if (rowStr.includes("pasien") || rowStr.includes("nama") || rowStr.includes("alamat")) {
          headerIdx = r;
          break;
        }
      }

      if (headerIdx !== -1) {
        const h = rows[headerIdx];
        for (let c = 0; c < h.length; c++) {
          const val = h[c].toLowerCase();
          if (val.match(/(timestamp|tanggal|tgl|waktu|date)/)) colMap.time = c;
          else if (val.match(/(pasien|nama|penerima)/)) colMap.name = c;
          else if (val.match(/(alamat|tujuan|desa)/)) colMap.addr = c;
          else if (val.match(/(kecamatan|kec\b|wilayah)/)) colMap.kec = c;
          else if (val.match(/(kurir|pengantar|driver|courier)/)) colMap.courier = c;
          else if (val.match(/(pembayaran|bayar|jenis|tipe|metode|status)/)) colMap.pay = c;
          else if (val.match(/(ongkir|tarif|biaya|ongkos)/)) colMap.ongkir = c;
        }
      }

      const newRsiRecords: FarmaDeliveryRecord[] = [];
      const startR = headerIdx !== -1 ? headerIdx + 1 : 1;

      for (let i = startR; i < rows.length; i++) {
        const row = rows[i];
        const rawName = row[colMap.name] || "";
        const rawTime = row[colMap.time] || "";
        if (!rawName || rawName.toLowerCase() === "nama pasien" || rawName.toLowerCase().includes("total")) continue;

        const rawAddr = row[colMap.addr] || "";
        const rawKec = row[colMap.kec] || "BANJARNEGARA";
        const rawKurir = row[colMap.courier] || "Kurir";
        const rawPay = colMap.pay !== -1 ? (row[colMap.pay] || "").toUpperCase() : "";
        const payType = rawPay.includes("VIP") ? "VIP" : "REGULER";
        const rawOngkir = colMap.ongkir !== -1 ? Number(row[colMap.ongkir]?.replace(/[^0-9]/g, "")) || 13000 : 13000;

        let dStr = "2026-05-29";
        let dDay = 29, dMonth = 5, dYear = 2026;
        const dObj = new Date(rawTime);
        if (!isNaN(dObj.getTime())) {
          dYear = dObj.getFullYear();
          dMonth = dObj.getMonth() + 1;
          dDay = dObj.getDate();
          dStr = `${dYear}-${String(dMonth).padStart(2, "0")}-${String(dDay).padStart(2, "0")}`;
        }

        newRsiRecords.push({
          id: `RSI-CSV-${i + 1}`,
          rawTimestamp: rawTime,
          date: dStr,
          day: dDay,
          month: dMonth,
          year: dYear,
          faskes: "RSI BANJARNEGARA",
          patientName: rawName,
          address: rawAddr,
          kecamatan: rawKec.toUpperCase().replace(/^KEC\.?\s*/i, "").trim() || "BANJARNEGARA",
          courierName: rawKurir,
          paymentType: payType,
          ongkir: rawOngkir,
        });
      }

      if (newRsiRecords.length === 0) {
        throw new Error("Tidak ada data transaksi RSI yang berhasil diekstrak.");
      }

      setRecords((prev) => {
        const withoutOldRsi = prev.filter((r) => r.faskes !== "RSI BANJARNEGARA");
        return [...withoutOldRsi, ...newRsiRecords];
      });
      setRemoteHasRsi(true);
      setIsUploadRsiModalOpen(false);
      setFaskesFilter("RSI BANJARNEGARA");
      setSyncStatus({
        type: "success",
        message: `Berhasil mengimpor ${newRsiRecords.length.toLocaleString("id-ID")} data transaksi asli RSI BANJARNEGARA!`,
      });
    } catch (e: any) {
      setCsvImportError(e.message || "Gagal memproses file CSV.");
    }
  };

  // Continuous background auto-sync on load
  useEffect(() => {
    syncFromWebApp(undefined, false);
  }, [syncFromWebApp]);

  // Unique lists for filter dropdowns
  const availableMonths = useMemo(() => {
    const map = new Map<string, { month: number; year: number; label: string }>();
    const now = new Date();
    const curM = now.getMonth() + 1;
    const curY = now.getFullYear();

    records.forEach((r) => {
      if (r.month && r.year) {
        const key = `${r.month}`;
        if (!map.has(key)) {
          const mName = MONTH_NAMES[r.month] || `Bulan ${r.month}`;
          const isCurrent = r.month === curM && r.year === curY;
          map.set(key, {
            month: r.month,
            year: r.year,
            label: isCurrent ? `${mName} ${r.year} (Bulan Ini)` : `${mName} ${r.year}`,
          });
        }
      }
    });
    return Array.from(map.values()).sort((a, b) => b.month - a.month);
  }, [records]);

  // Active month label
  const activeMonthLabel = useMemo(() => {
    if (monthFilter === "ALL") return "Semua Periode";
    const found = availableMonths.find((m) => String(m.month) === monthFilter);
    return found ? found.label : `Bulan ${monthFilter}`;
  }, [monthFilter, availableMonths]);

  const availableKecamatan = useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => {
      if (r.kecamatan) set.add(r.kecamatan);
    });
    return Array.from(set).sort();
  }, [records]);

  const availableCouriers = useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => {
      if (r.courierName) set.add(r.courierName);
    });
    return Array.from(set).sort();
  }, [records]);

  // Faskes counts
  const rsudCount = useMemo(() => records.filter((r) => r.faskes === "RSUD BANJARNEGARA").length, [records]);
  const rsiCount = useMemo(() => records.filter((r) => r.faskes === "RSI BANJARNEGARA").length, [records]);

  // Available payment types according to selected faskes
  const availablePaymentTypes = useMemo(() => {
    if (faskesFilter === "RSUD BANJARNEGARA") {
      return ["ALL", "COD", "GRATIS"];
    }
    if (faskesFilter === "RSI BANJARNEGARA") {
      return ["ALL", "REGULER", "VIP"];
    }
    // Mode Semua Faskes
    return ["ALL", "COD", "GRATIS", "REGULER", "VIP"];
  }, [faskesFilter]);

  // Auto-reset paymentFilter when switching faskes if the selected filter is not available
  useEffect(() => {
    if (paymentFilter !== "ALL" && !availablePaymentTypes.includes(paymentFilter)) {
      setPaymentFilter("ALL");
    }
  }, [faskesFilter, availablePaymentTypes, paymentFilter]);

  // Filtered records
  const filteredRecords = useMemo(() => {
    return records.filter((rec) => {
      // Faskes filter
      if (faskesFilter !== "ALL" && rec.faskes !== faskesFilter) {
        return false;
      }
      // Payment filter
      if (paymentFilter !== "ALL" && rec.paymentType !== paymentFilter) {
        return false;
      }
      // Month filter
      if (monthFilter !== "ALL" && String(rec.month) !== monthFilter) {
        return false;
      }
      // Kecamatan filter
      if (kecamatanFilter !== "ALL" && rec.kecamatan !== kecamatanFilter) {
        return false;
      }
      // Courier filter
      if (courierFilter !== "ALL" && rec.courierName !== courierFilter) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = rec.patientName.toLowerCase().includes(q);
        const matchAddr = rec.address.toLowerCase().includes(q);
        const matchKurir = rec.courierName.toLowerCase().includes(q);
        const matchKec = rec.kecamatan.toLowerCase().includes(q);
        const matchDate = rec.rawTimestamp.toLowerCase().includes(q);
        const matchFaskes = (rec.faskes || "").toLowerCase().includes(q);
        if (!matchName && !matchAddr && !matchKurir && !matchKec && !matchDate && !matchFaskes) {
          return false;
        }
      }
      return true;
    });
  }, [records, faskesFilter, paymentFilter, monthFilter, kecamatanFilter, courierFilter, searchQuery]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [faskesFilter, paymentFilter, monthFilter, kecamatanFilter, courierFilter, searchQuery]);

  // KPI Calculations
  const metrics = useMemo(() => {
    const total = filteredRecords.length;
    let codCount = 0;
    let codRevenue = 0;
    let gratisCount = 0;
    let gratisRevenue = 0;
    let regulerCount = 0;
    let regulerRevenue = 0;
    let vipCount = 0;
    let vipRevenue = 0;
    let otherRevenue = 0;
    const kurirCountMap: Record<string, number> = {};
    const kecCountMap: Record<string, number> = {};

    filteredRecords.forEach((r) => {
      const p = String(r.paymentType || "").toUpperCase();
      if (p === "COD") {
        codCount++;
        codRevenue += r.ongkir;
      } else if (p === "GRATIS") {
        gratisCount++;
        gratisRevenue += r.ongkir;
      } else if (p === "VIP") {
        vipCount++;
        vipRevenue += r.ongkir;
      } else if (p === "REGULER" || p === "REGULAR") {
        regulerCount++;
        regulerRevenue += r.ongkir;
      } else {
        otherRevenue += r.ongkir;
      }

      kurirCountMap[r.courierName] = (kurirCountMap[r.courierName] || 0) + 1;
      kecCountMap[r.kecamatan] = (kecCountMap[r.kecamatan] || 0) + 1;
    });

    const totalRevenue = codRevenue + gratisRevenue + regulerRevenue + vipRevenue + otherRevenue;

    // Find top courier
    let topKurir = "-";
    let topKurirMax = 0;
    Object.entries(kurirCountMap).forEach(([k, c]) => {
      if (c > topKurirMax) {
        topKurirMax = c;
        topKurir = k;
      }
    });

    // Find top kecamatan
    let topKec = "-";
    let topKecMax = 0;
    Object.entries(kecCountMap).forEach(([k, c]) => {
      if (c > topKecMax) {
        topKecMax = c;
        topKec = k;
      }
    });

    return {
      total,
      codCount,
      codRevenue,
      codShare: total > 0 ? ((codCount / total) * 100).toFixed(1) : "0",
      gratisCount,
      gratisRevenue,
      gratisShare: total > 0 ? ((gratisCount / total) * 100).toFixed(1) : "0",
      regulerCount,
      regulerRevenue,
      regulerShare: total > 0 ? ((regulerCount / total) * 100).toFixed(1) : "0",
      vipCount,
      vipRevenue,
      vipShare: total > 0 ? ((vipCount / total) * 100).toFixed(1) : "0",
      totalRevenue,
      topKurir,
      topKurirCount: topKurirMax,
      topKec,
      topKecCount: topKecMax,
    };
  }, [filteredRecords]);

  // Chart Data 1: Trend over date
  const trendData = useMemo(() => {
    const dateMap: Record<
      string,
      { date: string; displayDate: string; COD: number; GRATIS: number; REGULER: number; VIP: number; total: number }
    > = {};

    filteredRecords.forEach((r) => {
      const dKey = r.date;
      if (!dateMap[dKey]) {
        const parts = dKey.split("-");
        const shortDate = parts.length === 3 ? `${parts[2]}/${parts[1]}` : dKey;
        dateMap[dKey] = { date: dKey, displayDate: shortDate, COD: 0, GRATIS: 0, REGULER: 0, VIP: 0, total: 0 };
      }
      const p = String(r.paymentType || "").toUpperCase();
      if (p === "COD") {
        dateMap[dKey].COD++;
      } else if (p === "GRATIS") {
        dateMap[dKey].GRATIS++;
      } else if (p === "VIP") {
        dateMap[dKey].VIP++;
      } else {
        dateMap[dKey].REGULER++;
      }
      dateMap[dKey].total++;
    });

    return Object.values(dateMap).sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredRecords]);

  // Chart Data 2: Courier performance
  const courierChartData = useMemo(() => {
    const map: Record<string, { name: string; total: number }> = {};
    filteredRecords.forEach((r) => {
      if (!map[r.courierName]) {
        map[r.courierName] = { name: r.courierName, total: 0 };
      }
      map[r.courierName].total++;
    });
    return Object.values(map)
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [filteredRecords]);

  // Chart Data 3: Top Kecamatan
  const kecamatanChartData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredRecords.forEach((r) => {
      map[r.kecamatan] = (map[r.kecamatan] || 0) + 1;
    });
    return Object.entries(map)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [filteredRecords]);

  // Chart Data 4: Komposisi Pembayaran (Donut)
  const paymentShareData = useMemo(() => {
    if (faskesFilter === "RSI BANJARNEGARA") {
      return [
        { name: "REGULER", value: metrics.regulerCount, color: "#0ea5e9" },
        { name: "VIP", value: metrics.vipCount, color: "#8b5cf6" },
      ].filter((item) => item.value > 0);
    }
    if (faskesFilter === "RSUD BANJARNEGARA") {
      return [
        { name: "COD (Bayar di Tempat)", value: metrics.codCount, color: "#f59e0b" },
        { name: "GRATIS (Faskes / Subsidi)", value: metrics.gratisCount, color: "#10b981" },
      ].filter((item) => item.value > 0);
    }
    // Mode Semua Faskes
    return [
      { name: "COD (RSUD)", value: metrics.codCount, color: "#f59e0b" },
      { name: "GRATIS (RSUD)", value: metrics.gratisCount, color: "#10b981" },
      { name: "REGULER (RSI)", value: metrics.regulerCount, color: "#0ea5e9" },
      { name: "VIP (RSI)", value: metrics.vipCount, color: "#8b5cf6" },
    ].filter((item) => item.value > 0);
  }, [metrics, faskesFilter]);

  // Paginated Rows
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredRecords.length / pageSize) || 1;

  // Copy Google Apps Script code to clipboard
  const handleCopyScript = () => {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_CODE);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 3000);
  };

  // Download filtered rows as CSV
  const handleDownloadCsv = () => {
    const headers = ["ID", "Faskes", "Tanggal", "Nama Pasien", "Alamat", "Kecamatan", "Nama Kurir", "Tipe", "Ongkir"];
    const csvRows = [
      headers.join(","),
      ...filteredRecords.map((r) =>
        [
          r.id,
          `"${r.faskes || "RSUD BANJARNEGARA"}"`,
          `"${r.date}"`,
          `"${r.patientName.replace(/"/g, '""')}"`,
          `"${r.address.replace(/"/g, '""')}"`,
          `"${r.kecamatan}"`,
          `"${r.courierName}"`,
          r.paymentType,
          r.ongkir,
        ].join(",")
      ),
    ];
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Paxel_Farma_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5">
      {/* Sleek Live Connection Status & Action Bar (Replacing the bulky Paxel Farma card) */}
      <div
        className={`px-4 py-3 rounded-2xl border shadow-sm transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
          isDark
            ? "bg-slate-900/90 border-slate-800"
            : "bg-white border-slate-200"
        }`}
      >
        {/* Left: Connection Badge & Status */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping absolute" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 relative" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs sm:text-sm font-bold tracking-tight text-slate-800 dark:text-slate-100">
                Paxel Farma
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                {records.length.toLocaleString("id-ID")} Transaksi Realtime
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 tracking-wide uppercase inline-flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                RSUD BANJARNEGARA ({records.filter((r) => r.faskes?.includes("RSUD")).length.toLocaleString("id-ID")})
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 tracking-wide uppercase inline-flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                RSI BANJARNEGARA ({rsiCount.toLocaleString("id-ID")})
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 tracking-wide uppercase inline-flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                EXPENSE ({expenses.length.toLocaleString("id-ID")})
              </span>
            </div>
            <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-1.5 mt-0.5">
              <span>Sinkronisasi otomatis aktif</span>
              <span>•</span>
              <span>RSUD: {records.filter((r) => r.faskes?.includes("RSUD")).length.toLocaleString("id-ID")}</span>
              <span>•</span>
              <span>RSI: {rsiCount.toLocaleString("id-ID")}</span>
              <span>•</span>
              <span>EXPENSE: {expenses.length.toLocaleString("id-ID")} item</span>
              <span>•</span>
              <span>Update terakhir: {lastSyncedTime} WIB</span>
            </div>
          </div>
        </div>

        {/* Right: Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => syncFromWebApp(undefined, true)}
            disabled={isSyncing}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition active:scale-95 shadow-sm ${
              isDark
                ? "bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700"
                : "bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200"
            }`}
            title="Muat data terbaru dari Google Sheets"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-emerald-500 ${isSyncing ? "animate-spin" : ""}`} />
            <span>{isSyncing ? "Menyinkronkan..." : "Sinkronkan"}</span>
          </button>

          <button
            onClick={() => {
              setCsvImportError("");
              setCsvText("");
              setIsUploadRsiModalOpen(true);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition active:scale-95 shadow-sm ${
              isDark
                ? "bg-teal-950/40 border-teal-800/60 text-teal-300 hover:bg-teal-900/50"
                : "bg-teal-50 border-teal-200 text-teal-700 hover:bg-teal-100"
            }`}
            title="Input atau upload data sheet RSI manual via CSV"
          >
            <Upload className="w-3.5 h-3.5 text-teal-500" />
            <span>Import RSI (CSV)</span>
          </button>

          <button
            onClick={handleDownloadCsv}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition active:scale-95 shadow-sm ${
              isDark
                ? "bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700"
                : "bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200"
            }`}
            title="Unduh data terfilter ke CSV"
          >
            <Download className="w-3.5 h-3.5 text-sky-500" />
            <span>Unduh CSV</span>
          </button>

          <button
            onClick={() => setIsConnectModalOpen(true)}
            className={`p-2 rounded-xl text-xs border transition active:scale-95 shadow-sm ${
              isDark
                ? "bg-slate-800 border-slate-700 text-slate-400 hover:text-white"
                : "bg-slate-100 border-slate-300 text-slate-600 hover:text-slate-900"
            }`}
            title="Pengaturan URL Web App & Script"
          >
            <Settings2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Sub-navigation Tabs: Pengiriman (RSUD & RSI) vs Biaya (EXPENSE) */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-2">
        <div className="flex items-center gap-2 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 shadow-inner">
          <button
            onClick={() => setFarmaTab("delivery")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition ${
              farmaTab === "delivery"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Truck className="w-4 h-4 text-sky-500" />
            <span>Pengiriman Obat (RSUD & RSI)</span>
            <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
              {records.length.toLocaleString("id-ID")}
            </span>
          </button>

          <button
            onClick={() => setFarmaTab("expense")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition ${
              farmaTab === "expense"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Receipt className="w-4 h-4 text-rose-500" />
            <span>Biaya & Pengeluaran (EXPENSE)</span>
            <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
              {expenses.length.toLocaleString("id-ID")}
            </span>
          </button>
        </div>

        <button
          onClick={() => setIsKodeModalOpen(true)}
          className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 ${
            isDark
              ? "bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700"
              : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
          }`}
        >
          <Code className="w-3.5 h-3.5 text-blue-500" />
          <span>Lihat Script (kode.gs)</span>
        </button>
      </div>

      {/* Sync Status Alert Banner */}
      {syncStatus && (
        <div
          className={`p-3 rounded-xl text-xs flex items-center justify-between gap-3 ${
            syncStatus.type === "success"
              ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
              : "bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400"
          }`}
        >
          <div className="flex items-center gap-2">
            {syncStatus.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            )}
            <span>{syncStatus.message}</span>
          </div>
          <button onClick={() => setSyncStatus(null)} className="p-1 hover:opacity-75">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {farmaTab === "expense" ? (
        <FarmaExpenseSection
          expenses={expenses}
          deliveryRecords={records}
          isSyncing={isSyncing}
          onRefresh={() => syncFromWebApp(undefined, true)}
          onOpenKodeModal={() => setIsKodeModalOpen(true)}
        />
      ) : (
        <div className="space-y-5">
          {/* Header info badge showing selected month */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">Periode Tampilan:</span>
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                {activeMonthLabel}
              </span>
            </div>
            {monthFilter !== "ALL" && (
              <button
                onClick={() => setMonthFilter("ALL")}
                className="text-xs text-slate-500 hover:text-emerald-500 underline transition cursor-pointer"
              >
                Tampilkan Semua Periode
              </button>
            )}
          </div>

          {/* 6 Executive KPI Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
        {/* Metric 1: Total Kiriman */}
        <div
          className={`p-4 rounded-2xl border shadow-sm transition ${
            isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-medium">Total Kiriman Farma</span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500">
              <PackageCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight">{metrics.total.toLocaleString("id-ID")}</span>
            <span className="text-[11px] text-slate-500">paket</span>
          </div>
          <div className="mt-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium truncate">
            {monthFilter === "ALL" ? "100% Pengiriman Terdata" : activeMonthLabel}
          </div>
        </div>

        {/* Metric 2: Total Revenue / Ongkir */}
        <div
          className={`p-4 rounded-2xl border shadow-sm transition ${
            isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-medium">Total Nilai Ongkir</span>
            <div className="p-1.5 rounded-lg bg-teal-500/10 text-teal-500">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-xl font-bold tracking-tight text-teal-600 dark:text-teal-400">
              {formatIDR(metrics.totalRevenue)}
            </span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Avg: {formatIDR(metrics.total > 0 ? Math.round(metrics.totalRevenue / metrics.total) : 0)} / paket
          </div>
        </div>

        {/* Metric 3: Pengiriman COD atau REGULER */}
        <div
          className={`p-4 rounded-2xl border shadow-sm transition ${
            isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-medium">
              {faskesFilter === "RSI BANJARNEGARA"
                ? "Layanan REGULER"
                : faskesFilter === "RSUD BANJARNEGARA"
                ? "Pengiriman COD"
                : "COD & REGULER"}
            </span>
            <div
              className={`p-1.5 rounded-lg ${
                faskesFilter === "RSI BANJARNEGARA"
                  ? "bg-sky-500/10 text-sky-500"
                  : "bg-amber-500/10 text-amber-500"
              }`}
            >
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span
              className={`text-2xl font-bold tracking-tight ${
                faskesFilter === "RSI BANJARNEGARA"
                  ? "text-sky-600 dark:text-sky-400"
                  : "text-amber-600 dark:text-amber-400"
              }`}
            >
              {faskesFilter === "RSI BANJARNEGARA"
                ? metrics.regulerCount.toLocaleString("id-ID")
                : faskesFilter === "RSUD BANJARNEGARA"
                ? metrics.codCount.toLocaleString("id-ID")
                : (metrics.codCount + metrics.regulerCount).toLocaleString("id-ID")}
            </span>
            <span className="text-[11px] text-slate-500">
              (
              {faskesFilter === "RSI BANJARNEGARA"
                ? metrics.regulerShare
                : faskesFilter === "RSUD BANJARNEGARA"
                ? metrics.codShare
                : metrics.total > 0
                ? (((metrics.codCount + metrics.regulerCount) / metrics.total) * 100).toFixed(1)
                : "0"}
              %)
            </span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500 truncate">
            {faskesFilter === "RSI BANJARNEGARA" ? (
              <>
                Nilai Ongkir:{" "}
                <strong className="text-sky-600 dark:text-sky-400">
                  {formatIDR(metrics.regulerRevenue)}
                </strong>
              </>
            ) : faskesFilter === "RSUD BANJARNEGARA" ? (
              <>
                Tertagih:{" "}
                <strong className="text-amber-600 dark:text-amber-400">
                  {formatIDR(metrics.codRevenue)}
                </strong>
              </>
            ) : (
              <span>
                COD RSUD: <strong>{metrics.codCount.toLocaleString("id-ID")}</strong> • RSI Reguler:{" "}
                <strong>{metrics.regulerCount.toLocaleString("id-ID")}</strong>
              </span>
            )}
          </div>
        </div>

        {/* Metric 4: Pengiriman GRATIS atau VIP */}
        <div
          className={`p-4 rounded-2xl border shadow-sm transition ${
            isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-medium">
              {faskesFilter === "RSI BANJARNEGARA"
                ? "Layanan VIP"
                : faskesFilter === "RSUD BANJARNEGARA"
                ? "Pengiriman GRATIS"
                : "GRATIS & VIP"}
            </span>
            <div
              className={`p-1.5 rounded-lg ${
                faskesFilter === "RSI BANJARNEGARA"
                  ? "bg-purple-500/10 text-purple-500"
                  : "bg-emerald-500/10 text-emerald-500"
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span
              className={`text-2xl font-bold tracking-tight ${
                faskesFilter === "RSI BANJARNEGARA"
                  ? "text-purple-600 dark:text-purple-400"
                  : "text-emerald-600 dark:text-emerald-400"
              }`}
            >
              {faskesFilter === "RSI BANJARNEGARA"
                ? metrics.vipCount.toLocaleString("id-ID")
                : faskesFilter === "RSUD BANJARNEGARA"
                ? metrics.gratisCount.toLocaleString("id-ID")
                : (metrics.gratisCount + metrics.vipCount).toLocaleString("id-ID")}
            </span>
            <span className="text-[11px] text-slate-500">
              (
              {faskesFilter === "RSI BANJARNEGARA"
                ? metrics.vipShare
                : faskesFilter === "RSUD BANJARNEGARA"
                ? metrics.gratisShare
                : metrics.total > 0
                ? (((metrics.gratisCount + metrics.vipCount) / metrics.total) * 100).toFixed(1)
                : "0"}
              %)
            </span>
          </div>
          <div className="mt-1 text-[11px] text-slate-500 truncate">
            {faskesFilter === "RSI BANJARNEGARA" ? (
              <>
                Nilai Ongkir:{" "}
                <strong className="text-purple-600 dark:text-purple-400">
                  {formatIDR(metrics.vipRevenue)}
                </strong>
              </>
            ) : faskesFilter === "RSUD BANJARNEGARA" ? (
              <>
                Subsidi Faskes:{" "}
                <strong className="text-emerald-600 dark:text-emerald-400">
                  {formatIDR(metrics.gratisRevenue)}
                </strong>
              </>
            ) : (
              <span>
                Gratis RSUD: <strong>{metrics.gratisCount.toLocaleString("id-ID")}</strong> • RSI VIP:{" "}
                <strong>{metrics.vipCount.toLocaleString("id-ID")}</strong>
              </span>
            )}
          </div>
        </div>

        {/* Metric 5: Kurir Teraktif */}
        <div
          className={`p-4 rounded-2xl border shadow-sm transition ${
            isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-medium">Kurir Teraktif</span>
            <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-500">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-lg font-bold tracking-tight truncate block">
              {metrics.topKurir}
            </span>
          </div>
          <div className="mt-1 text-[11px] text-purple-600 dark:text-purple-400 font-medium">
            {metrics.topKurirCount.toLocaleString("id-ID")} paket diantar
          </div>
        </div>

        {/* Metric 6: Wilayah / Kecamatan Top */}
        <div
          className={`p-4 rounded-2xl border shadow-sm transition ${
            isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-medium">Kecamatan Terbanyak</span>
            <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-500">
              <MapPin className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-lg font-bold tracking-tight truncate block">
              {metrics.topKec}
            </span>
          </div>
          <div className="mt-1 text-[11px] text-rose-600 dark:text-rose-400 font-medium">
            {metrics.topKecCount.toLocaleString("id-ID")} pengiriman
          </div>
        </div>
      </div>

      {/* Filter Control Center */}
      <div
        className={`p-4 sm:p-5 rounded-2xl border shadow-sm transition ${
          isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
        }`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari pasien, alamat, kecamatan, atau kurir..."
              className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-xs sm:text-sm border transition focus:outline-none focus:ring-2 focus:ring-emerald-500/40 ${
                isDark
                  ? "bg-slate-800/80 border-slate-700 text-white placeholder-slate-500"
                  : "bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400"
              }`}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Dropdowns & Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Faskes / Rumah Sakit Pill Selector */}
            <div
              className={`p-1 rounded-xl border flex items-center gap-1 text-xs ${
                isDark ? "bg-slate-800 border-slate-700" : "bg-slate-100 border-slate-200"
              }`}
            >
              {[
                { key: "ALL", label: "Semua RS", count: records.length },
                { key: "RSUD BANJARNEGARA", label: "RSUD", count: rsudCount },
                { key: "RSI BANJARNEGARA", label: "RSI", count: rsiCount },
              ].map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFaskesFilter(f.key as any)}
                  className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 ${
                    faskesFilter === f.key
                      ? f.key === "RSUD BANJARNEGARA"
                        ? "bg-blue-600 text-white shadow-sm font-semibold"
                        : f.key === "RSI BANJARNEGARA"
                        ? "bg-teal-600 text-white shadow-sm font-semibold"
                        : "bg-slate-900 text-white dark:bg-slate-200 dark:text-slate-900 shadow-sm font-semibold"
                      : isDark
                      ? "text-slate-400 hover:text-white"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                  title={f.key === "ALL" ? "Semua Faskes (RSUD & RSI)" : f.key}
                >
                  <span>{f.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                      faskesFilter === f.key
                        ? "bg-white/20 text-white"
                        : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    {f.count.toLocaleString("id-ID")}
                  </span>
                </button>
              ))}
            </div>

            {/* Payment Type Pill Selector */}
            <div
              className={`p-1 rounded-xl border flex items-center gap-1 text-xs ${
                isDark ? "bg-slate-800 border-slate-700" : "bg-slate-100 border-slate-200"
              }`}
            >
              {availablePaymentTypes.map((pType) => (
                <button
                  key={pType}
                  onClick={() => setPaymentFilter(pType)}
                  className={`px-3 py-1.5 rounded-lg font-medium transition ${
                    paymentFilter === pType
                      ? pType === "COD"
                        ? "bg-amber-500 text-white shadow-sm font-semibold"
                        : pType === "GRATIS"
                        ? "bg-emerald-500 text-white shadow-sm font-semibold"
                        : pType === "VIP"
                        ? "bg-purple-600 text-white shadow-sm font-semibold"
                        : pType === "REGULER"
                        ? "bg-sky-600 text-white shadow-sm font-semibold"
                        : "bg-slate-900 text-white dark:bg-slate-200 dark:text-slate-900 shadow-sm font-semibold"
                      : isDark
                      ? "text-slate-400 hover:text-white"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {pType === "ALL" ? "Semua Tipe" : pType}
                </button>
              ))}
            </div>

            {/* Month Filter */}
            <select
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className={`px-3 py-2 rounded-xl text-xs font-medium border transition focus:outline-none focus:ring-2 focus:ring-emerald-500/40 ${
                isDark
                  ? "bg-slate-800 border-slate-700 text-white"
                  : "bg-slate-50 border-slate-300 text-slate-700"
              }`}
            >
              <option value="ALL">Semua Bulan</option>
              {availableMonths.map((m) => (
                <option key={m.month} value={String(m.month)}>
                  {m.label}
                </option>
              ))}
            </select>

            {/* Kecamatan Filter */}
            <select
              value={kecamatanFilter}
              onChange={(e) => setKecamatanFilter(e.target.value)}
              className={`px-3 py-2 rounded-xl text-xs font-medium border transition focus:outline-none focus:ring-2 focus:ring-emerald-500/40 ${
                isDark
                  ? "bg-slate-800 border-slate-700 text-white"
                  : "bg-slate-50 border-slate-300 text-slate-700"
              }`}
            >
              <option value="ALL">Semua Kecamatan</option>
              {availableKecamatan.map((kec) => (
                <option key={kec} value={kec}>
                  {kec}
                </option>
              ))}
            </select>

            {/* Courier Filter */}
            <select
              value={courierFilter}
              onChange={(e) => setCourierFilter(e.target.value)}
              className={`px-3 py-2 rounded-xl text-xs font-medium border transition focus:outline-none focus:ring-2 focus:ring-emerald-500/40 ${
                isDark
                  ? "bg-slate-800 border-slate-700 text-white"
                  : "bg-slate-50 border-slate-300 text-slate-700"
              }`}
            >
              <option value="ALL">Semua Kurir</option>
              {availableCouriers.map((kurir) => (
                <option key={kurir} value={kurir}>
                  {kurir}
                </option>
              ))}
            </select>

            {/* Reset Filters */}
            {(paymentFilter !== "ALL" ||
              monthFilter !== "ALL" ||
              kecamatanFilter !== "ALL" ||
              courierFilter !== "ALL" ||
              searchQuery) && (
              <button
                onClick={() => {
                  setPaymentFilter("ALL");
                  setMonthFilter("ALL");
                  setKecamatanFilter("ALL");
                  setCourierFilter("ALL");
                  setSearchQuery("");
                }}
                className="p-2 rounded-xl border border-rose-500/30 text-rose-500 hover:bg-rose-500/10 text-xs font-medium transition"
                title="Reset Semua Filter"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <div>
            Menampilkan <strong className="text-emerald-500 font-semibold">{filteredRecords.length.toLocaleString("id-ID")}</strong> dari{" "}
            {records.length.toLocaleString("id-ID")} total pengiriman obat ({activeMonthLabel})
          </div>
          <div className="flex items-center gap-1.5 text-[11px]">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Terintegrasi API Apps Script</span>
          </div>
        </div>
      </div>

      {/* Visual Analytics Charts: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Tren Harian (Area Chart) */}
        <div
          className={`lg:col-span-2 p-5 rounded-2xl border shadow-sm transition ${
            isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                {faskesFilter === "RSI BANJARNEGARA"
                  ? "Tren Harian Pengiriman RSI (REGULER vs VIP)"
                  : faskesFilter === "RSUD BANJARNEGARA"
                  ? "Tren Harian Pengiriman RSUD (COD vs GRATIS)"
                  : "Tren Harian Pengiriman Farmasi"}
              </h3>
              <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                Volume paket obat yang dikirimkan per tanggal
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs font-medium">
              {(faskesFilter === "ALL" || faskesFilter === "RSUD BANJARNEGARA") && (
                <>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    COD
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    GRATIS
                  </span>
                </>
              )}
              {(faskesFilter === "ALL" || faskesFilter === "RSI BANJARNEGARA") && (
                <>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
                    REGULER
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                    VIP
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="h-[280px] w-full">
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="farmaCodGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="farmaGratisGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="farmaRegulerGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="farmaVipGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#334155" : "#e2e8f0"} opacity={0.5} />
                  <XAxis
                    dataKey="displayDate"
                    stroke={isDark ? "#94a3b8" : "#64748b"}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis stroke={isDark ? "#94a3b8" : "#64748b"} tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDark ? "#1e293b" : "#ffffff",
                      borderColor: isDark ? "#334155" : "#cbd5e1",
                      borderRadius: "0.75rem",
                      fontSize: "12px",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    }}
                  />
                  {(faskesFilter === "ALL" || faskesFilter === "RSUD BANJARNEGARA") && (
                    <>
                      <Area
                        type="monotone"
                        dataKey="COD"
                        name="COD"
                        stroke="#f59e0b"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#farmaCodGrad)"
                      />
                      <Area
                        type="monotone"
                        dataKey="GRATIS"
                        name="GRATIS"
                        stroke="#10b981"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#farmaGratisGrad)"
                      />
                    </>
                  )}
                  {(faskesFilter === "ALL" || faskesFilter === "RSI BANJARNEGARA") && (
                    <>
                      <Area
                        type="monotone"
                        dataKey="REGULER"
                        name="REGULER"
                        stroke="#0ea5e9"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#farmaRegulerGrad)"
                      />
                      <Area
                        type="monotone"
                        dataKey="VIP"
                        name="VIP"
                        stroke="#8b5cf6"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#farmaVipGrad)"
                      />
                    </>
                  )}
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Tidak ada data pada periode ini
              </div>
            )}
          </div>
        </div>

        {/* Chart 2: Proporsi Pembayaran (Donut Chart) */}
        <div
          className={`p-5 rounded-2xl border shadow-sm transition ${
            isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
          }`}
        >
          <div className="mb-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Coins className="w-4 h-4 text-teal-500" />
              Komposisi Pembayaran
            </h3>
            <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              {faskesFilter === "RSI BANJARNEGARA"
                ? "Proporsi paket REGULER vs VIP"
                : faskesFilter === "RSUD BANJARNEGARA"
                ? "Proporsi paket COD vs GRATIS"
                : "Distribusi tipe layanan antar RS"}
            </p>
          </div>

          <div className="h-[190px] w-full">
            {paymentShareData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentShareData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {paymentShareData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDark ? "#1e293b" : "#ffffff",
                      borderColor: isDark ? "#334155" : "#cbd5e1",
                      borderRadius: "0.75rem",
                      fontSize: "12px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Data kosong
              </div>
            )}
          </div>

          <div className="space-y-2 mt-2 pt-2 border-t border-slate-200 dark:border-slate-800 text-xs">
            {paymentShareData.map((item) => (
              <div key={item.name} className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span>
                    {item.name} (
                    {metrics.total > 0 ? ((item.value / metrics.total) * 100).toFixed(1) : "0"}%)
                  </span>
                </span>
                <strong style={{ color: item.color }}>{item.value.toLocaleString("id-ID")} pkt</strong>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Second Row of Charts: Kurir Leaderboard & Top Kecamatan */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 10 Kurir Terbanyak */}
        <div
          className={`p-5 rounded-2xl border shadow-sm transition ${
            isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Truck className="w-4 h-4 text-purple-500" />
                Produktivitas Kurir (Top 10)
              </h3>
              <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                Total paket obat diantar per kurir Paxel
              </p>
            </div>
          </div>

          <div className="h-[250px] w-full">
            {courierChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={courierChartData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 25 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#334155" : "#e2e8f0"} opacity={0.5} />
                  <XAxis
                    dataKey="name"
                    stroke={isDark ? "#94a3b8" : "#64748b"}
                    tick={{ fontSize: 10 }}
                    angle={-25}
                    textAnchor="end"
                    interval={0}
                  />
                  <YAxis stroke={isDark ? "#94a3b8" : "#64748b"} tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDark ? "#1e293b" : "#ffffff",
                      borderColor: isDark ? "#334155" : "#cbd5e1",
                      borderRadius: "0.75rem",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="total" name="Total Paket" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Data kosong
              </div>
            )}
          </div>
        </div>

        {/* Top Kecamatan Distribusi */}
        <div
          className={`p-5 rounded-2xl border shadow-sm transition ${
            isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <MapPin className="w-4 h-4 text-rose-500" />
                Distribusi Tujuan (Top 8 Kecamatan)
              </h3>
              <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                Wilayah dengan frekuensi pengiriman obat tertinggi
              </p>
            </div>
          </div>

          <div className="h-[250px] w-full">
            {kecamatanChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={kecamatanChartData}
                  layout="vertical"
                  margin={{ top: 10, right: 20, left: 40, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#334155" : "#e2e8f0"} opacity={0.5} />
                  <XAxis type="number" stroke={isDark ? "#94a3b8" : "#64748b"} tick={{ fontSize: 11 }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    stroke={isDark ? "#94a3b8" : "#64748b"}
                    tick={{ fontSize: 10 }}
                    width={90}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDark ? "#1e293b" : "#ffffff",
                      borderColor: isDark ? "#334155" : "#cbd5e1",
                      borderRadius: "0.75rem",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="count" name="Paket" fill="#06b6d4" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Data kosong
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Data Table */}
      <div
        className={`rounded-2xl border shadow-sm overflow-hidden transition ${
          isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
        }`}
      >
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-500" />
              Daftar Rincian Pengiriman Obat Paxel Farma
            </h3>
            <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
              Data historis pengantaran pasien, alamat tujuan, kurir Paxel, dan rincian ongkir
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Tampilkan:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition focus:outline-none ${
                isDark
                  ? "bg-slate-800 border-slate-700 text-white"
                  : "bg-slate-50 border-slate-300 text-slate-700"
              }`}
            >
              <option value={15}>15 baris</option>
              <option value={25}>25 baris</option>
              <option value={50}>50 baris</option>
              <option value={100}>100 baris</option>
            </select>
          </div>
        </div>

        {/* Responsive Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr
                className={`border-b uppercase font-semibold text-[11px] tracking-wider ${
                  isDark
                    ? "bg-slate-800/60 border-slate-800 text-slate-400"
                    : "bg-slate-50 border-slate-200 text-slate-600"
                }`}
              >
                <th className="py-3 px-4 w-12">No</th>
                <th className="py-3 px-4">Tanggal</th>
                <th className="py-3 px-4">Faskes / RS</th>
                <th className="py-3 px-4">Nama Pasien</th>
                <th className="py-3 px-4">Alamat</th>
                <th className="py-3 px-4">Kecamatan</th>
                <th className="py-3 px-4">Nama Kurir</th>
                <th className="py-3 px-4">Tipe Pembayaran</th>
                <th className="py-3 px-4 text-right">Ongkir</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {paginatedRows.length > 0 ? (
                paginatedRows.map((row, idx) => {
                  const itemIndex = (currentPage - 1) * pageSize + idx + 1;
                  const pType = String(row.paymentType || "").toUpperCase();
                  const isCod = pType === "COD";
                  const isGratis = pType === "GRATIS";
                  const isVip = pType === "VIP";
                  const isReguler = pType === "REGULER" || pType === "REGULAR";

                  let badgeStyle = "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30";
                  let dotStyle = "bg-sky-500";
                  if (isCod) {
                    badgeStyle = "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30";
                    dotStyle = "bg-amber-500";
                  } else if (isGratis) {
                    badgeStyle = "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30";
                    dotStyle = "bg-emerald-500";
                  } else if (isVip) {
                    badgeStyle = "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30";
                    dotStyle = "bg-purple-500";
                  } else if (isReguler) {
                    badgeStyle = "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30";
                    dotStyle = "bg-sky-500";
                  }

                  return (
                    <tr
                      key={row.id + "-" + idx}
                      className={`transition ${
                        isDark ? "hover:bg-slate-800/40" : "hover:bg-slate-50/80"
                      }`}
                    >
                      <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">{itemIndex}</td>
                      <td className="py-3 px-4 font-medium whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{formatDisplayDate(row.date, row.rawTimestamp)}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                            row.faskes?.includes("RSI")
                              ? "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/30"
                              : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              row.faskes?.includes("RSI") ? "bg-teal-500" : "bg-blue-500"
                            }`}
                          />
                          {row.faskes?.includes("RSI") ? "RSI" : "RSUD"}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">
                        {row.patientName}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400 max-w-xs truncate" title={row.address}>
                        {row.address || "-"}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-md font-medium text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {row.kecamatan}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-medium whitespace-nowrap text-slate-800 dark:text-slate-200">
                        <div className="flex items-center gap-1.5">
                          <Truck className="w-3.5 h-3.5 text-purple-400" />
                          <span>{row.courierName}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${badgeStyle}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${dotStyle}`} />
                          {row.paymentType}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                        {formatIDR(row.ongkir)}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="py-12 px-6 text-center">
                    {faskesFilter === "RSI BANJARNEGARA" && rsiCount === 0 ? (
                      <div className="max-w-md mx-auto flex flex-col items-center justify-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                          <AlertTriangle className="w-6 h-6" />
                        </div>
                        <div className="space-y-1">
                          <h4 className="font-semibold text-slate-800 dark:text-slate-100 text-sm">
                            Data Sheet RSI Belum Masuk dari Apps Script
                          </h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                            Web App Google Apps Script saat ini baru mengekspor 6.735 data dari sheet RSUD. Sheet RSI di spreadsheet Anda akan langsung tampil setelah Anda menerapkan deployment versi baru di Apps Script, atau Anda bisa langsung mengimpor data RSI melalui file/teks CSV.
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                          <button
                            onClick={() => setIsKodeModalOpen(true)}
                            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs flex items-center gap-1.5 transition shadow-sm"
                          >
                            <Code className="w-4 h-4" />
                            <span>Buka Kode Apps Script & Panduan</span>
                          </button>
                          <button
                            onClick={() => {
                              setCsvImportError("");
                              setCsvText("");
                              setIsUploadRsiModalOpen(true);
                            }}
                            className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-medium text-xs flex items-center gap-1.5 transition shadow-sm"
                          >
                            <Upload className="w-3.5 h-3.5" />
                            <span>Import RSI (CSV)</span>
                          </button>
                          <button
                            onClick={() => syncFromWebApp(undefined, true)}
                            className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-xs flex items-center gap-1.5 transition"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>Cek Ulang Sinkronisasi</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
                        <Search className="w-6 h-6 text-slate-400" />
                        <p>Tidak ditemukan data pengiriman yang cocok dengan filter.</p>
                      </div>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="text-slate-500">
            Halaman <strong>{currentPage}</strong> dari <strong>{totalPages}</strong> (Total{" "}
            {filteredRecords.length.toLocaleString("id-ID")} baris)
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className={`px-3 py-1.5 rounded-lg border flex items-center gap-1 transition ${
                currentPage === 1
                  ? "opacity-40 cursor-not-allowed border-transparent text-slate-400"
                  : isDark
                  ? "bg-slate-800 border-slate-700 hover:bg-slate-700 text-white"
                  : "bg-white border-slate-300 hover:bg-slate-100 text-slate-700"
              }`}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Sebelumnya</span>
            </button>

            <div className="flex items-center gap-1 px-1">
              {(() => {
                const maxButtons = 5;
                const count = Math.min(maxButtons, totalPages);
                let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
                let endPage = startPage + count - 1;

                if (endPage > totalPages) {
                  endPage = totalPages;
                  startPage = Math.max(1, endPage - count + 1);
                }

                const pages: number[] = [];
                for (let p = startPage; p <= endPage; p++) {
                  pages.push(p);
                }

                return pages.map((pNum) => (
                  <button
                    key={`page-${pNum}`}
                    onClick={() => setCurrentPage(pNum)}
                    className={`w-7 h-7 rounded-lg font-medium transition ${
                      currentPage === pNum
                        ? "bg-emerald-500 text-white font-bold"
                        : isDark
                        ? "text-slate-400 hover:bg-slate-800 hover:text-white"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    {pNum}
                  </button>
                ));
              })()}
            </div>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className={`px-3 py-1.5 rounded-lg border flex items-center gap-1 transition ${
                currentPage === totalPages
                  ? "opacity-40 cursor-not-allowed border-transparent text-slate-400"
                  : isDark
                  ? "bg-slate-800 border-slate-700 hover:bg-slate-700 text-white"
                  : "bg-white border-slate-300 hover:bg-slate-100 text-slate-700"
              }`}
            >
              <span>Berikutnya</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
        </div>
      )}

      {/* MODAL: Pengaturan Endpoint Google Apps Script & Kode Sumber */}
      <AnimatePresence>
        {isConnectModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              className={`w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden ${
                isDark ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"
              }`}
            >
              <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500">
                    <Link2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold">Integrasi Google Apps Script</h3>
                    <p className="text-xs text-slate-500">URL Web App terhubung otomatis seterusnya</p>
                  </div>
                </div>

                <button
                  onClick={() => setIsConnectModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 space-y-4 text-xs">
                <div>
                  <label className="block font-semibold mb-1.5 text-slate-700 dark:text-slate-300">
                    URL Aplikasi Web (Google Apps Script Web App URL)
                  </label>
                  <input
                    type="url"
                    value={webAppUrl}
                    onChange={(e) => setWebAppUrl(e.target.value)}
                    placeholder="https://script.google.com/macros/s/.../exec"
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-mono transition focus:outline-none focus:ring-2 focus:ring-emerald-500/40 ${
                      isDark
                        ? "bg-slate-800 border-slate-700 text-white placeholder-slate-500"
                        : "bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400"
                    }`}
                  />
                  <p className="mt-1.5 text-[11px] text-slate-500">
                    Endpoint aktif ini otomatis tersimpan dan digunakan setiap kali Anda membuka dashboard.
                  </p>
                </div>

                <div
                  className={`p-3.5 rounded-xl border ${
                    isDark ? "bg-slate-800/40 border-slate-800 text-slate-400" : "bg-slate-50 border-slate-200 text-slate-600"
                  }`}
                >
                  <div className="flex items-center gap-2 font-semibold text-emerald-600 dark:text-emerald-400 mb-1">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Status Endpoint Aktif:</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    Terhubung ke Web App Apps Script Anda dengan total <strong>{records.length.toLocaleString("id-ID")} transaksi</strong> pengiriman obat.
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => setIsKodeModalOpen(true)}
                    className="text-xs text-indigo-500 hover:text-indigo-600 font-semibold flex items-center gap-1.5"
                  >
                    <Code2 className="w-4 h-4" />
                    <span>Lihat / Salin Ulang Kode Apps Script (kode.gs)</span>
                  </button>
                </div>
              </div>

              <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setWebAppUrl(FARMA_DEFAULT_WEBAPP_URL);
                    localStorage.removeItem("paxel_farma_webapp_url");
                    syncFromWebApp(FARMA_DEFAULT_WEBAPP_URL, true);
                  }}
                  className={`px-3 py-2 rounded-xl text-xs font-medium border transition ${
                    isDark
                      ? "bg-slate-800 border-slate-700 text-slate-400 hover:text-white"
                      : "bg-white border-slate-300 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  Reset ke URL Default
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsConnectModalOpen(false)}
                    className="px-3 py-2 rounded-xl text-xs font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                  >
                    Tutup
                  </button>
                  <button
                    onClick={() => syncFromWebApp(webAppUrl, true)}
                    disabled={isSyncing}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 transition disabled:opacity-50"
                  >
                    {isSyncing ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Menyinkronkan...</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Simpan & Sinkronkan</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: Kode Google Apps Script (kode.gs) */}
      <AnimatePresence>
        {isKodeModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              className={`w-full max-w-3xl max-h-[85vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden ${
                isDark ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"
              }`}
            >
              <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-500">
                    <Code2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold">Google Apps Script (kode.gs)</h3>
                    <p className="text-xs text-slate-500">
                      Script integrasi otomatis dari Google Spreadsheet ke Dashboard Paxel Farma
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsKodeModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 overflow-y-auto space-y-4 text-xs">
                <div
                  className={`p-3.5 rounded-xl border flex items-start gap-3 ${
                    isDark ? "bg-indigo-950/30 border-indigo-800/40 text-indigo-200" : "bg-indigo-50 border-indigo-200 text-indigo-900"
                  }`}
                >
                  <Sparkles className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                  <div className="space-y-1.5 text-[11px] leading-relaxed">
                    <p className="font-bold text-xs text-indigo-900 dark:text-indigo-200">
                      ⚡ Cara Mengaktifkan Sheet RSUD, RSI & EXPENSE:
                    </p>
                    <ol className="list-decimal list-inside space-y-1 text-slate-700 dark:text-slate-300">
                      <li>Buka Google Spreadsheet Anda &gt; klik menu <strong>Ekstensi (Extensions)</strong> &gt; <strong>Apps Script</strong>.</li>
                      <li>Hapus semua kode lama di <code className="px-1 py-0.5 bg-slate-200 dark:bg-slate-800 rounded font-mono">kode.gs</code>, lalu tempelkan kode di bawah ini.</li>
                      <li>Simpan script (tekan <strong>Ctrl+S</strong>).</li>
                      <li>
                        <strong className="text-amber-600 dark:text-amber-400">Langkah Kunci:</strong> Di pojok kanan atas editor Apps Script, klik tombol biru <strong>Terapkan (Deploy)</strong> &gt; pilih <strong>Kelola deployment (Manage deployments)</strong>.
                      </li>
                      <li>
                        Klik ikon <strong>Pensil (Edit)</strong> pada deployment aktif, pada bagian <strong>Versi</strong> pilih <strong>"Versi baru" (New version)</strong>, lalu klik <strong>Terapkan (Deploy)</strong>.
                      </li>
                      <li>Kembali ke dashboard ini dan klik tombol <strong>"Sinkronkan"</strong>. Sheet RSUD, RSI, dan EXPENSE akan langsung terbaca otomatis 100%!</li>
                    </ol>
                  </div>
                </div>

                <div className="relative">
                  <div className="flex items-center justify-between px-4 py-2 bg-slate-800 text-slate-300 rounded-t-xl text-[11px] font-mono border-b border-slate-700">
                    <span>kode.gs (Mendukung Sheet RSUD, RSI & EXPENSE)</span>
                    <button
                      onClick={handleCopyScript}
                      className="px-2.5 py-1 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 font-sans font-semibold transition"
                    >
                      {copiedScript ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedScript ? "Tersalin!" : "Salin Seluruh Kode"}</span>
                    </button>
                  </div>
                  <pre className="p-4 bg-slate-950 text-emerald-400 font-mono text-[11px] rounded-b-xl overflow-x-auto max-h-[340px] leading-relaxed select-all">
                    {GOOGLE_APPS_SCRIPT_CODE}
                  </pre>
                </div>
              </div>

              <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end">
                <button
                  onClick={() => setIsKodeModalOpen(false)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold border transition ${
                    isDark
                      ? "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
                      : "bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  Tutup
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: Import Manual RSI (CSV / Tempel Teks) */}
      <AnimatePresence>
        {isUploadRsiModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              className={`w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden ${
                isDark ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-900"
              }`}
            >
              <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-500">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold">Import Data Sheet RSI BANJARNEGARA</h3>
                    <p className="text-xs text-slate-500">
                      Upload file CSV atau tempel (paste) baris data dari sheet RSI spreadsheet Anda
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsUploadRsiModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 overflow-y-auto space-y-4 text-xs">
                {/* File Upload drag & drop / button */}
                <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-6 text-center hover:border-teal-500 transition">
                  <FileText className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                  <p className="font-semibold text-slate-700 dark:text-slate-200">
                    Pilih File CSV Sheet RSI
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Export sheet RSI Anda sebagai CSV dari Google Sheets (File &gt; Download &gt; Comma-separated values)
                  </p>
                  <label className="mt-3 inline-block">
                    <input
                      type="file"
                      accept=".csv,text/csv,text/plain"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            const content = event.target?.result as string;
                            if (content) {
                              setCsvText(content);
                            }
                          };
                          reader.readAsText(file);
                        }
                      }}
                    />
                    <span className="px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs cursor-pointer shadow-sm transition">
                      Pilih File CSV
                    </span>
                  </label>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
                  <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
                    Atau Tempel Baris Data (Copy-Paste)
                  </span>
                  <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800" />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Tempel Teks Tabel Sheet RSI (CSV / TSV):
                  </label>
                  <textarea
                    value={csvText}
                    onChange={(e) => {
                      setCsvText(e.target.value);
                      setCsvImportError("");
                    }}
                    placeholder="Contoh:&#10;Timestamp,Nama Pasien,Alamat,Kecamatan,Nama Kurir,Jenis Pembayaran,Ongkir&#10;29/05/2026 10:15,Siti Aminah,Semampir,BANJARNEGARA,Budi Santoso,GRATIS,0&#10;29/05/2026 11:30,Ahmad Fauzi,Pucang,BAWANG,Slamet,COD,8000"
                    rows={7}
                    className={`w-full p-3 rounded-xl border font-mono text-[11px] outline-none transition ${
                      isDark
                        ? "bg-slate-950 border-slate-700 text-slate-200 focus:border-teal-500"
                        : "bg-slate-50 border-slate-300 text-slate-800 focus:border-teal-500"
                    }`}
                  />
                </div>

                {csvImportError && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{csvImportError}</span>
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <button
                  onClick={() => setIsUploadRsiModalOpen(false)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold border transition ${
                    isDark
                      ? "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
                      : "bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  Batal
                </button>
                <button
                  onClick={() => handleImportRsiCsv(csvText)}
                  disabled={!csvText.trim()}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white flex items-center gap-1.5 transition disabled:opacity-50 shadow-sm"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Proses & Masukkan ke Dashboard</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
