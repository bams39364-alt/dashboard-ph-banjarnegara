import React, { useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  ComposedChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  BarChart3,
  Percent,
  Package,
  DollarSign,
  Layers,
  Filter,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Building2,
} from "lucide-react";
import { SheetData, FilterState } from "../types";
import {
  extractRowDateInfo,
  getRowTotalPayment,
  formatIDR,
  findWilayahColumn,
  MONTH_NAMES_ID,
} from "../utils/dataHelper";
import { useTheme } from "../context/ThemeContext";

interface MonthOverMonthComparisonCardProps {
  sheetData: SheetData;
  filters?: FilterState;
}

export interface MonthlyStatsItem {
  monthKey: string; // e.g. "2025-01"
  year: number;
  month: number;
  monthShort: string; // e.g. "Jan '25"
  monthFull: string; // e.g. "Januari 2025"
  monthName: string; // e.g. "Januari"
  totalRevenue: number;
  totalCount: number;
  activeDays: number;
  avgRevenuePerDay: number;
  avgRevenuePerTx: number;
  // MoM metrics
  momRevenueDelta: number; // current - prev
  momRevenuePercent: number; // ((current - prev) / prev) * 100
  momCountDelta: number;
  momCountPercent: number;
  isPositiveGrowth: boolean;
  isFirstMonth: boolean;
}

const MONTH_SHORT_MAP: Record<number, string> = {
  1: "Jan",
  2: "Feb",
  3: "Mar",
  4: "Apr",
  5: "Mei",
  6: "Jun",
  7: "Jul",
  8: "Agu",
  9: "Sep",
  10: "Okt",
  11: "Nov",
  12: "Des",
};

