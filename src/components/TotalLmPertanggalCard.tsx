import React, { useState, useMemo } from "react";
import {
  Truck,
  TrendingUp,
  BarChart3,
  RefreshCw,
  Flame,
  Activity,
  CalendarDays,
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
} from "recharts";
import { SheetData, FilterState } from "../types";
import { extractLmDailyStats, DailyLmRecord } from "../utils/dataHelper";
import { useTheme } from "../context/ThemeContext";

interface TotalLmPertanggalCardProps {
  lmSheetData: SheetData | null;
  mainSheetData?: SheetData | null;
  filters: FilterState;
  isLoading: boolean;
  onRefreshLmSheet: () => void;
  onSelectLmTab?: (tabTitle: string) => void;
}

export const TotalLmPertanggalCard: React.FC<TotalLmPertanggalCardProps> = ({
  lmSheetData,
  mainSheetData,
  filters,
  isLoading,
  onRefreshLmSheet,
}) => {
  const { isDark } = useTheme();
  const [chartType, setChartType] = useState<"bar" | "area">("bar");

  // Aggregate LM stats using the filters
  const lmStats = useMemo(() => {
    const dataToUse = lmSheetData && lmSheetData.rows.length > 0 ? lmSheetData : mainSheetData;
    if (!dataToUse || dataToUse.rows.length === 0) {
      return null;
    }
    return extractLmDailyStats(dataToUse.rows, dataToUse.headers, filters);
  }, [lmSheetData, mainSheetData, filters]);

  return (
    <div
      className={`border rounded-2xl p-4 sm:p-6 shadow-sm space-y-6 transition-colors ${
        isDark ? "bg-[#0b1118] border-slate-800/90" : "bg-white border-slate-200"
      }`}
    >
      {/* 1. Header Section */}
      <div
        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b ${
          isDark ? "border-slate-800/80" : "border-slate-100"
        }`}
      >
        <div className="flex items-center gap-3.5">
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-inner ${
              isDark
                ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
                : "bg-emerald-50 border border-emerald-200 text-emerald-600"
            }`}
          >
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight">
              TOTAL LM PERTANGGAL
            </h2>
            <p
              className={`text-xs ${
                isDark ? "text-slate-400" : "text-slate-500"
              }`}
            >
              Rekapitulasi volume pengiriman lastmile per tanggal assign
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Chart Type Toggle */}
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
                    ? "bg-emerald-500/20 text-emerald-300 font-semibold"
                    : "bg-emerald-500 text-black font-semibold shadow-sm"
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
                    ? "bg-emerald-500/20 text-emerald-300 font-semibold"
                    : "bg-emerald-500 text-black font-semibold shadow-sm"
                  : isDark
                  ? "text-slate-400 hover:text-slate-200"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Area</span>
            </button>
          </div>

          {/* Refresh Sheet LM */}
          <button
            onClick={onRefreshLmSheet}
            disabled={isLoading}
            className={`p-2 rounded-xl border text-xs transition flex items-center justify-center gap-1.5 font-medium disabled:opacity-50 ${
              isDark
                ? "bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300"
                : "bg-white hover:bg-slate-50 border-slate-200 text-slate-700 shadow-sm"
            }`}
            title="Muat Ulang Data Sheet LM"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-emerald-400" : ""}`} />
            <span className="hidden sm:inline">Refresh Data</span>
          </button>
        </div>
      </div>

      {/* 2. Top Summary Stat Cards */}
      {lmStats ? (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Total LM Count */}
          <div
            className={`border rounded-xl p-3.5 sm:p-4 flex flex-col justify-between ${
              isDark
                ? "bg-slate-900/80 border-slate-800"
                : "bg-slate-50 border-slate-200"
            }`}
          >
            <div
              className={`flex items-center justify-between text-xs mb-1.5 ${
                isDark ? "text-slate-400" : "text-slate-500"
              }`}
            >
              <span className="font-medium">Total LM</span>
              <div
                className={`p-1.5 rounded-lg ${
                  isDark ? "bg-emerald-500/10 text-emerald-400" : "bg-emerald-100 text-emerald-700"
                }`}
              >
                <Truck className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-extrabold tracking-tight">
                {lmStats.grandTotalLm.toLocaleString("id-ID")}
              </div>
              <p className="text-[11px] text-emerald-500 mt-1 font-medium">
                {lmStats.totalRecords.toLocaleString("id-ID")} data
              </p>
            </div>
          </div>

          {/* Rata-Rata Data / Hari */}
          <div
            className={`border rounded-xl p-3.5 sm:p-4 flex flex-col justify-between ${
              isDark
                ? "bg-slate-900/80 border-slate-800"
                : "bg-slate-50 border-slate-200"
            }`}
          >
            <div
              className={`flex items-center justify-between text-xs mb-1.5 ${
                isDark ? "text-slate-400" : "text-slate-500"
              }`}
            >
              <span className="font-medium">Rata-rata / Hari</span>
              <div
                className={`p-1.5 rounded-lg ${
                  isDark ? "bg-cyan-500/10 text-cyan-400" : "bg-cyan-100 text-cyan-700"
                }`}
              >
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-extrabold tracking-tight text-cyan-500">
                {lmStats.avgLmPerDay.toLocaleString("id-ID")}
              </div>
              <p
                className={`text-[11px] mt-1 ${
                  isDark ? "text-slate-400" : "text-slate-500"
                }`}
              >
                Per hari aktif
              </p>
            </div>
          </div>

          {/* Puncak Data Tertinggi */}
          <div
            className={`border rounded-xl p-3.5 sm:p-4 flex flex-col justify-between ${
              isDark
                ? "bg-slate-900/80 border-slate-800"
                : "bg-slate-50 border-slate-200"
            }`}
          >
            <div
              className={`flex items-center justify-between text-xs mb-1.5 ${
                isDark ? "text-slate-400" : "text-slate-500"
              }`}
            >
              <span className="font-medium">Puncak Tertinggi</span>
              <div
                className={`p-1.5 rounded-lg ${
                  isDark ? "bg-amber-500/10 text-amber-400" : "bg-amber-100 text-amber-700"
                }`}
              >
                <Flame className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-extrabold tracking-tight text-amber-500">
                {lmStats.peakDay ? lmStats.peakDay.totalLm.toLocaleString("id-ID") : "0"}
              </div>
              <p
                className="text-[11px] text-amber-500 mt-1 font-medium truncate"
                title={lmStats.peakDay?.formattedDate}
              >
                {lmStats.peakDay ? lmStats.peakDay.formattedDate : "-"}
              </p>
            </div>
          </div>

          {/* Hari Aktif Pengiriman */}
          <div
            className={`border rounded-xl p-3.5 sm:p-4 flex flex-col justify-between ${
              isDark
                ? "bg-slate-900/80 border-slate-800"
                : "bg-slate-50 border-slate-200"
            }`}
          >
            <div
              className={`flex items-center justify-between text-xs mb-1.5 ${
                isDark ? "text-slate-400" : "text-slate-500"
              }`}
            >
              <span className="font-medium">Hari Aktif</span>
              <div
                className={`p-1.5 rounded-lg ${
                  isDark ? "bg-purple-500/10 text-purple-400" : "bg-purple-100 text-purple-700"
                }`}
              >
                <CalendarDays className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-extrabold tracking-tight text-purple-500">
                {lmStats.dailyData.length}{" "}
                <span className="text-xs font-normal text-purple-400">Hari</span>
              </div>
              <p
                className={`text-[11px] mt-1 ${
                  isDark ? "text-slate-400" : "text-slate-500"
                }`}
              >
                Dalam periode filter
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {/* 3. Main Chart: Fluktuasi Harian */}
      {lmStats && lmStats.dailyData.length > 0 && (
        <div
          className={`border rounded-xl p-4 space-y-3 ${
            isDark ? "bg-slate-900/70 border-slate-800" : "bg-slate-50 border-slate-200"
          }`}
        >
          <div className="flex items-center justify-between text-xs">
            <div
              className={`flex items-center gap-2 font-semibold ${
                isDark ? "text-slate-300" : "text-slate-700"
              }`}
            >
              <BarChart3 className="w-4 h-4 text-emerald-500" />
              <span>Grafik Total LM Per Tanggal</span>
            </div>
            <div
              className={`text-[11px] hidden sm:block ${
                isDark ? "text-slate-400" : "text-slate-500"
              }`}
            >
              Garis Putus-putus: Rata-rata ({lmStats.avgLmPerDay.toLocaleString("id-ID")}/hari)
            </div>
          </div>

          <div className="h-64 sm:h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === "bar" ? (
                <BarChart data={lmStats.dailyData} margin={{ top: 10, right: 10, left: -15, bottom: 20 }}>
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
                    interval={lmStats.dailyData.length > 20 ? 2 : 0}
                  />
                  <YAxis stroke={isDark ? "#64748b" : "#94a3b8"} fontSize={11} tickLine={false} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item: DailyLmRecord = payload[0].payload;
                        return (
                          <div
                            className={`rounded-xl p-3 border shadow-2xl text-xs space-y-1.5 min-w-[190px] ${
                              isDark
                                ? "bg-slate-900 border-emerald-500/40 text-white"
                                : "bg-white border-slate-200 text-slate-900 shadow-md"
                            }`}
                          >
                            <div
                              className={`font-bold pb-1 flex items-center justify-between border-b ${
                                isDark ? "text-emerald-300 border-slate-800" : "text-emerald-600 border-slate-100"
                              }`}
                            >
                              <span>{item.fullFormattedDate}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm pt-0.5">
                              <span className={isDark ? "text-slate-400" : "text-slate-500"}>
                                Total LM:
                              </span>
                              <span className="font-extrabold text-base">
                                {item.totalLm.toLocaleString("id-ID")}
                              </span>
                            </div>
                            <div
                              className={`flex justify-between text-[11px] ${
                                isDark ? "text-slate-400" : "text-slate-500"
                              }`}
                            >
                              <span>Kontribusi:</span>
                              <span className="text-emerald-500 font-semibold">
                                {item.percentageOfTotal.toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <ReferenceLine
                    y={lmStats.avgLmPerDay}
                    stroke="#f59e0b"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                  />
                  <Bar
                    dataKey="totalLm"
                    fill="#10b981"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={38}
                  />
                </BarChart>
              ) : (
                <AreaChart data={lmStats.dailyData} margin={{ top: 10, right: 10, left: -15, bottom: 20 }}>
                  <defs>
                    <linearGradient id="lmAreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
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
                    interval={lmStats.dailyData.length > 20 ? 2 : 0}
                  />
                  <YAxis stroke={isDark ? "#64748b" : "#94a3b8"} fontSize={11} tickLine={false} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item: DailyLmRecord = payload[0].payload;
                        return (
                          <div
                            className={`rounded-xl p-3 border shadow-2xl text-xs space-y-1.5 min-w-[190px] ${
                              isDark
                                ? "bg-slate-900 border-emerald-500/40 text-white"
                                : "bg-white border-slate-200 text-slate-900 shadow-md"
                            }`}
                          >
                            <div
                              className={`font-bold pb-1 flex items-center justify-between border-b ${
                                isDark ? "text-emerald-300 border-slate-800" : "text-emerald-600 border-slate-100"
                              }`}
                            >
                              <span>{item.fullFormattedDate}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm pt-0.5">
                              <span className={isDark ? "text-slate-400" : "text-slate-500"}>
                                Total LM:
                              </span>
                              <span className="font-extrabold text-base">
                                {item.totalLm.toLocaleString("id-ID")}
                              </span>
                            </div>
                            <div
                              className={`flex justify-between text-[11px] ${
                                isDark ? "text-slate-400" : "text-slate-500"
                              }`}
                            >
                              <span>Kontribusi:</span>
                              <span className="text-emerald-500 font-semibold">
                                {item.percentageOfTotal.toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                    <ReferenceLine
                    y={lmStats.avgLmPerDay}
                    stroke="#f59e0b"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                  />
                  <Area
                    type="monotone"
                    dataKey="totalLm"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#lmAreaGrad)"
                  />
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};
