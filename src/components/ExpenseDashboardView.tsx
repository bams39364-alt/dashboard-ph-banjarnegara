import React, { useState, useMemo } from "react";
import {
  Receipt,
  Wallet,
  TrendingDown,
  BarChart3,
  Activity,
  RefreshCw,
  Search,
  Filter,
  Calendar,
  CreditCard,
  Building2,
  Tag,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Layers,
  FileSpreadsheet,
  AlertCircle,
  Clock,
  Sparkles,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  Cell,
} from "recharts";
import { SheetData, FilterState } from "../types";
import {
  extractExpenseStats,
  formatIDR,
  generateSampleExpenseRows,
  ExpenseTransactionItem,
} from "../utils/dataHelper";
import { useTheme } from "../context/ThemeContext";

interface ExpenseDashboardViewProps {
  expenseSheetData: SheetData | null;
  filters: FilterState;
  isLoading: boolean;
  onRefreshExpenseSheet: () => void;
}

export const ExpenseDashboardView: React.FC<ExpenseDashboardViewProps> = ({
  expenseSheetData,
  filters,
  isLoading,
  onRefreshExpenseSheet,
}) => {
  const { isDark } = useTheme();
  const [chartType, setChartType] = useState<"bar" | "area">("bar");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [sortField, setSortField] = useState<"date" | "amount" | "category">("date");
  const [sortAsc, setSortAsc] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Compute Expense Data & Stats (use sample rows if expense tab is not yet loaded or empty)
  const effectiveExpenseData = useMemo(() => {
    if (expenseSheetData && expenseSheetData.rows.length > 0) {
      return expenseSheetData;
    }
    const sample = generateSampleExpenseRows();
    return {
      spreadsheetId: expenseSheetData?.spreadsheetId || "demo-expense",
      spreadsheetTitle: "PH BANJARNEGARA - EXPENSE",
      sheets: [{ sheetId: 0, title: "EXPENSE" }],
      activeSheetTitle: "EXPENSE",
      headers: sample.headers,
      rows: sample.rows,
      rawValues: [],
    };
  }, [expenseSheetData]);

  const expenseStats = useMemo(() => {
    return extractExpenseStats(
      effectiveExpenseData.rows,
      effectiveExpenseData.headers,
      filters
    );
  }, [effectiveExpenseData, filters]);

  // Filter & search transaction items
  const filteredTransactions = useMemo(() => {
    return expenseStats.transactions.filter((tx) => {
      // Category filter
      if (selectedCategory !== "all" && tx.category !== selectedCategory) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchDesc = tx.description.toLowerCase().includes(q);
        const matchCat = tx.category.toLowerCase().includes(q);
        const matchVendor = tx.vendor.toLowerCase().includes(q);
        const matchPay = tx.paymentMethod.toLowerCase().includes(q);
        const matchDate = tx.formattedDate.toLowerCase().includes(q);
        const matchAmount = String(tx.amount).includes(q);
        return matchDesc || matchCat || matchVendor || matchPay || matchDate || matchAmount;
      }
      return true;
    });
  }, [expenseStats.transactions, selectedCategory, searchQuery]);

  // Sorted items
  const sortedTransactions = useMemo(() => {
    const list = [...filteredTransactions];
    list.sort((a, b) => {
      if (sortField === "amount") {
        return sortAsc ? a.amount - b.amount : b.amount - a.amount;
      }
      if (sortField === "category") {
        return sortAsc
          ? a.category.localeCompare(b.category)
          : b.category.localeCompare(a.category);
      }
      // Default: date sort
      const res = a.formattedDate.localeCompare(b.formattedDate);
      return sortAsc ? res : -res;
    });
    return list;
  }, [filteredTransactions, sortField, sortAsc]);

  // Pagination
  const totalPages = Math.ceil(sortedTransactions.length / pageSize) || 1;
  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedTransactions.slice(start, start + pageSize);
  }, [sortedTransactions, currentPage, pageSize]);

  // Toggle sort
  const handleSort = (field: "date" | "amount" | "category") => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const isUsingSampleFallback = !expenseSheetData || expenseSheetData.rows.length === 0;

  return (
    <div className="space-y-6">
      {/* 1. Header Card */}
      <div
        className={`border rounded-2xl p-4 sm:p-6 shadow-sm transition-colors ${
          isDark
            ? "bg-[#0b1118] border-slate-800/90"
            : "bg-white border-slate-200"
        }`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-inner ${
                isDark
                  ? "bg-rose-500/10 border border-rose-500/30 text-rose-400"
                  : "bg-rose-50 border border-rose-200 text-rose-600"
              }`}
            >
              <Receipt className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-extrabold tracking-tight">
                  DATA & ANALITIK EXPENSE
                </h2>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-mono border font-medium ${
                    isDark
                      ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                      : "bg-rose-50 text-rose-700 border-rose-200"
                  }`}
                >
                  SHEET: EXPENSE
                </span>
              </div>
              <p
                className={`text-xs mt-0.5 ${
                  isDark ? "text-slate-400" : "text-slate-500"
                }`}
              >
                Monitoring seluruh pengeluaran PH Banjarnegara
              </p>
            </div>
          </div>

          {/* Top Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Chart Mode */}
            <div
              className={`flex items-center p-0.5 rounded-lg text-xs border ${
                isDark
                  ? "bg-slate-900 border-slate-800"
                  : "bg-slate-100 border-slate-200"
              }`}
            >
              <button
                onClick={() => setChartType("bar")}
                className={`px-2.5 py-1 rounded-md transition font-medium flex items-center gap-1.5 ${
                  chartType === "bar"
                    ? isDark
                      ? "bg-rose-500/20 text-rose-300 font-semibold"
                      : "bg-rose-500 text-white font-semibold shadow-sm"
                    : isDark
                    ? "text-slate-400 hover:text-slate-200"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Batang</span>
              </button>
              <button
                onClick={() => setChartType("area")}
                className={`px-2.5 py-1 rounded-md transition font-medium flex items-center gap-1.5 ${
                  chartType === "area"
                    ? isDark
                      ? "bg-rose-500/20 text-rose-300 font-semibold"
                      : "bg-rose-500 text-white font-semibold shadow-sm"
                    : isDark
                    ? "text-slate-400 hover:text-slate-200"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Area</span>
              </button>
            </div>

            {/* Refresh Sheet EXPENSE */}
            <button
              onClick={onRefreshExpenseSheet}
              disabled={isLoading}
              className={`p-2 rounded-xl border text-xs transition flex items-center justify-center gap-1.5 font-medium ${
                isDark
                  ? "bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300 hover:text-white"
                  : "bg-white hover:bg-slate-50 border-slate-200 text-slate-700 hover:text-slate-900 shadow-sm"
              }`}
              title="Muat Ulang Data Sheet EXPENSE"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${
                  isLoading ? "animate-spin text-rose-500" : ""
                }`}
              />
              <span className="hidden sm:inline">Refresh Data</span>
            </button>
          </div>
        </div>

        {/* Fallback Notice if using template */}
        {isUsingSampleFallback && (
          <div
            className={`mt-4 p-3 rounded-xl border text-xs flex items-center gap-2.5 ${
              isDark
                ? "bg-amber-950/20 border-amber-500/30 text-amber-300"
                : "bg-amber-50 border-amber-200 text-amber-800"
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
            <span>
              Menampilkan format standar operasional sheet <strong>EXPENSE</strong>. Data akan otomatis terhubung ke tab <strong>"EXPENSE"</strong> di Google Spreadsheet Anda saat disinkronkan.
            </span>
          </div>
        )}
      </div>

      {/* 2. Top Summary Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Total Expense */}
        <div
          className={`border rounded-2xl p-4 flex flex-col justify-between shadow-sm transition-colors ${
            isDark
              ? "bg-[#0b1118] border-slate-800/90"
              : "bg-white border-slate-200"
          }`}
        >
          <div className="flex items-center justify-between text-xs mb-2">
            <span
              className={`font-medium ${
                isDark ? "text-slate-400" : "text-slate-500"
              }`}
            >
              Total Pengeluaran
            </span>
            <div
              className={`p-1.5 rounded-lg ${
                isDark
                  ? "bg-rose-500/10 text-rose-400"
                  : "bg-rose-50 text-rose-600 border border-rose-100"
              }`}
            >
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-lg sm:text-2xl font-black tracking-tight text-rose-500">
              {formatIDR(expenseStats.grandTotalExpense)}
            </div>
            <div
              className={`text-[11px] mt-1 flex items-center gap-1 ${
                isDark ? "text-slate-400" : "text-slate-500"
              }`}
            >
              <span>{expenseStats.totalTransactions} transaksi tercatat</span>
            </div>
          </div>
        </div>

        {/* Avg Expense / Day */}
        <div
          className={`border rounded-2xl p-4 flex flex-col justify-between shadow-sm transition-colors ${
            isDark
              ? "bg-[#0b1118] border-slate-800/90"
              : "bg-white border-slate-200"
          }`}
        >
          <div className="flex items-center justify-between text-xs mb-2">
            <span
              className={`font-medium ${
                isDark ? "text-slate-400" : "text-slate-500"
              }`}
            >
              Rata-rata / Hari
            </span>
            <div
              className={`p-1.5 rounded-lg ${
                isDark
                  ? "bg-amber-500/10 text-amber-400"
                  : "bg-amber-50 text-amber-600 border border-amber-100"
              }`}
            >
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-lg sm:text-2xl font-black tracking-tight">
              {formatIDR(expenseStats.avgExpensePerDay)}
            </div>
            <div
              className={`text-[11px] mt-1 flex items-center gap-1 ${
                isDark ? "text-slate-400" : "text-slate-500"
              }`}
            >
              <span>{expenseStats.activeDaysCount} hari pengeluaran aktif</span>
            </div>
          </div>
        </div>

        {/* Avg / Transaction */}
        <div
          className={`border rounded-2xl p-4 flex flex-col justify-between shadow-sm transition-colors ${
            isDark
              ? "bg-[#0b1118] border-slate-800/90"
              : "bg-white border-slate-200"
          }`}
        >
          <div className="flex items-center justify-between text-xs mb-2">
            <span
              className={`font-medium ${
                isDark ? "text-slate-400" : "text-slate-500"
              }`}
            >
              Rata-rata / Transaksi
            </span>
            <div
              className={`p-1.5 rounded-lg ${
                isDark
                  ? "bg-indigo-500/10 text-indigo-400"
                  : "bg-indigo-50 text-indigo-600 border border-indigo-100"
              }`}
            >
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-lg sm:text-2xl font-black tracking-tight">
              {formatIDR(expenseStats.avgExpensePerTransaction)}
            </div>
            <div
              className={`text-[11px] mt-1 flex items-center gap-1 ${
                isDark ? "text-slate-400" : "text-slate-500"
              }`}
            >
              <span>{expenseStats.categoryBreakdown.length} kategori biaya</span>
            </div>
          </div>
        </div>

        {/* Peak Expense */}
        <div
          className={`border rounded-2xl p-4 flex flex-col justify-between shadow-sm transition-colors ${
            isDark
              ? "bg-[#0b1118] border-slate-800/90"
              : "bg-white border-slate-200"
          }`}
        >
          <div className="flex items-center justify-between text-xs mb-2">
            <span
              className={`font-medium ${
                isDark ? "text-slate-400" : "text-slate-500"
              }`}
            >
              Pengeluaran Terbesar
            </span>
            <div
              className={`p-1.5 rounded-lg ${
                isDark
                  ? "bg-rose-500/10 text-rose-400"
                  : "bg-rose-50 text-rose-600 border border-rose-100"
              }`}
            >
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-lg sm:text-2xl font-black tracking-tight text-amber-500 truncate">
              {expenseStats.largestTransaction
                ? formatIDR(expenseStats.largestTransaction.amount)
                : "-"}
            </div>
            <div
              className={`text-[11px] mt-1 truncate ${
                isDark ? "text-slate-400" : "text-slate-500"
              }`}
            >
              {expenseStats.largestTransaction
                ? `${expenseStats.largestTransaction.category}`
                : "-"}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Analytics Chart & Category Breakdown Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Expense Trend Chart (2 Cols) */}
        <div
          className={`lg:col-span-2 border rounded-2xl p-4 sm:p-6 shadow-sm flex flex-col justify-between transition-colors ${
            isDark
              ? "bg-[#0b1118] border-slate-800/90"
              : "bg-white border-slate-200"
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h3 className="text-sm font-bold tracking-tight">
                Tren Pengeluaran Harian
              </h3>
              <p
                className={`text-xs ${
                  isDark ? "text-slate-400" : "text-slate-500"
                }`}
              >
                Fluktuasi biaya operasional berdasarkan tanggal transaksi
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`text-xs px-2.5 py-1 rounded-lg border font-medium ${
                  isDark
                    ? "bg-slate-900 border-slate-800 text-slate-300"
                    : "bg-slate-50 border-slate-200 text-slate-600"
                }`}
              >
                Rata-rata: {formatIDR(expenseStats.avgExpensePerDay)}
              </span>
            </div>
          </div>

          {/* Chart Rendering */}
          <div className="h-72 w-full pt-2">
            {expenseStats.dailyData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">
                Tidak ada data pengeluaran untuk filter periode ini
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                {chartType === "bar" ? (
                  <BarChart
                    data={expenseStats.dailyData}
                    margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={isDark ? "#1e293b" : "#e2e8f0"}
                      vertical={false}
                    />
                    <XAxis
                      dataKey="shortDate"
                      stroke={isDark ? "#64748b" : "#94a3b8"}
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke={isDark ? "#64748b" : "#94a3b8"}
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) =>
                        v >= 1000000 ? `${(v / 1000000).toFixed(1)}jt` : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v
                      }
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div
                              className={`p-3 rounded-xl border shadow-xl text-xs space-y-1 ${
                                isDark
                                  ? "bg-slate-900/95 border-slate-700 text-white"
                                  : "bg-white/95 border-slate-200 text-slate-900 shadow-md"
                              }`}
                            >
                              <div className="font-bold text-rose-500">
                                {data.fullFormattedDate || data.formattedDate}
                              </div>
                              <div className="flex items-center justify-between gap-4 font-mono font-semibold">
                                <span>Total Biaya:</span>
                                <span>{formatIDR(data.totalAmount)}</span>
                              </div>
                              <div
                                className={`text-[11px] ${
                                  isDark ? "text-slate-400" : "text-slate-500"
                                }`}
                              >
                                {data.count} transaksi • Kategori dominan: {data.topCategory}
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <ReferenceLine
                      y={expenseStats.avgExpensePerDay}
                      stroke="#f59e0b"
                      strokeDasharray="4 4"
                      label={{
                        value: "Rata-rata",
                        fill: "#f59e0b",
                        fontSize: 10,
                        position: "insideTopRight",
                      }}
                    />
                    <Bar
                      dataKey="totalAmount"
                      radius={[4, 4, 0, 0]}
                      fill="#f43f5e"
                    >
                      {expenseStats.dailyData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={
                            entry.totalAmount === expenseStats.peakDay?.totalAmount
                              ? "#e11d48"
                              : "#fb7185"
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                ) : (
                  <AreaChart
                    data={expenseStats.dailyData}
                    margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="expenseAreaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={isDark ? "#1e293b" : "#e2e8f0"}
                      vertical={false}
                    />
                    <XAxis
                      dataKey="shortDate"
                      stroke={isDark ? "#64748b" : "#94a3b8"}
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke={isDark ? "#64748b" : "#94a3b8"}
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) =>
                        v >= 1000000 ? `${(v / 1000000).toFixed(1)}jt` : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v
                      }
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div
                              className={`p-3 rounded-xl border shadow-xl text-xs space-y-1 ${
                                isDark
                                  ? "bg-slate-900/95 border-slate-700 text-white"
                                  : "bg-white/95 border-slate-200 text-slate-900 shadow-md"
                              }`}
                            >
                              <div className="font-bold text-rose-500">
                                {data.fullFormattedDate || data.formattedDate}
                              </div>
                              <div className="flex items-center justify-between gap-4 font-mono font-semibold">
                                <span>Total Biaya:</span>
                                <span>{formatIDR(data.totalAmount)}</span>
                              </div>
                              <div
                                className={`text-[11px] ${
                                  isDark ? "text-slate-400" : "text-slate-500"
                                }`}
                              >
                                {data.count} transaksi • Kategori: {data.topCategory}
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <ReferenceLine
                      y={expenseStats.avgExpensePerDay}
                      stroke="#f59e0b"
                      strokeDasharray="4 4"
                    />
                    <Area
                      type="monotone"
                      dataKey="totalAmount"
                      stroke="#f43f5e"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#expenseAreaGrad)"
                    />
                  </AreaChart>
                )}
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Right: Kategori Pengeluaran Breakdown (1 Col) */}
        <div
          className={`border rounded-2xl p-4 sm:p-6 shadow-sm flex flex-col justify-between transition-colors ${
            isDark
              ? "bg-[#0b1118] border-slate-800/90"
              : "bg-white border-slate-200"
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold tracking-tight">
                Distribusi Kategori Biaya
              </h3>
              <span
                className={`text-[11px] px-2 py-0.5 rounded-full border ${
                  isDark
                    ? "bg-slate-900 border-slate-800 text-slate-400"
                    : "bg-slate-100 border-slate-200 text-slate-600"
                }`}
              >
                {expenseStats.categoryBreakdown.length} Kategori
              </span>
            </div>

            {/* List breakdown */}
            <div className="space-y-3.5 max-h-72 overflow-y-auto pr-1">
              {expenseStats.categoryBreakdown.map((cat, idx) => (
                <div key={idx} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 truncate pr-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: cat.color || "#f43f5e" }}
                      />
                      <span className="font-semibold truncate">{cat.category}</span>
                      <span
                        className={`text-[10px] ${
                          isDark ? "text-slate-500" : "text-slate-400"
                        }`}
                      >
                        ({cat.count}x)
                      </span>
                    </div>
                    <div className="font-mono font-bold text-right shrink-0">
                      {formatIDR(cat.totalAmount)}
                    </div>
                  </div>
                  {/* Progress Bar */}
                  <div
                    className={`w-full h-1.5 rounded-full overflow-hidden ${
                      isDark ? "bg-slate-800" : "bg-slate-100"
                    }`}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, Math.max(3, cat.percentage))}%`,
                        backgroundColor: cat.color || "#f43f5e",
                      }}
                    />
                  </div>
                  <div
                    className={`text-[10px] text-right ${
                      isDark ? "text-slate-500" : "text-slate-400"
                    }`}
                  >
                    {cat.percentage.toFixed(1)}% dari total
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Payment Method Badges footer */}
          <div
            className={`mt-4 pt-3 border-t flex items-center justify-between text-xs flex-wrap gap-2 ${
              isDark ? "border-slate-800/80" : "border-slate-100"
            }`}
          >
            <span
              className={`text-[11px] font-medium ${
                isDark ? "text-slate-400" : "text-slate-500"
              }`}
            >
              Metode:
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {expenseStats.paymentMethodBreakdown.map((pm, idx) => (
                <span
                  key={idx}
                  className={`px-2 py-0.5 rounded-md text-[10px] border font-medium ${
                    isDark
                      ? "bg-slate-900 border-slate-800 text-slate-300"
                      : "bg-slate-100 border-slate-200 text-slate-700"
                  }`}
                >
                  {pm.method}: {pm.percentage.toFixed(0)}%
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Interactive Transaction Table */}
      <div
        className={`border rounded-2xl p-4 sm:p-6 shadow-sm space-y-4 transition-colors ${
          isDark
            ? "bg-[#0b1118] border-slate-800/90"
            : "bg-white border-slate-200"
        }`}
      >
        {/* Table Top Toolbar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold tracking-tight">
              Rincian Transaksi Pengeluaran
            </h3>
            <p
              className={`text-xs ${
                isDark ? "text-slate-400" : "text-slate-500"
              }`}
            >
              Daftar nota, kuitansi operasional, dan mutasi biaya pengeluaran
            </p>
          </div>

          {/* Search & Category Filter */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Search Input */}
            <div className="relative">
              <Search
                className={`w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 ${
                  isDark ? "text-slate-500" : "text-slate-400"
                }`}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Cari keterangan / vendor..."
                className={`pl-8 pr-3 py-1.5 rounded-xl border text-xs outline-none transition w-48 sm:w-60 ${
                  isDark
                    ? "bg-slate-900 border-slate-800 focus:border-rose-500 text-white placeholder-slate-500"
                    : "bg-slate-50 border-slate-200 focus:border-rose-500 text-slate-900 placeholder-slate-400"
                }`}
              />
            </div>

            {/* Category Dropdown */}
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl border text-xs outline-none font-medium cursor-pointer transition ${
                isDark
                  ? "bg-slate-900 border-slate-800 text-slate-300 focus:border-rose-500"
                  : "bg-slate-50 border-slate-200 text-slate-700 focus:border-rose-500"
              }`}
            >
              <option value="all">Semua Kategori ({expenseStats.transactions.length})</option>
              {expenseStats.categoriesList.map((cat, idx) => (
                <option key={idx} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto rounded-xl border border-slate-800/80">
          <table className="w-full text-xs text-left">
            <thead
              className={`font-semibold border-b ${
                isDark
                  ? "bg-slate-900/90 text-slate-400 border-slate-800"
                  : "bg-slate-100 text-slate-600 border-slate-200"
              }`}
            >
              <tr>
                <th
                  onClick={() => handleSort("date")}
                  className="px-4 py-3 cursor-pointer hover:text-white transition"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Tanggal</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort("category")}
                  className="px-4 py-3 cursor-pointer hover:text-white transition"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Kategori</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="px-4 py-3">Keterangan / Uraian</th>
                <th className="px-4 py-3">Vendor / PIC</th>
                <th className="px-4 py-3">Metode Bayar</th>
                <th
                  onClick={() => handleSort("amount")}
                  className="px-4 py-3 text-right cursor-pointer hover:text-white transition"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Nominal (Rp)</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody
              className={`divide-y ${
                isDark
                  ? "divide-slate-800/60 text-slate-300"
                  : "divide-slate-200 text-slate-800"
              }`}
            >
              {paginatedTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    Tidak ditemukan data pengeluaran yang sesuai dengan pencarian
                  </td>
                </tr>
              ) : (
                paginatedTransactions.map((tx) => (
                  <tr
                    key={tx.id}
                    className={`transition-colors ${
                      isDark ? "hover:bg-slate-800/40" : "hover:bg-slate-50"
                    }`}
                  >
                    <td className="px-4 py-3 whitespace-nowrap font-medium">
                      {tx.formattedDate}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${
                          isDark
                            ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                            : "bg-rose-50 text-rose-700 border-rose-200"
                        }`}
                      >
                        {tx.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 max-w-xs truncate font-medium">
                      {tx.description}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-400">
                      {tx.vendor}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-400">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                          isDark
                            ? "bg-slate-900 border-slate-800 text-slate-400"
                            : "bg-slate-100 border-slate-200 text-slate-600"
                        }`}
                      >
                        {tx.paymentMethod}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right font-mono font-bold text-rose-500">
                      {formatIDR(tx.amount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination & Count footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs">
          <div
            className={`${
              isDark ? "text-slate-400" : "text-slate-500"
            }`}
          >
            Menampilkan{" "}
            <span className="font-semibold text-rose-500">
              {filteredTransactions.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}
            </span>{" "}
            -{" "}
            <span className="font-semibold text-rose-500">
              {Math.min(currentPage * pageSize, filteredTransactions.length)}
            </span>{" "}
            dari <span className="font-semibold">{filteredTransactions.length}</span> transaksi
          </div>

          {/* Prev / Next buttons */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className={`p-1.5 rounded-lg border transition disabled:opacity-30 disabled:cursor-not-allowed ${
                isDark
                  ? "bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-300"
                  : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700 shadow-sm"
              }`}
              title="Halaman Sebelumnya"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 font-semibold">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className={`p-1.5 rounded-lg border transition disabled:opacity-30 disabled:cursor-not-allowed ${
                isDark
                  ? "bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-300"
                  : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700 shadow-sm"
              }`}
              title="Halaman Selanjutnya"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
