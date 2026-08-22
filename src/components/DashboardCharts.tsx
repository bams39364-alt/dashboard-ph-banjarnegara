import React, { useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  TrendingUp,
  PieChart as PieIcon,
  Calendar,
  Sparkles,
  Package,
  Layers,
} from "lucide-react";
import { motion } from "motion/react";
import { SheetData } from "../types";
import {
  findRevenueColumn,
  findServiceColumn,
  formatIDR,
  getRowTotalPayment,
  extractRowDateInfo,
} from "../utils/dataHelper";
import { useTheme } from "../context/ThemeContext";

interface Props {
  sheetData: SheetData;
  filteredRows: Record<string, any>[];
}

const COLORS = [
  "#6366f1", // indigo
  "#10b981", // emerald
  "#f59e0b", // amber
  "#3b82f6", // blue
  "#ec4899", // pink
  "#8b5cf6", // purple
  "#14b8a6", // teal
  "#f97316", // orange
  "#06b6d4", // cyan
  "#e11d48", // rose
];

const MONTH_SHORT_ID = [
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

export const DashboardCharts: React.FC<Props> = ({ sheetData, filteredRows }) => {
  const { isDark } = useTheme();
  const { headers } = sheetData;
  const rows = filteredRows;

  // Chart 1 State: Tren Revenue
  const [trendChartType, setTrendChartType] = useState<"area" | "line" | "bar">("area");

  // Chart 2: Auto-detect Service Column
  const detectedServiceCol = useMemo(() => {
    return (
      findServiceColumn(headers) ||
      headers.find((h) => /service|layanan|paket|delivery_type|jenis_layanan/i.test(h)) ||
      headers[0]
    );
  }, [headers]);

  const [selectedServiceCol, setSelectedServiceCol] = useState<string>(detectedServiceCol);

  // Update selectedServiceCol if headers change
  React.useEffect(() => {
    if (detectedServiceCol && headers.includes(detectedServiceCol)) {
      setSelectedServiceCol(detectedServiceCol);
    }
  }, [detectedServiceCol, headers]);

  // Aggregate Data for Daily Revenue Trend (Pertanggal)
  const trendData = useMemo(() => {
    if (rows.length === 0) return [];

    const dateMap: Record<
      string,
      { dateKey: string; label: string; fullDate: string; revenue: number; count: number }
    > = {};

    rows.forEach((row) => {
      const dateInfo = extractRowDateInfo(row, headers);
      const rowPayment = getRowTotalPayment(row, headers);

      let key = "Lainnya";
      let label = "Lainnya";
      let fullDate = "Lainnya";

      if (dateInfo.dateKey && dateInfo.day && dateInfo.month) {
        key = dateInfo.dateKey;
        const mStr = MONTH_SHORT_ID[dateInfo.month] || String(dateInfo.month);
        label = `${String(dateInfo.day).padStart(2, "0")} ${mStr}`;
        fullDate = `${dateInfo.day} ${mStr} ${dateInfo.year || ""}`.trim();
      }

      if (!dateMap[key]) {
        dateMap[key] = {
          dateKey: key,
          label,
          fullDate,
          revenue: 0,
          count: 0,
        };
      }

      dateMap[key].revenue += rowPayment;
      dateMap[key].count += 1;
    });

    // Sort chronologically by dateKey
    return Object.values(dateMap).sort((a, b) => {
      if (a.dateKey === "Lainnya") return 1;
      if (b.dateKey === "Lainnya") return -1;
      return a.dateKey.localeCompare(b.dateKey);
    });
  }, [rows, headers]);

  // Peak revenue day stats
  const peakDay = useMemo(() => {
    if (trendData.length === 0) return null;
    return [...trendData].sort((a, b) => b.revenue - a.revenue)[0];
  }, [trendData]);

  // Aggregate Data for Chart 2 (Analisa Jumlah Service)
  const { servicePieData, totalServiceTransactions } = useMemo(() => {
    if (!selectedServiceCol || rows.length === 0) {
      return { servicePieData: [], totalServiceTransactions: 0 };
    }

    const grouped: Record<string, number> = {};
    let totalCount = 0;

    rows.forEach((row) => {
      const rawVal = row[selectedServiceCol];
      let sVal = "Lainnya";
      if (rawVal !== undefined && rawVal !== null && String(rawVal).trim() !== "") {
        sVal = String(rawVal).trim();
      }
      grouped[sVal] = (grouped[sVal] || 0) + 1;
      totalCount += 1;
    });

    const data = Object.entries(grouped)
      .map(([name, count]) => {
        const percentage = totalCount > 0 ? (count / totalCount) * 100 : 0;
        return {
          name,
          value: count, // jumlah frekuensi service
          percentage: parseFloat(percentage.toFixed(1)),
        };
      })
      .sort((a, b) => b.value - a.value);

    return {
      servicePieData: data,
      totalServiceTransactions: totalCount,
    };
  }, [rows, selectedServiceCol]);

  const CustomTrendTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div
          className={`border p-3 rounded-xl shadow-2xl text-xs space-y-1.5 min-w-[170px] ${
            isDark
              ? "bg-[#0c1219] border-slate-700 text-white"
              : "bg-white border-slate-200 text-slate-900 shadow-lg"
          }`}
        >
          <div
            className={`flex items-center gap-1.5 font-semibold border-b pb-1 ${
              isDark
                ? "text-slate-300 border-slate-800"
                : "text-slate-800 border-slate-100"
            }`}
          >
            <Calendar
              className={`w-3.5 h-3.5 ${
                isDark ? "text-emerald-400" : "text-emerald-600"
              }`}
            />
            <span>{data.fullDate || label}</span>
          </div>
          <div className="pt-0.5">
            <p
              className={`text-[11px] ${
                isDark ? "text-slate-400" : "text-slate-500"
              }`}
            >
              Total Revenue:
            </p>
            <p
              className={`text-sm font-extrabold font-mono ${
                isDark ? "text-emerald-400" : "text-emerald-600"
              }`}
            >
              {formatIDR(data.revenue)}
            </p>
          </div>
          <div
            className={`flex items-center justify-between text-[11px] pt-0.5 border-t ${
              isDark
                ? "border-slate-800/80 text-slate-400"
                : "border-slate-100 text-slate-500"
            }`}
          >
            <span>Volume Pengiriman:</span>
            <span
              className={`font-mono font-medium ${
                isDark ? "text-slate-200" : "text-slate-800"
              }`}
            >
              {data.count} Transaksi
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  const CustomServiceTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div
          className={`border p-3 rounded-xl shadow-2xl text-xs space-y-1.5 min-w-[160px] ${
            isDark
              ? "bg-[#0c1219] border-slate-700 text-white"
              : "bg-white border-slate-200 text-slate-900 shadow-lg"
          }`}
        >
          <div
            className={`flex items-center gap-1.5 font-semibold border-b pb-1 ${
              isDark
                ? "text-slate-200 border-slate-800"
                : "text-slate-800 border-slate-100"
            }`}
          >
            <Package
              className={`w-3.5 h-3.5 ${
                isDark ? "text-indigo-400" : "text-indigo-600"
              }`}
            />
            <span>{data.name}</span>
          </div>
          <div className="pt-0.5 flex items-center justify-between text-[11px]">
            <span className={isDark ? "text-slate-400" : "text-slate-500"}>
              Jumlah Transaksi:
            </span>
            <span
              className={`font-mono font-bold ${
                isDark ? "text-indigo-300" : "text-indigo-600"
              }`}
            >
              {data.value.toLocaleString("id-ID")} Transaksi
            </span>
          </div>
          <div
            className={`flex items-center justify-between text-[11px] pt-0.5 border-t ${
              isDark
                ? "border-slate-800/80 text-slate-400"
                : "border-slate-100 text-slate-500"
            }`}
          >
            <span>Pangsa Layanan:</span>
            <span
              className={`font-mono font-medium ${
                isDark ? "text-emerald-400" : "text-emerald-600"
              }`}
            >
              {data.percentage}%
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="grid grid-cols-1 lg:grid-cols-12 gap-6"
    >
      {/* Chart 1: Tren Revenue Pertanggal */}
      <motion.div
        whileHover={{ y: -2, transition: { duration: 0.2 } }}
        className={`lg:col-span-7 border rounded-2xl p-5 shadow-sm flex flex-col justify-between transition-colors ${
          isDark
            ? "bg-slate-900 border-slate-800 hover:border-slate-700"
            : "bg-white border-slate-200 hover:border-slate-300"
        }`}
      >
        <div
          className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b ${
            isDark ? "border-slate-800/80" : "border-slate-100"
          }`}
        >
          <div>
            <div className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                  isDark
                    ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
                    : "bg-emerald-50 border border-emerald-200 text-emerald-600"
                }`}
              >
                <TrendingUp className="w-4 h-4" />
              </div>
              <h3
                className={`text-sm font-semibold ${
                  isDark ? "text-white" : "text-slate-900"
                }`}
              >
                Tren Revenue (Pertanggal)
              </h3>
            </div>
            <p
              className={`text-xs mt-1 ${
                isDark ? "text-slate-400" : "text-slate-500"
              }`}
            >
              Fluktuasi omset harian otomatis tersinkronisasi dengan filter aktif
            </p>
          </div>

          {/* Toggle Type & Peak Highlight */}
          <div className="flex items-center gap-2 flex-wrap">
            {peakDay && peakDay.revenue > 0 && (
              <div
                className={`hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] ${
                  isDark
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                    : "bg-emerald-50 border-emerald-200 text-emerald-700 font-semibold"
                }`}
              >
                <Sparkles
                  className={`w-3 h-3 ${
                    isDark ? "text-emerald-400" : "text-emerald-600"
                  }`}
                />
                <span>Puncak: <strong>{peakDay.label}</strong> ({formatIDR(peakDay.revenue)})</span>
              </div>
            )}

            <div
              className={`flex p-1 rounded-lg border text-xs ${
                isDark
                  ? "bg-slate-950 border-slate-800"
                  : "bg-slate-100 border-slate-200"
              }`}
            >
              <button
                onClick={() => setTrendChartType("area")}
                className={`px-2.5 py-1 rounded transition ${
                  trendChartType === "area"
                    ? "bg-emerald-500 text-black font-semibold shadow-xs"
                    : isDark
                    ? "text-slate-400 hover:text-white"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Area
              </button>
              <button
                onClick={() => setTrendChartType("line")}
                className={`px-2.5 py-1 rounded transition ${
                  trendChartType === "line"
                    ? "bg-emerald-500 text-black font-semibold shadow-xs"
                    : isDark
                    ? "text-slate-400 hover:text-white"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Line
              </button>
              <button
                onClick={() => setTrendChartType("bar")}
                className={`px-2.5 py-1 rounded transition ${
                  trendChartType === "bar"
                    ? "bg-emerald-500 text-black font-semibold shadow-xs"
                    : isDark
                    ? "text-slate-400 hover:text-white"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Bar
              </button>
            </div>
          </div>
        </div>

        {/* Info Sub-bar */}
        <div
          className={`flex items-center justify-between py-2 text-xs border-b ${
            isDark
              ? "border-slate-800/40 text-slate-400"
              : "border-slate-100 text-slate-500"
          }`}
        >
          <span className="flex items-center gap-1.5">
            <span>Rentang Aktif:</span>
            <strong
              className={`font-mono ${
                isDark ? "text-slate-200" : "text-slate-800"
              }`}
            >
              {trendData.length} Hari Transaksi
            </strong>
          </span>
          <span
            className={`text-[11px] ${
              isDark ? "text-slate-500" : "text-slate-400"
            }`}
          >
            Formula: total_payment {`( + fix_cost jika MULTIPLE)`}
          </span>
        </div>

        {/* Chart Container */}
        <div className="h-[280px] w-full pt-3">
          {trendData.length === 0 ? (
            <div
              className={`h-full flex items-center justify-center text-xs ${
                isDark ? "text-slate-500" : "text-slate-400"
              }`}
            >
              Tidak ada data transaksi pada periode filter yang dipilih.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              {trendChartType === "area" ? (
                <AreaChart
                  data={trendData}
                  margin={{ top: 10, right: 10, left: 0, bottom: 20 }}
                >
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.45} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={isDark ? "#1e293b" : "#e2e8f0"}
                    vertical={false}
                  />
                  <XAxis
                    dataKey="label"
                    stroke={isDark ? "#64748b" : "#94a3b8"}
                    fontSize={11}
                    tickLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    stroke={isDark ? "#64748b" : "#94a3b8"}
                    fontSize={11}
                    tickLine={false}
                    tickFormatter={(val) =>
                      val >= 1000000
                        ? `${(val / 1000000).toFixed(1)}M`
                        : val >= 1000
                        ? `${(val / 1000).toFixed(0)}k`
                        : val
                    }
                  />
                  <Tooltip content={<CustomTrendTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    name="Revenue"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#revenueGradient)"
                    dot={{ fill: "#10b981", r: 3 }}
                    activeDot={{
                      fill: "#34d399",
                      r: 6,
                      stroke: isDark ? "#064e3b" : "#ffffff",
                      strokeWidth: 2,
                    }}
                  />
                </AreaChart>
              ) : trendChartType === "line" ? (
                <LineChart
                  data={trendData}
                  margin={{ top: 10, right: 10, left: 0, bottom: 20 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={isDark ? "#1e293b" : "#e2e8f0"}
                    vertical={false}
                  />
                  <XAxis
                    dataKey="label"
                    stroke={isDark ? "#64748b" : "#94a3b8"}
                    fontSize={11}
                    tickLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    stroke={isDark ? "#64748b" : "#94a3b8"}
                    fontSize={11}
                    tickLine={false}
                    tickFormatter={(val) =>
                      val >= 1000000
                        ? `${(val / 1000000).toFixed(1)}M`
                        : val >= 1000
                        ? `${(val / 1000).toFixed(0)}k`
                        : val
                    }
                  />
                  <Tooltip content={<CustomTrendTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    name="Revenue"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    dot={{ fill: "#10b981", r: 3.5 }}
                    activeDot={{
                      fill: "#34d399",
                      r: 6,
                      stroke: isDark ? "#064e3b" : "#ffffff",
                      strokeWidth: 2,
                    }}
                  />
                </LineChart>
              ) : (
                <BarChart
                  data={trendData}
                  margin={{ top: 10, right: 10, left: 0, bottom: 20 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={isDark ? "#1e293b" : "#e2e8f0"}
                    vertical={false}
                  />
                  <XAxis
                    dataKey="label"
                    stroke={isDark ? "#64748b" : "#94a3b8"}
                    fontSize={11}
                    tickLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    stroke={isDark ? "#64748b" : "#94a3b8"}
                    fontSize={11}
                    tickLine={false}
                    tickFormatter={(val) =>
                      val >= 1000000
                        ? `${(val / 1000000).toFixed(1)}M`
                        : val >= 1000
                        ? `${(val / 1000).toFixed(0)}k`
                        : val
                    }
                  />
                  <Tooltip content={<CustomTrendTooltip />} />
                  <Bar
                    dataKey="revenue"
                    name="Revenue"
                    fill="#10b981"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              )}
            </ResponsiveContainer>
          )}
        </div>
      </motion.div>

      {/* Chart 2: Analisa Jumlah Service (Pie) */}
      <motion.div
        whileHover={{ y: -2, transition: { duration: 0.2 } }}
        className={`lg:col-span-5 border rounded-2xl p-5 shadow-sm flex flex-col justify-between transition-colors ${
          isDark
            ? "bg-slate-900 border-slate-800 hover:border-slate-700"
            : "bg-white border-slate-200 hover:border-slate-300"
        }`}
      >
        <div
          className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b ${
            isDark ? "border-slate-800/80" : "border-slate-100"
          }`}
        >
          <div>
            <div className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                  isDark
                    ? "bg-indigo-500/10 border border-indigo-500/30 text-indigo-400"
                    : "bg-indigo-50 border border-indigo-200 text-indigo-600"
                }`}
              >
                <PieIcon className="w-4 h-4" />
              </div>
              <h3
                className={`text-sm font-semibold ${
                  isDark ? "text-white" : "text-slate-900"
                }`}
              >
                Analisa Jumlah Service
              </h3>
            </div>
            <p
              className={`text-xs mt-1 ${
                isDark ? "text-slate-400" : "text-slate-500"
              }`}
            >
              Distribusi volume pengiriman berdasarkan jenis layanan (Service)
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            <span
              className={`text-[11px] ${
                isDark ? "text-slate-400" : "text-slate-500"
              }`}
            >
              Kolom:
            </span>
            <select
              value={selectedServiceCol}
              onChange={(e) => setSelectedServiceCol(e.target.value)}
              className={`border rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-indigo-500 font-mono ${
                isDark
                  ? "bg-slate-950 border-slate-800 text-slate-200"
                  : "bg-slate-50 border-slate-300 text-slate-800 shadow-xs"
              }`}
            >
              {headers.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Info Sub-bar */}
        <div
          className={`flex items-center justify-between py-2 text-xs border-b ${
            isDark
              ? "border-slate-800/40 text-slate-400"
              : "border-slate-100 text-slate-500"
          }`}
        >
          <span className="flex items-center gap-1.5">
            <span>Total Pengiriman:</span>
            <strong
              className={`font-mono ${
                isDark ? "text-indigo-300" : "text-indigo-600"
              }`}
            >
              {totalServiceTransactions.toLocaleString("id-ID")}
            </strong>
          </span>
          <span
            className={`flex items-center gap-1 text-[11px] ${
              isDark ? "text-slate-400" : "text-slate-500"
            }`}
          >
            <span>{servicePieData.length} Jenis Layanan Terdata</span>
          </span>
        </div>

        {/* Recharts Pie */}
        <div className="h-[280px] w-full flex items-center justify-center pt-2">
          {servicePieData.length === 0 ? (
            <div
              className={`text-xs ${
                isDark ? "text-slate-500" : "text-slate-400"
              }`}
            >
              Tidak ada data service untuk filter saat ini.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={servicePieData}
                  cx="50%"
                  cy="46%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                  nameKey="name"
                >
                  {servicePieData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                      stroke={isDark ? "#0f172a" : "#ffffff"}
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomServiceTooltip />} />
                <Legend
                  verticalAlign="bottom"
                  height={44}
                  iconType="circle"
                  formatter={(val, entry: any) => {
                    const item = servicePieData.find((d) => d.name === val);
                    return (
                      <span
                        className={`text-[11px] inline-flex items-center gap-1 ${
                          isDark ? "text-slate-300" : "text-slate-700"
                        }`}
                      >
                        <span>{val}</span>
                        <strong
                          className={`font-mono ${
                            isDark ? "text-indigo-400" : "text-indigo-600"
                          }`}
                        >
                          ({item ? `${item.percentage}%` : ""})
                        </strong>
                      </span>
                    );
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};