const MONTH_FULL_MAP: Record<number, string> = {
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

export const MonthOverMonthComparisonCard: React.FC<MonthOverMonthComparisonCardProps> = ({
  sheetData,
  filters,
}) => {
  const { isDark } = useTheme();
  const { headers, rows } = sheetData;

  // Local filter for comparison: specific year or all years
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [selectedWilayah, setSelectedWilayah] = useState<string>(filters?.wilayah || "all");
  const [chartMetric, setChartMetric] = useState<"revenue" | "growth" | "volume" | "dual">("dual");

  // Wilayah column detection & unique list
  const wilayahCol = useMemo(() => findWilayahColumn(headers), [headers]);
  const wilayahList = useMemo(() => {
    if (!wilayahCol) return [];
    const set = new Set<string>();
    rows.forEach((r) => {
      const val = String(r[wilayahCol] || "").trim();
      if (val && val !== "-" && val !== "null") set.add(val);
    });
    return Array.from(set).sort();
  }, [rows, wilayahCol]);

  // Extract all available years from rows
  const availableYears = useMemo(() => {
    const yearSet = new Set<number>();
    rows.forEach((r) => {
      const dateInfo = extractRowDateInfo(r, headers);
      if (dateInfo.year && dateInfo.year >= 2000 && dateInfo.year <= 2100) {
        yearSet.add(dateInfo.year);
      }
    });
    return Array.from(yearSet).sort((a, b) => b - a);
  }, [rows, headers]);

  // Aggregate monthly statistics across rows
  const monthlyData = useMemo(() => {
    if (rows.length === 0) return [];

    // Map: "YYYY-MM" -> { revenue, count, daysSet: Set<day> }
    const rawMonthMap: Record<
      string,
      {
        year: number;
        month: number;
        revenue: number;
        count: number;
        daysSet: Set<number>;
      }
    > = {};

    rows.forEach((row) => {
      // Filter by Wilayah if selected
      if (selectedWilayah !== "all" && wilayahCol) {
        const rowWil = String(row[wilayahCol] || "").trim();
        if (rowWil !== selectedWilayah) return;
      }

      const dateInfo = extractRowDateInfo(row, headers);
      const rowPayment = getRowTotalPayment(row, headers);

      // We need valid year and month
      if (dateInfo.year && dateInfo.month) {
        // Filter by Year if selected
        if (selectedYear !== "all" && String(dateInfo.year) !== selectedYear) {
          return;
        }

        const key = `${dateInfo.year}-${String(dateInfo.month).padStart(2, "0")}`;
        if (!rawMonthMap[key]) {
          rawMonthMap[key] = {
            year: dateInfo.year,
            month: dateInfo.month,
            revenue: 0,
            count: 0,
            daysSet: new Set<number>(),
          };
        }

        rawMonthMap[key].revenue += rowPayment;
        rawMonthMap[key].count += 1;
        if (dateInfo.day) {
          rawMonthMap[key].daysSet.add(dateInfo.day);
        }
      }
    });

    // Sort chronologically
    const sortedKeys = Object.keys(rawMonthMap).sort();

    // Convert to rich MonthlyStatsItem with MoM calculations
    const result: MonthlyStatsItem[] = [];

    sortedKeys.forEach((key, index) => {
      const item = rawMonthMap[key];
      const activeDays = item.daysSet.size > 0 ? item.daysSet.size : 1;
      const prevItem = index > 0 ? result[index - 1] : null;

      let momRevenueDelta = 0;
      let momRevenuePercent = 0;
      let momCountDelta = 0;
      let momCountPercent = 0;
      const isFirstMonth = prevItem === null;

      if (prevItem && prevItem.totalRevenue > 0) {
        momRevenueDelta = item.revenue - prevItem.totalRevenue;
        momRevenuePercent = (momRevenueDelta / prevItem.totalRevenue) * 100;
      } else if (prevItem) {
        momRevenueDelta = item.revenue;
        momRevenuePercent = item.revenue > 0 ? 100 : 0;
      }

      if (prevItem && prevItem.totalCount > 0) {
        momCountDelta = item.count - prevItem.totalCount;
        momCountPercent = (momCountDelta / prevItem.totalCount) * 100;
      }

      const shortName = MONTH_SHORT_MAP[item.month] || `Bln ${item.month}`;
      const fullName = MONTH_FULL_MAP[item.month] || `Bulan ${item.month}`;
      const yrShort = String(item.year).slice(-2);

      result.push({
        monthKey: key,
        year: item.year,
        month: item.month,
        monthShort: `${shortName} '${yrShort}`,
        monthFull: `${fullName} ${item.year}`,
        monthName: fullName,
        totalRevenue: item.revenue,
        totalCount: item.count,
        activeDays,
        avgRevenuePerDay: Math.round(item.revenue / activeDays),
        avgRevenuePerTx: item.count > 0 ? Math.round(item.revenue / item.count) : 0,
        momRevenueDelta,
        momRevenuePercent: Number(momRevenuePercent.toFixed(1)),
        momCountDelta,
        momCountPercent: Number(momCountPercent.toFixed(1)),
        isPositiveGrowth: momRevenueDelta >= 0,
        isFirstMonth,
      });
    });

    return result;
  }, [rows, headers, selectedYear, selectedWilayah, wilayahCol]);

  // Key KPI Summary Insights
  const summaryInsights = useMemo(() => {
    if (monthlyData.length === 0) {
      return {
        totalRevenuePeriod: 0,
        totalCountPeriod: 0,
        avgRevenueMonthly: 0,
        peakMonth: null as MonthlyStatsItem | null,
        bestGrowthMonth: null as MonthlyStatsItem | null,
        latestMonth: null as MonthlyStatsItem | null,
      };
    }

    const totalRev = monthlyData.reduce((acc, m) => acc + m.totalRevenue, 0);
    const totalCnt = monthlyData.reduce((acc, m) => acc + m.totalCount, 0);
    const avgMonthly = Math.round(totalRev / monthlyData.length);

    // Peak month by revenue
    let peak = monthlyData[0];
    monthlyData.forEach((m) => {
      if (m.totalRevenue > peak.totalRevenue) peak = m;
    });

    // Best growth month (excluding first baseline month)
    const growthMonths = monthlyData.filter((m) => !m.isFirstMonth);
    let bestGrowth = growthMonths.length > 0 ? growthMonths[0] : null;
    growthMonths.forEach((m) => {
      if (bestGrowth && m.momRevenuePercent > bestGrowth.momRevenuePercent) {
        bestGrowth = m;
      }
    });

    const latest = monthlyData[monthlyData.length - 1];

    return {
      totalRevenuePeriod: totalRev,
      totalCountPeriod: totalCnt,
      avgRevenueMonthly: avgMonthly,
      peakMonth: peak,
      bestGrowthMonth: bestGrowth,
      latestMonth: latest,
    };
  }, [monthlyData]);

  // Calculate Average Monthly Revenue for Reference Line
  const averageMonthlyRevenue = summaryInsights.avgRevenueMonthly;

  return (
    <div className="space-y-6">
      {/* 1. HEADER & CONTROL BAR */}
      <div
        className={`border rounded-2xl p-5 sm:p-6 shadow-sm transition-colors ${
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
                  ? "bg-indigo-500/10 border border-indigo-500/30 text-indigo-400"
                  : "bg-indigo-50 border border-indigo-200 text-indigo-600"
              }`}
            >
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-extrabold tracking-tight">
                  PERBANDINGAN BULAN KE BULAN (MoM)
                </h2>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono border font-semibold ${
                    isDark
                      ? "bg-indigo-500/10 text-indigo-300 border-indigo-500/30"
                      : "bg-indigo-50 text-indigo-700 border-indigo-200"
                  }`}
                >
                  MONTH-OVER-MONTH ANALYSIS
                </span>
              </div>
              <p
                className={`text-xs mt-0.5 ${
                  isDark ? "text-slate-400" : "text-slate-500"
                }`}
              >
                Analisis komparasi omset revenue, volume transaksi, dan laju pertumbuhan antar bulan
              </p>
            </div>
          </div>

          {/* Filters: Tahun & Wilayah */}
          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
            {/* Filter Tahun */}
            <div className="flex items-center gap-1.5 text-xs flex-1 sm:flex-initial">
              <span className={`text-[11px] font-medium ${isDark ? "text-slate-400" : "text-slate-500"}`}>Tahun:</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className={`w-full sm:w-auto border rounded-xl px-3 py-1.5 text-xs font-semibold focus:outline-none transition cursor-pointer ${
                  isDark
                    ? "bg-slate-950 border-slate-700 text-white focus:border-indigo-500"
                    : "bg-slate-50 border-slate-300 text-slate-900 shadow-xs focus:border-indigo-500"
                }`}
              >
                <option value="all">Semua Tahun</option>
                {availableYears.map((yr) => (
                  <option key={yr} value={String(yr)}>
                    Tahun {yr}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter Wilayah */}
            {wilayahList.length > 0 && (
              <div className="flex items-center gap-1.5 text-xs flex-1 sm:flex-initial">
                <span className={`text-[11px] font-medium ${isDark ? "text-slate-400" : "text-slate-500"}`}>Wilayah:</span>
                <select
                  value={selectedWilayah}
                  onChange={(e) => setSelectedWilayah(e.target.value)}
                  className={`w-full sm:w-auto border rounded-xl px-3 py-1.5 text-xs font-semibold focus:outline-none transition cursor-pointer max-w-[170px] truncate ${
                    isDark
                      ? "bg-slate-950 border-slate-700 text-white focus:border-indigo-500"
                      : "bg-slate-50 border-slate-300 text-slate-900 shadow-xs focus:border-indigo-500"
                  }`}
                >
                  <option value="all">Semua Wilayah</option>
                  {wilayahList.map((w) => (
                    <option key={w} value={w}>
                      {w}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. KPI SUMMARY HIGHLIGHTS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: TOTAL REVENUE PERIODE */}
        <div
          className={`border rounded-2xl p-4 sm:p-5 shadow-sm transition flex flex-col justify-between ${
            isDark
              ? "bg-slate-900/90 border-slate-800"
              : "bg-white border-slate-200"
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-xs font-semibold uppercase tracking-wider ${
                isDark ? "text-slate-400" : "text-slate-500"
              }`}
            >
              Total Revenue Periode
            </span>
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                isDark
                  ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                  : "bg-emerald-50 border border-emerald-200 text-emerald-600"
              }`}
            >
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div
              className={`text-xl sm:text-2xl font-extrabold font-mono tracking-tight ${
                isDark ? "text-emerald-400" : "text-emerald-600"
              }`}
            >
              {formatIDR(summaryInsights.totalRevenuePeriod)}
            </div>
            <div
              className={`text-[11px] mt-1 flex items-center justify-between ${
                isDark ? "text-slate-400" : "text-slate-500"
              }`}
            >
              <span>Total Volume:</span>
              <span className="font-mono font-semibold">
                {summaryInsights.totalCountPeriod.toLocaleString("id-ID")} Transaksi
              </span>
            </div>
          </div>
        </div>

        {/* KPI 2: RATA-RATA REVENUE BULANAN */}
        <div
          className={`border rounded-2xl p-4 sm:p-5 shadow-sm transition flex flex-col justify-between ${
            isDark
              ? "bg-slate-900/90 border-slate-800"
              : "bg-white border-slate-200"
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-xs font-semibold uppercase tracking-wider ${
                isDark ? "text-slate-400" : "text-slate-500"
              }`}
            >
              Rata-rata / Bulan
            </span>
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                isDark
                  ? "bg-indigo-500/10 border border-indigo-500/20 text-indigo-400"
                  : "bg-indigo-50 border border-indigo-200 text-indigo-600"
              }`}
            >
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div
              className={`text-xl sm:text-2xl font-extrabold font-mono tracking-tight ${
                isDark ? "text-indigo-300" : "text-indigo-600"
              }`}
            >
              {formatIDR(summaryInsights.avgRevenueMonthly)}
            </div>
            <div
              className={`text-[11px] mt-1 flex items-center justify-between ${
                isDark ? "text-slate-400" : "text-slate-500"
              }`}
            >
              <span>Jumlah Bulan Terdata:</span>
              <span className="font-mono font-semibold">
                {monthlyData.length} Bulan
              </span>
            </div>
          </div>
        </div>

        {/* KPI 3: BULAN OMSET TERTINGGI (PEAK) */}
        <div
          className={`border rounded-2xl p-4 sm:p-5 shadow-sm transition flex flex-col justify-between ${
            isDark
              ? "bg-slate-900/90 border-slate-800"
              : "bg-white border-slate-200"
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-xs font-semibold uppercase tracking-wider ${
                isDark ? "text-slate-400" : "text-slate-500"
              }`}
            >
              Bulan Omset Tertinggi
            </span>
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                isDark
                  ? "bg-amber-500/10 border border-amber-500/20 text-amber-400"
                  : "bg-amber-50 border border-amber-200 text-amber-600"
              }`}
            >
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div
              className={`text-lg sm:text-xl font-extrabold truncate ${
                isDark ? "text-white" : "text-slate-900"
              }`}
            >
              {summaryInsights.peakMonth ? summaryInsights.peakMonth.monthFull : "-"}
            </div>
            <div className="text-xs font-mono font-bold text-amber-500 mt-0.5">
              {summaryInsights.peakMonth
                ? formatIDR(summaryInsights.peakMonth.totalRevenue)
                : "-"}
            </div>
          </div>
        </div>

        {/* KPI 4: PERTUMBUHAN MoM TERKINI */}
        <div
          className={`border rounded-2xl p-4 sm:p-5 shadow-sm transition flex flex-col justify-between ${
            isDark
              ? "bg-slate-900/90 border-slate-800"
              : "bg-white border-slate-200"
          }`}
        >
          <div className="flex items-center justify-between">
            <span
              className={`text-xs font-semibold uppercase tracking-wider ${
                isDark ? "text-slate-400" : "text-slate-500"
              }`}
            >
              MoM Bulan Terkini
            </span>
            {summaryInsights.latestMonth && !summaryInsights.latestMonth.isFirstMonth ? (
              summaryInsights.latestMonth.isPositiveGrowth ? (
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
                  <TrendingDown className="w-4 h-4" />
                </div>
              )
            ) : (
              <div className="w-8 h-8 rounded-lg bg-slate-500/10 border border-slate-500/20 text-slate-400 flex items-center justify-center">
                <Minus className="w-4 h-4" />
              </div>
            )}
          </div>
          <div className="mt-3">
            {summaryInsights.latestMonth ? (
              <div>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`text-xl sm:text-2xl font-extrabold font-mono ${
                      summaryInsights.latestMonth.isFirstMonth
                        ? isDark
                          ? "text-slate-300"
                          : "text-slate-700"
                        : summaryInsights.latestMonth.isPositiveGrowth
                        ? isDark
                          ? "text-emerald-400"
                          : "text-emerald-600"
                        : isDark
                        ? "text-rose-400"
                        : "text-rose-600"
                    }`}
                  >
                    {summaryInsights.latestMonth.isFirstMonth
                      ? "Baseline"
                      : `${summaryInsights.latestMonth.momRevenuePercent > 0 ? "+" : ""}${
                          summaryInsights.latestMonth.momRevenuePercent
                        }%`}
                  </span>
                </div>
                <div
                  className={`text-[11px] mt-0.5 ${
                    isDark ? "text-slate-400" : "text-slate-500"
                  }`}
                >
                  vs bulan sebelumnya ({summaryInsights.latestMonth.monthShort})
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-400">-</div>
            )}
          </div>
        </div>
      </div>

      {/* 3. MAIN CHART: GRAFIK KOMPARASI MoM */}
      <div
        className={`border rounded-2xl p-5 sm:p-6 shadow-sm space-y-4 transition-colors ${
          isDark
            ? "bg-slate-900/90 border-slate-800"
            : "bg-white border-slate-200"
        }`}
      >
        {/* Chart Top Header & Mode Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/60">
          <div>
            <h3
              className={`text-base font-bold flex items-center gap-2 ${
                isDark ? "text-white" : "text-slate-900"
              }`}
            >
              <TrendingUp className="w-4 h-4 text-indigo-400" />
              <span>Grafik Komparasi Performa Antar Bulan</span>
            </h3>
            <p
              className={`text-xs ${
                isDark ? "text-slate-400" : "text-slate-500"
              }`}
            >
              Visualisasi tren revenue bulanan dan persentase kenaikan/penurunan MoM
            </p>
          </div>

          {/* Metric Selector Tabs */}
          <div
            className={`flex items-center overflow-x-auto no-scrollbar max-w-full p-1 rounded-xl border text-xs shadow-inner ${
              isDark
                ? "bg-slate-950 border-slate-800"
                : "bg-slate-100 border-slate-200"
            }`}
          >
            <button
              onClick={() => setChartMetric("dual")}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg font-semibold transition shrink-0 text-[11px] sm:text-xs ${
                chartMetric === "dual"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : isDark
                  ? "text-slate-400 hover:text-white"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Dual (Rev + Vol)
            </button>
            <button
              onClick={() => setChartMetric("revenue")}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg font-semibold transition shrink-0 text-[11px] sm:text-xs ${
                chartMetric === "revenue"
                  ? "bg-emerald-500 text-slate-950 font-bold shadow-xs"
                  : isDark
                  ? "text-slate-400 hover:text-white"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Revenue (Rp)
            </button>
            <button
              onClick={() => setChartMetric("growth")}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg font-semibold transition shrink-0 text-[11px] sm:text-xs ${
                chartMetric === "growth"
                  ? "bg-amber-500 text-slate-950 font-bold shadow-xs"
                  : isDark
                  ? "text-slate-400 hover:text-white"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Pertumbuhan MoM (%)
            </button>
            <button
              onClick={() => setChartMetric("volume")}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg font-semibold transition shrink-0 text-[11px] sm:text-xs ${
                chartMetric === "volume"
                  ? "bg-blue-500 text-white font-bold shadow-xs"
                  : isDark
                  ? "text-slate-400 hover:text-white"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Volume Pengiriman
            </button>
          </div>
        </div>

        {/* Chart View */}
        <div className="h-[340px] w-full pt-2">
          {monthlyData.length === 0 ? (
            <div
              className={`h-full flex items-center justify-center text-xs ${
                isDark ? "text-slate-500" : "text-slate-400"
              }`}
            >
              Tidak ada data bulan yang cocok dengan filter yang dipilih.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              {chartMetric === "dual" ? (
                <ComposedChart
                  data={monthlyData}
                  margin={{ top: 15, right: 20, left: 10, bottom: 25 }}
                >
                  <defs>
                    <linearGradient id="barRevGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#4338ca" stopOpacity={0.7} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={isDark ? "#1e293b" : "#e2e8f0"}
                    vertical={false}
                  />
                  <XAxis
                    dataKey="monthShort"
                    stroke={isDark ? "#64748b" : "#94a3b8"}
                    fontSize={11}
                    tickLine={false}
                  />
                  <YAxis
                    yAxisId="left"
                    stroke={isDark ? "#818cf8" : "#6366f1"}
                    fontSize={11}
                    tickLine={false}
                    tickFormatter={(val) =>
                      val >= 1_000_000_000
                        ? `${(val / 1_000_000_000).toFixed(1)}M`
                        : val >= 1_000_000
                        ? `${(val / 1_000_000).toFixed(0)}Jt`
                        : `${val}`
                    }
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    stroke={isDark ? "#34d399" : "#059669"}
                    fontSize={11}
                    tickLine={false}
                    tickFormatter={(val) => `${val.toLocaleString("id-ID")}`}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item: MonthlyStatsItem = payload[0].payload;
                        return (
                          <div
                            className={`p-3.5 rounded-xl border shadow-2xl text-xs space-y-2 min-w-[210px] ${
                              isDark
                                ? "bg-[#0c1219] border-indigo-500/40 text-white"
                                : "bg-white border-slate-300 text-slate-900 shadow-xl"
                            }`}
                          >
                            <div className="font-bold text-sm border-b border-slate-700/60 pb-1.5 flex items-center justify-between">
                              <span>{item.monthFull}</span>
                              {!item.isFirstMonth && (
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                                    item.isPositiveGrowth
                                      ? "bg-emerald-500/20 text-emerald-400"
                                      : "bg-rose-500/20 text-rose-400"
                                  }`}
                                >
                                  {item.momRevenuePercent > 0 ? "+" : ""}
                                  {item.momRevenuePercent}%
                                </span>
                              )}
                            </div>

                            <div className="space-y-1">
                              <div className="flex justify-between">
                                <span className={isDark ? "text-slate-400" : "text-slate-500"}>
                                  Total Revenue:
                                </span>
                                <span className="font-mono font-bold text-indigo-400 text-sm">
                                  {formatIDR(item.totalRevenue)}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className={isDark ? "text-slate-400" : "text-slate-500"}>
                                  Volume Transaksi:
                                </span>
                                <span className="font-mono font-semibold text-emerald-400">
                                  {item.totalCount.toLocaleString("id-ID")} Paket
                                </span>
                              </div>
                              <div className="flex justify-between text-[11px] pt-1 border-t border-slate-800">
                                <span className={isDark ? "text-slate-400" : "text-slate-500"}>
                                  Rata-rata / Hari:
                                </span>
                                <span className="font-mono">
                                  {formatIDR(item.avgRevenuePerDay)}
                                </span>
                              </div>
                              {!item.isFirstMonth && (
                                <div className="flex justify-between text-[11px]">
                                  <span className={isDark ? "text-slate-400" : "text-slate-500"}>
                                    Selisih vs Bln Lalu:
                                  </span>
                                  <span
                                    className={`font-mono font-semibold ${
                                      item.momRevenueDelta >= 0
                                        ? "text-emerald-400"
                                        : "text-rose-400"
                                    }`}
                                  >
                                    {item.momRevenueDelta >= 0 ? "+" : ""}
                                    {formatIDR(item.momRevenueDelta)}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend
                    verticalAlign="top"
                    height={36}
                    formatter={(val) => (
                      <span
                        className={`text-xs ${
                          isDark ? "text-slate-300" : "text-slate-700"
                        }`}
                      >
                        {val === "totalRevenue" ? "Revenue (Rp)" : "Volume Pengiriman (Paket)"}
                      </span>
                    )}
                  />
                  <ReferenceLine
                    yAxisId="left"
                    y={averageMonthlyRevenue}
                    stroke="#f59e0b"
                    strokeDasharray="4 4"
                    label={{
                      value: "Rata-rata Bln",
                      position: "insideTopLeft",
                      fill: "#f59e0b",
                      fontSize: 10,
                    }}
                  />
                  <Bar
                    yAxisId="left"
                    dataKey="totalRevenue"
                    fill="url(#barRevGrad)"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={48}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="totalCount"
                    stroke="#10b981"
                    strokeWidth={3}
                    dot={{ fill: "#10b981", r: 4 }}
                    activeDot={{ fill: "#34d399", r: 6, stroke: "#064e3b", strokeWidth: 2 }}
                  />
                </ComposedChart>
              ) : chartMetric === "revenue" ? (
                <BarChart
                  data={monthlyData}
                  margin={{ top: 15, right: 20, left: 10, bottom: 25 }}
                >
                  <defs>
                    <linearGradient id="barRevGrad2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#047857" stopOpacity={0.7} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={isDark ? "#1e293b" : "#e2e8f0"}
                    vertical={false}
                  />
                  <XAxis
                    dataKey="monthShort"
                    stroke={isDark ? "#64748b" : "#94a3b8"}
                    fontSize={11}
                    tickLine={false}
                  />
                  <YAxis
                    stroke={isDark ? "#64748b" : "#94a3b8"}
                    fontSize={11}
                    tickLine={false}
                    tickFormatter={(val) =>
                      val >= 1_000_000_000
                        ? `${(val / 1_000_000_000).toFixed(1)}M`
                        : val >= 1_000_000
                        ? `${(val / 1_000_000).toFixed(0)}Jt`
                        : `${val}`
                    }
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item: MonthlyStatsItem = payload[0].payload;
                        return (
                          <div
                            className={`p-3 rounded-xl border shadow-xl text-xs space-y-1.5 min-w-[190px] ${
                              isDark
                                ? "bg-[#0c1219] border-emerald-500/40 text-white"
                                : "bg-white border-slate-300 text-slate-900"
                            }`}
                          >
                            <div className="font-bold border-b pb-1 flex justify-between">
                              <span>{item.monthFull}</span>
                              <span className="font-mono text-emerald-400">
                                {formatIDR(item.totalRevenue)}
                              </span>
                            </div>
                            <div className="flex justify-between text-[11px]">
                              <span>Transaksi:</span>
                              <span className="font-semibold font-mono">
                                {item.totalCount.toLocaleString("id-ID")}
                              </span>
                            </div>
                            <div className="flex justify-between text-[11px]">
                              <span>Pertumbuhan:</span>
                              <span
                                className={`font-semibold font-mono ${
                                  item.momRevenuePercent >= 0
                                    ? "text-emerald-400"
                                    : "text-rose-400"
                                }`}
                              >
                                {item.isFirstMonth
                                  ? "-"
                                  : `${item.momRevenuePercent > 0 ? "+" : ""}${
                                      item.momRevenuePercent
                                    }%`}
                              </span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <ReferenceLine
                    y={averageMonthlyRevenue}
                    stroke="#f59e0b"
                    strokeDasharray="4 4"
                    label={{
                      value: "Rata-rata",
                      position: "insideTopRight",
                      fill: "#f59e0b",
                      fontSize: 10,
                    }}
                  />
                  <Bar
                    dataKey="totalRevenue"
                    fill="url(#barRevGrad2)"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={52}
                  />
                </BarChart>
              ) : chartMetric === "growth" ? (
                <BarChart
                  data={monthlyData.filter((m) => !m.isFirstMonth)}
                  margin={{ top: 15, right: 20, left: 10, bottom: 25 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={isDark ? "#1e293b" : "#e2e8f0"}
                    vertical={false}
                  />
                  <XAxis
                    dataKey="monthShort"
                    stroke={isDark ? "#64748b" : "#94a3b8"}
                    fontSize={11}
                    tickLine={false}
                  />
                  <YAxis
                    stroke={isDark ? "#64748b" : "#94a3b8"}
                    fontSize={11}
                    tickLine={false}
                    tickFormatter={(val) => `${val}%`}
                  />
                  <ReferenceLine y={0} stroke={isDark ? "#475569" : "#94a3b8"} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item: MonthlyStatsItem = payload[0].payload;
                        return (
                          <div
                            className={`p-3 rounded-xl border shadow-xl text-xs space-y-1.5 min-w-[190px] ${
                              isDark
                                ? "bg-[#0c1219] border-slate-700 text-white"
                                : "bg-white border-slate-300 text-slate-900"
                            }`}
                          >
                            <div className="font-bold border-b pb-1 flex justify-between">
                              <span>{item.monthFull}</span>
                              <span
                                className={`font-mono font-bold ${
                                  item.momRevenuePercent >= 0
                                    ? "text-emerald-400"
                                    : "text-rose-400"
                                }`}
                              >
                                {item.momRevenuePercent > 0 ? "+" : ""}
                                {item.momRevenuePercent}%
                              </span>
                            </div>
                            <div className="flex justify-between text-[11px]">
                              <span>Selisih Nominal:</span>
                              <span className="font-mono font-semibold">
                                {item.momRevenueDelta >= 0 ? "+" : ""}
                                {formatIDR(item.momRevenueDelta)}
                              </span>
                            </div>
                            <div className="flex justify-between text-[11px]">
                              <span>Total Omset:</span>
                              <span className="font-mono text-indigo-400">
                                {formatIDR(item.totalRevenue)}
                              </span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="momRevenuePercent" radius={[4, 4, 0, 0]} maxBarSize={45}>
                    {monthlyData
                      .filter((m) => !m.isFirstMonth)
                      .map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.isPositiveGrowth ? "#10b981" : "#f43f5e"}
                        />
                      ))}
                  </Bar>
                </BarChart>
              ) : (
                /* VOLUME CHART */
                <BarChart
                  data={monthlyData}
                  margin={{ top: 15, right: 20, left: 10, bottom: 25 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={isDark ? "#1e293b" : "#e2e8f0"}
                    vertical={false}
                  />
                  <XAxis
                    dataKey="monthShort"
                    stroke={isDark ? "#64748b" : "#94a3b8"}
                    fontSize={11}
                    tickLine={false}
                  />
                  <YAxis
                    stroke={isDark ? "#64748b" : "#94a3b8"}
                    fontSize={11}
                    tickLine={false}
                    tickFormatter={(val) => `${val.toLocaleString("id-ID")}`}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item: MonthlyStatsItem = payload[0].payload;
                        return (
                          <div
                            className={`p-3 rounded-xl border shadow-xl text-xs space-y-1.5 min-w-[190px] ${
                              isDark
                                ? "bg-[#0c1219] border-blue-500/40 text-white"
                                : "bg-white border-slate-300 text-slate-900"
                            }`}
                          >
                            <div className="font-bold border-b pb-1 flex justify-between">
                              <span>{item.monthFull}</span>
                              <span className="font-mono text-blue-400 font-bold">
                                {item.totalCount.toLocaleString("id-ID")} Paket
                              </span>
                            </div>
                            <div className="flex justify-between text-[11px]">
                              <span>Total Revenue:</span>
                              <span className="font-mono font-semibold text-emerald-400">
                                {formatIDR(item.totalRevenue)}
                              </span>
                            </div>
                            <div className="flex justify-between text-[11px]">
                              <span>MoM Volume:</span>
                              <span
                                className={`font-mono font-semibold ${
                                  item.momCountPercent >= 0
                                    ? "text-emerald-400"
                                    : "text-rose-400"
                                }`}
                              >
                                {item.isFirstMonth
                                  ? "-"
                                  : `${item.momCountPercent > 0 ? "+" : ""}${
                                      item.momCountPercent
                                    }% (${item.momCountDelta >= 0 ? "+" : ""}${
                                      item.momCountDelta
                                    })`}
                              </span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar
                    dataKey="totalCount"
                    fill="#3b82f6"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={48}
                  />
                </BarChart>
              )}
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* 4. DETAILED BREAKDOWN TABLE: KOMPARASI BULAN KE BULAN */}
      <div
        className={`border rounded-2xl shadow-sm overflow-hidden transition-colors ${
          isDark
            ? "bg-slate-900/90 border-slate-800"
            : "bg-white border-slate-200"
        }`}
      >
        <div
          className={`p-4 sm:p-5 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            isDark ? "border-slate-800/80" : "border-slate-100"
          }`}
        >
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-400" />
            <h3
              className={`text-sm font-bold ${
                isDark ? "text-white" : "text-slate-900"
              }`}
            >
              Tabel Rincian Komparasi Bulan ke Bulan
            </h3>
          </div>
          <span
            className={`text-xs ${
              isDark ? "text-slate-400" : "text-slate-500"
            }`}
          >
            Menampilkan <strong>{monthlyData.length}</strong> periode bulan terdata
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr
                className={`border-b text-[11px] uppercase tracking-wider font-semibold ${
                  isDark
                    ? "bg-slate-950/80 text-slate-400 border-slate-800"
                    : "bg-slate-50 text-slate-600 border-slate-200"
                }`}
              >
                <th className="py-3 px-4">Periode Bulan</th>
                <th className="py-3 px-4 text-right">Volume Pengiriman</th>
                <th className="py-3 px-4 text-right">Total Revenue</th>
                <th className="py-3 px-4 text-right">Selisih Nominal (Rp)</th>
                <th className="py-3 px-4 text-center">Laju MoM (%)</th>
                <th className="py-3 px-4 text-right">Rata-rata / Hari</th>
                <th className="py-3 px-4 text-center">Status Performa</th>
              </tr>
            </thead>
            <tbody
              className={`divide-y ${
                isDark ? "divide-slate-800/60" : "divide-slate-100"
              }`}
            >
              {monthlyData.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    Tidak ada data bulan yang sesuai.
                  </td>
                </tr>
              ) : (
                monthlyData.map((item, idx) => {
                  const isPeak = summaryInsights.peakMonth?.monthKey === item.monthKey;
                  return (
                    <tr
                      key={item.monthKey}
                      className={`transition ${
                        isDark
                          ? "hover:bg-slate-800/40"
                          : "hover:bg-slate-50"
                      } ${
                        isPeak
                          ? isDark
                            ? "bg-indigo-950/20"
                            : "bg-indigo-50/50"
                          : ""
                      }`}
                    >
                      {/* Periode */}
                      <td className="py-3.5 px-4 font-medium flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            isPeak
                              ? "bg-amber-400"
                              : item.isPositiveGrowth
                              ? "bg-emerald-400"
                              : "bg-rose-400"
                          }`}
                        />
                        <span
                          className={`font-semibold ${
                            isDark ? "text-slate-200" : "text-slate-800"
                          }`}
                        >
                          {item.monthFull}
                        </span>
                        {isPeak && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-500 border border-amber-500/30">
                            PEAK
                          </span>
                        )}
                      </td>

                      {/* Volume Pengiriman */}
                      <td className="py-3.5 px-4 text-right font-mono">
                        <span
                          className={`font-semibold ${
                            isDark ? "text-slate-200" : "text-slate-800"
                          }`}
                        >
                          {item.totalCount.toLocaleString("id-ID")}
                        </span>
                        <span className="text-slate-400 text-[10px] ml-1">paket</span>
                      </td>

                      {/* Total Revenue */}
                      <td className="py-3.5 px-4 text-right font-mono">
                        <span
                          className={`font-bold text-sm ${
                            isDark ? "text-emerald-400" : "text-emerald-600"
                          }`}
                        >
                          {formatIDR(item.totalRevenue)}
                        </span>
                      </td>

                      {/* Selisih Nominal */}
                      <td className="py-3.5 px-4 text-right font-mono">
                        {item.isFirstMonth ? (
                          <span className="text-slate-400 italic text-[11px]">- (Awal)</span>
                        ) : (
                          <span
                            className={`font-semibold ${
                              item.momRevenueDelta >= 0
                                ? isDark
                                  ? "text-emerald-400"
                                  : "text-emerald-600"
                                : isDark
                                ? "text-rose-400"
                                : "text-rose-600"
                            }`}
                          >
                            {item.momRevenueDelta >= 0 ? "+" : ""}
                            {formatIDR(item.momRevenueDelta)}
                          </span>
                        )}
                      </td>

                      {/* Laju MoM % */}
                      <td className="py-3.5 px-4 text-center">
                        {item.isFirstMonth ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-slate-500/10 text-slate-400 border border-slate-500/20">
                            Baseline
                          </span>
                        ) : (
                          <span
                            className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-mono font-bold border ${
                              item.isPositiveGrowth
                                ? isDark
                                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                                  : "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : isDark
                                ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                                : "bg-rose-50 text-rose-700 border-rose-200"
                            }`}
                          >
                            {item.isPositiveGrowth ? (
                              <ArrowUpRight className="w-3 h-3" />
                            ) : (
                              <ArrowDownRight className="w-3 h-3" />
                            )}
                            <span>
                              {item.momRevenuePercent > 0 ? "+" : ""}
                              {item.momRevenuePercent}%
                            </span>
                          </span>
                        )}
                      </td>

                      {/* Rata-rata / Hari */}
                      <td className="py-3.5 px-4 text-right font-mono">
                        <span className={isDark ? "text-slate-300" : "text-slate-700"}>
                          {formatIDR(item.avgRevenuePerDay)}
                        </span>
                        <div className="text-[10px] text-slate-400">
                          ({item.activeDays} hari aktif)
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        {item.isFirstMonth ? (
                          <span className="text-[11px] text-slate-400 font-medium">
                            Titik Awal
                          </span>
                        ) : item.momRevenuePercent >= 10 ? (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/20 text-emerald-500 border border-emerald-500/40">
                            Naik Signifikan
                          </span>
                        ) : item.momRevenuePercent > 0 ? (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                            Naik
                          </span>
                        ) : item.momRevenuePercent <= -10 ? (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-500/20 text-rose-500 border border-rose-500/40">
                            Koreksi Tajam
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-rose-500/10 text-rose-600 border border-rose-500/20">
                            Turun
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
