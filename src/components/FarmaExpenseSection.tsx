import React, { useState, useMemo } from "react";
import {
  Wallet,
  TrendingDown,
  TrendingUp,
  Receipt,
  Users,
  Package,
  Calendar,
  Search,
  Filter,
  ArrowUpDown,
  Download,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  PieChart as PieChartIcon,
  BarChart3,
  LineChart as LineChartIcon,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowUpRight,
  RotateCcw,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  PieChart,
  Pie,
  Legend,
} from "recharts";
import { FarmaExpenseRecord, FarmaDeliveryRecord } from "../types";
import { useTheme } from "../context/ThemeContext";

interface FarmaExpenseSectionProps {
  expenses: FarmaExpenseRecord[];
  deliveryRecords: FarmaDeliveryRecord[];
  isSyncing: boolean;
  onRefresh: () => void;
  onOpenKodeModal: () => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  "Incentive Hero": "#3b82f6", // Blue
  "BBM Armada": "#f59e0b", // Amber
  "BBM & Transport": "#f59e0b",
  "Operasional Farma": "#10b981", // Emerald
  "Operasional & Konsumsi": "#10b981",
  "Perlengkapan Packing": "#8b5cf6", // Purple
  "Perlengkapan & Plastik Obat": "#8b5cf6",
  "Parkir & Retribusi": "#ec4899", // Pink
  "Lain-lain": "#64748b", // Slate
};

function formatIDR(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDateIndo(dateStr: string): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

export const FarmaExpenseSection: React.FC<FarmaExpenseSectionProps> = ({
  expenses,
  deliveryRecords,
  isSyncing,
  onRefresh,
  onOpenKodeModal,
}) => {
  const { isDark } = useTheme();

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  // Default to current month (e.g. 2026-9) if data exists
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    const currentKey = `${now.getFullYear()}-${now.getMonth() + 1}`;
    const hasCurrent =
      expenses.some((e) => `${e.year}-${e.month}` === currentKey) ||
      deliveryRecords.some((d) => `${d.year}-${d.month}` === currentKey);
    return hasCurrent ? currentKey : "ALL";
  });
  const [sortField, setSortField] = useState<"date" | "nominal">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Active chart view
  const [chartMode, setChartMode] = useState<"daily" | "courier">("daily");

  // Unique categories list
  const categoryOptions = useMemo(() => {
    const set = new Set<string>();
    expenses.forEach((e) => {
      if (e.category) set.add(e.category);
    });
    return Array.from(set).sort();
  }, [expenses]);

  // Unique months list combined from both expenses and delivery records
  const monthOptions = useMemo(() => {
    const map = new Map<string, { key: string; label: string; year: number; month: number }>();
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth() + 1;

    const addMonth = (year?: number, month?: number) => {
      if (year && month) {
        const key = `${year}-${month}`;
        if (!map.has(key)) {
          const dateObj = new Date(year, month - 1, 1);
          let label = dateObj.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
          if (year === curYear && month === curMonth) {
            label += " (Bulan Ini)";
          }
          map.set(key, { key, label, year, month });
        }
      }
    };

    expenses.forEach((e) => addMonth(e.year, e.month));
    deliveryRecords.forEach((d) => addMonth(d.year, d.month));

    return Array.from(map.values()).sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });
  }, [expenses, deliveryRecords]);

  // If selectedMonth is not in available options after new data loads, fallback gracefully
  React.useEffect(() => {
    if (selectedMonth !== "ALL" && monthOptions.length > 0) {
      const exists = monthOptions.some((m) => m.key === selectedMonth);
      if (!exists) {
        setSelectedMonth(monthOptions[0].key);
      }
    }
  }, [monthOptions, selectedMonth]);

  // Active month label
  const selectedMonthLabel = useMemo(() => {
    if (selectedMonth === "ALL") return "Semua Periode";
    const found = monthOptions.find((m) => m.key === selectedMonth);
    return found ? found.label : selectedMonth;
  }, [selectedMonth, monthOptions]);

  // Delivery records filtered by selected month for accurate Net Profit calculation
  const filteredDeliveries = useMemo(() => {
    if (selectedMonth === "ALL") return deliveryRecords;
    const [y, m] = selectedMonth.split("-");
    return deliveryRecords.filter((d) => {
      if (d.year && d.month) {
        return String(d.year) === y && String(d.month) === m;
      }
      if (d.date) {
        const parts = d.date.split("-");
        if (parts.length >= 2) {
          return parts[0] === y && String(parseInt(parts[1], 10)) === m;
        }
      }
      return false;
    });
  }, [deliveryRecords, selectedMonth]);

  // Delivery revenue (omset ongkir RSUD & RSI) for selected month
  const totalOmsetDelivery = useMemo(() => {
    return filteredDeliveries.reduce((acc, cur) => acc + (cur.ongkir || 0), 0);
  }, [filteredDeliveries]);

  // Filtered Expense Records
  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const descMatch = (e.description || "").toLowerCase().includes(q);
        const catMatch = (e.category || "").toLowerCase().includes(q);
        const dateMatch = (e.date || "").toLowerCase().includes(q);
        if (!descMatch && !catMatch && !dateMatch) return false;
      }

      // Category
      if (selectedCategory !== "ALL" && e.category !== selectedCategory) {
        return false;
      }

      // Month
      if (selectedMonth !== "ALL") {
        const [y, m] = selectedMonth.split("-");
        if (String(e.year) !== y || String(e.month) !== m) {
          return false;
        }
      }

      return true;
    });
  }, [expenses, searchQuery, selectedCategory, selectedMonth]);

  // Sorted Records
  const sortedExpenses = useMemo(() => {
    return [...filteredExpenses].sort((a, b) => {
      if (sortField === "nominal") {
        return sortOrder === "asc" ? a.nominal - b.nominal : b.nominal - a.nominal;
      } else {
        // Date sort
        const timeA = new Date(a.date).getTime() || 0;
        const timeB = new Date(b.date).getTime() || 0;
        return sortOrder === "asc" ? timeA - timeB : timeB - timeA;
      }
    });
  }, [filteredExpenses, sortField, sortOrder]);

  // Paginated Rows
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedExpenses.slice(start, start + pageSize);
  }, [sortedExpenses, currentPage, pageSize]);

  const totalPages = Math.ceil(sortedExpenses.length / pageSize) || 1;

  // Aggregate Metrics
  const metrics = useMemo(() => {
    let totalNominal = 0;
    let heroIncentive = 0;
    let bbm = 0;
    let operasional = 0;
    let perlengkapan = 0;

    filteredExpenses.forEach((e) => {
      const nom = e.nominal || 0;
      totalNominal += nom;

      const catUpper = (e.category || "").toUpperCase();
      if (catUpper.includes("INCENTIVE") || catUpper.includes("HERO")) {
        heroIncentive += nom;
      } else if (catUpper.includes("BBM") || catUpper.includes("TRANSPORT")) {
        bbm += nom;
      } else if (catUpper.includes("PACKING") || catUpper.includes("PLASTIK") || catUpper.includes("PERLENGKAPAN")) {
        perlengkapan += nom;
      } else {
        operasional += nom;
      }
    });

    // Net Margin = Omset Ongkir Farma (Filtered by Month) - Total Pengeluaran (Filtered by Month)
    const netProfit = totalOmsetDelivery - totalNominal;
    const profitMargin = totalOmsetDelivery > 0 ? (netProfit / totalOmsetDelivery) * 100 : 0;

    return {
      totalNominal,
      heroIncentive,
      bbm,
      operasional,
      perlengkapan,
      transactionCount: filteredExpenses.length,
      deliveryCount: filteredDeliveries.length,
      avgPerTrx: filteredExpenses.length > 0 ? Math.round(totalNominal / filteredExpenses.length) : 0,
      netProfit,
      profitMargin,
    };
  }, [filteredExpenses, filteredDeliveries, totalOmsetDelivery]);

  // Breakdown by Category for Donut Chart
  const categoryChartData = useMemo(() => {
    const catMap = new Map<string, number>();
    filteredExpenses.forEach((e) => {
      const c = e.category || "Lain-lain";
      catMap.set(c, (catMap.get(c) || 0) + e.nominal);
    });

    return Array.from(catMap.entries())
      .map(([name, value]) => ({
        name,
        value,
        color: CATEGORY_COLORS[name] || "#64748b",
      }))
      .sort((a, b) => b.value - a.value);
  }, [filteredExpenses]);

  // Trend Chart (Daily aggregated)
  const dailyTrendData = useMemo(() => {
    const dateMap = new Map<string, { date: string; nominal: number; incentive: number; bbm: number; ops: number }>();

    filteredExpenses.forEach((e) => {
      const d = e.date || "2026-06-01";
      if (!dateMap.has(d)) {
        dateMap.set(d, { date: d, nominal: 0, incentive: 0, bbm: 0, ops: 0 });
      }
      const item = dateMap.get(d)!;
      item.nominal += e.nominal;

      const catU = (e.category || "").toUpperCase();
      if (catU.includes("INCENTIVE") || catU.includes("HERO")) {
        item.incentive += e.nominal;
      } else if (catU.includes("BBM")) {
        item.bbm += e.nominal;
      } else {
        item.ops += e.nominal;
      }
    });

    const arr = Array.from(dateMap.values()).sort((a, b) => a.date.localeCompare(b.date));
    // Limit to latest 30 dates if no month filter, otherwise show all
    if (selectedMonth === "ALL" && arr.length > 30) {
      return arr.slice(arr.length - 30);
    }
    return arr;
  }, [filteredExpenses, selectedMonth]);

  // Courier/Hero Incentive ranking
  const courierIncentiveData = useMemo(() => {
    const heroMap = new Map<string, number>();

    filteredExpenses.forEach((e) => {
      const catU = (e.category || "").toUpperCase();
      if (catU.includes("INCENTIVE") || catU.includes("HERO")) {
        const name = (e.description || "Hero Lain").trim();
        heroMap.set(name, (heroMap.get(name) || 0) + e.nominal);
      }
    });

    return Array.from(heroMap.entries())
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [filteredExpenses]);

  // Export CSV
  const exportCsv = () => {
    const header = "ID,Tanggal,Kategori,Deskripsi,Nominal\n";
    const body = sortedExpenses
      .map((r) => `"${r.id}","${r.date}","${r.category}","${(r.description || "").replace(/"/g, '""')}","${r.nominal}"`)
      .join("\n");

    const blob = new Blob([header + body], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `paxel_farma_expense_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isFilterActive = selectedMonth !== "ALL" || selectedCategory !== "ALL" || searchQuery.trim() !== "";

  return (
    <div className="space-y-6">
      {/* 1. TOP FILTER BAR: Diletakkan di atas agar laba bersih per bulan langsung terlihat */}
      <div
        className={`p-4 sm:p-5 rounded-2xl border shadow-sm transition ${
          isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
        }`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-rose-500/10 text-rose-500 shrink-0">
                <Filter className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base">
                Filter Analitik Pengeluaran & Laba
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                {selectedMonthLabel}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Filter bulan mengatur perhitungan Laba Bersih, Omset Pengiriman, serta grafik tren pengeluaran secara terpadu.
            </p>
          </div>

          {/* Filter Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Month Filter Dropdown */}
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold shadow-sm transition ${
                isDark
                  ? "bg-slate-800 border-slate-700 text-slate-200 focus-within:border-rose-500"
                  : "bg-slate-50 border-slate-300 text-slate-800 focus-within:border-rose-500"
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-rose-500 shrink-0" />
              <select
                value={selectedMonth}
                onChange={(e) => {
                  setSelectedMonth(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-transparent outline-none cursor-pointer text-xs font-medium"
                title="Pilih Bulan untuk Analisis Laba Bersih"
              >
                <option value="ALL" className={isDark ? "bg-slate-800 text-white" : "bg-white text-slate-900"}>
                  Semua Bulan (All Time)
                </option>
                {monthOptions.map((m) => (
                  <option
                    key={m.key}
                    value={m.key}
                    className={isDark ? "bg-slate-800 text-white" : "bg-white text-slate-900"}
                  >
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Category Filter Dropdown */}
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold shadow-sm transition ${
                isDark
                  ? "bg-slate-800 border-slate-700 text-slate-200 focus-within:border-rose-500"
                  : "bg-slate-50 border-slate-300 text-slate-800 focus-within:border-rose-500"
              }`}
            >
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-transparent outline-none cursor-pointer text-xs font-medium"
              >
                <option value="ALL" className={isDark ? "bg-slate-800 text-white" : "bg-white text-slate-900"}>
                  Semua Kategori ({categoryOptions.length})
                </option>
                {categoryOptions.map((c) => (
                  <option
                    key={c}
                    value={c}
                    className={isDark ? "bg-slate-800 text-white" : "bg-white text-slate-900"}
                  >
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Search Box */}
            <div className="relative min-w-[170px] sm:min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari transaksi / hero..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className={`w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border transition outline-none ${
                  isDark
                    ? "bg-slate-800 border-slate-700 text-slate-200 placeholder-slate-500 focus:border-rose-500"
                    : "bg-slate-50 border-slate-300 text-slate-800 placeholder-slate-400 focus:border-rose-500"
                }`}
              />
            </div>

            {/* Reset Button */}
            {isFilterActive && (
              <button
                onClick={() => {
                  setSelectedMonth("ALL");
                  setSelectedCategory("ALL");
                  setSearchQuery("");
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition active:scale-95 ${
                  isDark
                    ? "bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20"
                    : "bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100"
                }`}
                title="Reset semua filter"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}

            {/* Export CSV Button */}
            <button
              onClick={exportCsv}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition active:scale-95 shadow-sm ${
                isDark
                  ? "bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700"
                  : "bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200"
              }`}
              title="Download Data Pengeluaran CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. 3 EXECUTIVE METRIC CARDS (KARD BBM & TRANSPORT DIHAPUS, LABA BERSIH MENGIKUTI FILTER BULAN) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Metric 1: Total Pengeluaran */}
        <div
          className={`p-5 rounded-2xl border shadow-sm transition ${
            isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Total Beban Pengeluaran</span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-500">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl sm:text-3xl font-black tracking-tight text-rose-600 dark:text-rose-400">
            {formatIDR(metrics.totalNominal)}
          </div>
          <div className="mt-3 text-xs text-slate-500 flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
            <span>{metrics.transactionCount.toLocaleString("id-ID")} Transaksi Biaya</span>
            <span className="font-semibold">Rata-rata: {formatIDR(metrics.avgPerTrx)}</span>
          </div>
        </div>

        {/* Metric 2: Incentive Hero */}
        <div
          className={`p-5 rounded-2xl border shadow-sm transition ${
            isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Incentive Hero (Kurir)</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl sm:text-3xl font-black tracking-tight text-blue-600 dark:text-blue-400">
            {formatIDR(metrics.heroIncentive)}
          </div>
          <div className="mt-3 text-xs text-slate-500 flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
            <span>Porsi Terhadap Pengeluaran</span>
            <span className="font-bold text-blue-600 dark:text-blue-400">
              {metrics.totalNominal > 0 ? ((metrics.heroIncentive / metrics.totalNominal) * 100).toFixed(1) : "0"}%
            </span>
          </div>
        </div>

        {/* Metric 3: Laba Bersih Operasional (Mengikuti Filter Bulan) */}
        <div
          className={`p-5 rounded-2xl border shadow-sm transition ${
            isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold uppercase tracking-wider text-[11px]">Laba Bersih Operasional</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                {selectedMonth === "ALL" ? "All Time" : selectedMonthLabel.split(" ")[0]}
              </span>
            </div>
            <div
              className={`p-2 rounded-xl ${
                metrics.netProfit >= 0 ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
              }`}
            >
              {metrics.netProfit >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            </div>
          </div>
          <div
            className={`mt-3 text-2xl sm:text-3xl font-black tracking-tight ${
              metrics.netProfit >= 0
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-rose-600 dark:text-rose-400"
            }`}
          >
            {formatIDR(metrics.netProfit)}
          </div>
          <div className="mt-3 text-xs text-slate-500 flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
            <span>
              Omset ({metrics.deliveryCount} pkt): <strong className="text-slate-800 dark:text-slate-200">{formatIDR(totalOmsetDelivery)}</strong>
            </span>
            <span
              className={`font-bold px-2 py-0.5 rounded-full text-[11px] ${
                metrics.profitMargin >= 0
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                  : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
              }`}
            >
              Margin {metrics.profitMargin.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* Visual Analytics Grid: Trend & Category Composition */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left 2 Cols: Trend or Courier Ranking */}
        <div
          className={`lg:col-span-2 p-5 rounded-2xl border shadow-sm flex flex-col justify-between ${
            isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 text-sm sm:text-base">
                <LineChartIcon className="w-4 h-4 text-rose-500" />
                {chartMode === "daily"
                  ? `Grafik Garis Tren Pengeluaran (${selectedMonthLabel})`
                  : `Incentive Per Hero / Kurir (${selectedMonthLabel})`}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {chartMode === "daily"
                  ? "Pergerakan garis beban total pengeluaran dan incentive hero harian"
                  : "Akumulasi nilai incentive yang diterima hero kurir"}
              </p>
            </div>

            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setChartMode("daily")}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
                  chartMode === "daily"
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                Grafik Line
              </button>
              <button
                onClick={() => setChartMode("courier")}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
                  chartMode === "courier"
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                Hero Kurir
              </button>
            </div>
          </div>

          <div className="h-64 sm:h-72 w-full">
            {chartMode === "daily" ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyTrendData} margin={{ top: 10, right: 15, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "#334155" : "#e2e8f0"} />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: isDark ? "#94a3b8" : "#64748b", fontSize: 10 }}
                    tickFormatter={(val) => {
                      const parts = val.split("-");
                      return parts.length === 3 ? `${parts[2]}/${parts[1]}` : val;
                    }}
                  />
                  <YAxis
                    tick={{ fill: isDark ? "#94a3b8" : "#64748b", fontSize: 10 }}
                    tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`}
                    width={45}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDark ? "#0f172a" : "#ffffff",
                      borderColor: isDark ? "#1e293b" : "#cbd5e1",
                      borderRadius: "12px",
                      fontSize: "12px",
                      boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
                    }}
                    formatter={(val: any) => [formatIDR(Number(val)), "Nominal"]}
                    labelFormatter={(label) => `Tanggal: ${formatDateIndo(String(label))}`}
                  />
                  <Legend
                    verticalAlign="top"
                    height={32}
                    formatter={(value) => (
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 mr-2">
                        {value}
                      </span>
                    )}
                  />
                  <Line
                    type="monotone"
                    dataKey="nominal"
                    name="Total Biaya"
                    stroke="#f43f5e"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: "#f43f5e", strokeWidth: 1 }}
                    activeDot={{ r: 6, stroke: "#ffffff", strokeWidth: 2 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="incentive"
                    name="Incentive Hero"
                    stroke="#3b82f6"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: "#3b82f6", strokeWidth: 1 }}
                    activeDot={{ r: 6, stroke: "#ffffff", strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={courierIncentiveData} layout="vertical" margin={{ top: 10, right: 20, left: 40, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={isDark ? "#334155" : "#e2e8f0"} />
                  <XAxis
                    type="number"
                    tick={{ fill: isDark ? "#94a3b8" : "#64748b", fontSize: 10 }}
                    tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fill: isDark ? "#94a3b8" : "#64748b", fontSize: 11, fontWeight: 600 }}
                    width={70}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDark ? "#0f172a" : "#ffffff",
                      borderColor: isDark ? "#1e293b" : "#cbd5e1",
                      borderRadius: "12px",
                      fontSize: "12px",
                    }}
                    formatter={(val: any) => [formatIDR(Number(val)), "Incentive"]}
                  />
                  <Bar dataKey="total" name="Incentive" radius={[0, 8, 8, 0]}>
                    {courierIncentiveData.map((_, idx) => (
                      <Cell key={`cell-${idx}`} fill={idx === 0 ? "#3b82f6" : idx === 1 ? "#06b6d4" : "#6366f1"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Right 1 Col: Donut Composition */}
        <div
          className={`p-5 rounded-2xl border shadow-sm flex flex-col justify-between ${
            isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
          }`}
        >
          <div>
            <h3 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 text-sm sm:text-base">
              <PieChartIcon className="w-4 h-4 text-blue-500" />
              Komposisi Kategori Biaya
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Proporsi pengeluaran operasional Farma</p>

            <div className="h-48 w-full mt-2 relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryChartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={46}
                    outerRadius={68}
                    paddingAngle={3}
                  >
                    {categoryChartData.map((entry, index) => (
                      <Cell key={`slice-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDark ? "#0f172a" : "#ffffff",
                      borderColor: isDark ? "#1e293b" : "#cbd5e1",
                      borderRadius: "10px",
                      fontSize: "11px",
                    }}
                    formatter={(val: any) => [formatIDR(Number(val)), "Total"]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[10px] text-slate-400 font-medium">Total</span>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  {(metrics.totalNominal / 1000000).toFixed(1)}M
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2 mt-2 border-t border-slate-100 dark:border-slate-800 pt-3">
            {categoryChartData.slice(0, 4).map((cat) => {
              const pct = metrics.totalNominal > 0 ? ((cat.value / metrics.totalNominal) * 100).toFixed(1) : "0";
              return (
                <div key={cat.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 truncate max-w-[150px]">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                    <span className="truncate text-slate-700 dark:text-slate-300 font-medium">{cat.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="font-bold text-slate-800 dark:text-slate-100">{formatIDR(cat.value)}</span>
                    <span className="text-[10px] text-slate-400 font-semibold w-9 text-right">({pct}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Expense Filter Controls & Table Card */}
      <div
        className={`rounded-2xl border shadow-sm overflow-hidden ${
          isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
        }`}
      >
        {/* Table Header Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-emerald-500" />
              Daftar Transaksi Pengeluaran (Sheet EXPENSE)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Menampilkan {sortedExpenses.length.toLocaleString("id-ID")} dari {expenses.length.toLocaleString("id-ID")} transaksi tercatat ({selectedMonthLabel})
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium border border-slate-200 dark:border-slate-700">
              Filter Bulan: <strong className="text-slate-800 dark:text-slate-100">{selectedMonthLabel}</strong>
            </span>
            {selectedCategory !== "ALL" && (
              <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium border border-slate-200 dark:border-slate-700">
                Kategori: <strong className="text-slate-800 dark:text-slate-100">{selectedCategory}</strong>
              </span>
            )}
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr
                className={`border-b font-semibold tracking-wide uppercase text-[10px] ${
                  isDark
                    ? "bg-slate-800/60 border-slate-800 text-slate-400"
                    : "bg-slate-50 border-slate-200 text-slate-500"
                }`}
              >
                <th className="py-3 px-4 w-12 text-center">No</th>
                <th
                  onClick={() => {
                    if (sortField === "date") setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
                    else {
                      setSortField("date");
                      setSortOrder("desc");
                    }
                  }}
                  className="py-3 px-4 cursor-pointer hover:text-slate-900 dark:hover:text-white transition whitespace-nowrap"
                >
                  <div className="flex items-center gap-1">
                    <span>Tanggal</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-4 whitespace-nowrap">Kategori (KET)</th>
                <th className="py-3 px-4">Deskripsi / Penerima</th>
                <th
                  onClick={() => {
                    if (sortField === "nominal") setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
                    else {
                      setSortField("nominal");
                      setSortOrder("desc");
                    }
                  }}
                  className="py-3 px-4 text-right cursor-pointer hover:text-slate-900 dark:hover:text-white transition whitespace-nowrap"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Nominal (Rp)</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {paginatedRows.length > 0 ? (
                paginatedRows.map((item, idx) => {
                  const globalIdx = (currentPage - 1) * pageSize + idx + 1;
                  const catUpper = (item.category || "").toUpperCase();
                  const isIncentive = catUpper.includes("INCENTIVE") || catUpper.includes("HERO");
                  const isBbm = catUpper.includes("BBM");
                  const isPacking = catUpper.includes("PACKING") || catUpper.includes("PLASTIK") || catUpper.includes("PERLENGKAPAN");

                  let badgeColor = "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20";
                  if (isIncentive) {
                    badgeColor = "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
                  } else if (isBbm) {
                    badgeColor = "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
                  } else if (isPacking) {
                    badgeColor = "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20";
                  }

                  return (
                    <tr
                      key={item.id || idx}
                      className={`transition ${
                        isDark ? "hover:bg-slate-800/40" : "hover:bg-slate-50"
                      }`}
                    >
                      <td className="py-3 px-4 text-center text-slate-400 font-medium whitespace-nowrap">
                        {globalIdx}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap font-medium text-slate-700 dark:text-slate-300">
                        {formatDateIndo(item.date)}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${badgeColor}`}>
                          {item.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">
                        {item.description}
                      </td>
                      <td className="py-3 px-4 text-right font-black text-slate-900 dark:text-slate-100 whitespace-nowrap">
                        {formatIDR(item.nominal)}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <AlertCircle className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                    <p className="font-semibold">Tidak ada data transaksi pengeluaran</p>
                    <p className="text-xs mt-1">Coba ubah kata kunci pencarian atau filter kategori di atas</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {sortedExpenses.length > 0 && (
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <span>Tampilkan per halaman:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className={`px-2 py-1 rounded-lg border text-xs outline-none ${
                  isDark ? "bg-slate-800 border-slate-700 text-slate-200" : "bg-slate-50 border-slate-300 text-slate-700"
                }`}
              >
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={30}>30</option>
                <option value={50}>50</option>
              </select>
              <span>• Total: {sortedExpenses.length.toLocaleString("id-ID")} Baris</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-400">
                Halaman {currentPage} dari {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className={`p-1.5 rounded-lg border transition disabled:opacity-30 disabled:cursor-not-allowed ${
                  isDark ? "bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-300" : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700"
                }`}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className={`p-1.5 rounded-lg border transition disabled:opacity-30 disabled:cursor-not-allowed ${
                  isDark ? "bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-300" : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700"
                }`}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
