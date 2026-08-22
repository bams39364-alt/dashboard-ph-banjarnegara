import React, { useState, useMemo } from "react";
import {
  Trophy,
  Crown,
  Medal,
  Users,
  PackageCheck,
  TrendingUp,
  DollarSign,
  Building2,
  Sparkles,
  ArrowUpRight,
  BarChart3,
  Layers,
  ChevronDown,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { SheetData, FilterState } from "../types";
import {
  findSenderColumn,
  findRevenueColumn,
  formatIDR,
  getRowTotalPayment,
  MONTH_NAMES_ID,
} from "../utils/dataHelper";
import { useTheme } from "../context/ThemeContext";

interface Props {
  sheetData: SheetData;
  filteredRows: Record<string, any>[];
  filters: FilterState;
}

interface SenderStat {
  rank: number;
  name: string;
  count: number;
  percentage: number;
  totalRevenue: number;
  avgRevenue: number;
}

export const TopSendersCard: React.FC<Props> = ({
  sheetData,
  filteredRows,
  filters,
}) => {
  const { isDark } = useTheme();
  const { headers } = sheetData;
  const rows = filteredRows;

  // 1. Detect or manually select sender_name column
  const detectedSenderCol = useMemo(() => {
    return (
      findSenderColumn(headers) ||
      headers.find((h) => /sender|pengirim|shipper|customer|merchant|toko/i.test(h)) ||
      headers[0] ||
      ""
    );
  }, [headers]);

  const [selectedCol, setSelectedCol] = useState<string>(detectedSenderCol);

  // Sync state if detected column changes
  React.useEffect(() => {
    if (detectedSenderCol && headers.includes(detectedSenderCol)) {
      setSelectedCol(detectedSenderCol);
    }
  }, [detectedSenderCol, headers]);

  // Active filter labels
  const selectedMonthLabel =
    filters.month === "all"
      ? "Semua Bulan"
      : MONTH_NAMES_ID.find((m) => m.value === filters.month)?.label || `Bulan ${filters.month}`;
  const selectedYearLabel = filters.year === "all" ? "Semua Tahun" : `Tahun ${filters.year}`;
  const selectedWilayahLabel = filters.wilayah === "all" ? "Semua Wilayah" : filters.wilayah;

  // 2. Aggregate Top Senders
  const { top5Senders, allUniqueSendersCount, totalFilteredShipments, totalTop5Shipments, top5SharePercentage } =
    useMemo(() => {
      if (!rows.length || !selectedCol) {
        return {
          top5Senders: [],
          allUniqueSendersCount: 0,
          totalFilteredShipments: 0,
          totalTop5Shipments: 0,
          top5SharePercentage: 0,
        };
      }

      const senderMap = new Map<string, { count: number; totalRevenue: number }>();
      let totalShipments = 0;

      rows.forEach((r) => {
        totalShipments++;
        const rawVal = r[selectedCol];
        let sName = rawVal !== undefined && rawVal !== null ? String(rawVal).trim() : "";
        if (!sName || sName === "-" || sName === "n/a" || sName === "null") {
          sName = "Tidak Terdefinisi (Tanpa Nama)";
        }

        const rev = getRowTotalPayment(r, headers);
        const existing = senderMap.get(sName) || { count: 0, totalRevenue: 0 };
        senderMap.set(sName, {
          count: existing.count + 1,
          totalRevenue: existing.totalRevenue + rev,
        });
      });

      // Sort by count descending, then by revenue descending
      const sorted: SenderStat[] = Array.from(senderMap.entries())
        .sort((a, b) => {
          if (b[1].count !== a[1].count) {
            return b[1].count - a[1].count;
          }
          return b[1].totalRevenue - a[1].totalRevenue;
        })
        .map((entry, index) => {
          const count = entry[1].count;
          const totalRevenue = entry[1].totalRevenue;
          const percentage = totalShipments > 0 ? (count / totalShipments) * 100 : 0;
          const avgRevenue = count > 0 ? totalRevenue / count : 0;
          return {
            rank: index + 1,
            name: entry[0],
            count,
            percentage,
            totalRevenue,
            avgRevenue,
          };
        });

      const top5 = sorted.slice(0, 5);
      const top5Sum = top5.reduce((acc, s) => acc + s.count, 0);
      const top5Share = totalShipments > 0 ? (top5Sum / totalShipments) * 100 : 0;

      return {
        top5Senders: top5,
        allUniqueSendersCount: senderMap.size,
        totalFilteredShipments: totalShipments,
        totalTop5Shipments: top5Sum,
        top5SharePercentage: top5Share,
      };
    }, [rows, selectedCol, headers]);

  // Rank styling helper
  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return {
          bg: isDark ? "bg-amber-500/15 border-amber-500/30 text-amber-300" : "bg-amber-100 border-amber-300 text-amber-800",
          icon: <Crown className="w-4 h-4 text-amber-500 fill-amber-500/20" />,
          pill: "bg-amber-500 text-slate-950 font-black",
          barColor: "from-amber-500 to-yellow-400",
          glow: isDark ? "shadow-amber-500/10" : "shadow-amber-200/50",
        };
      case 2:
        return {
          bg: isDark ? "bg-slate-300/15 border-slate-300/30 text-slate-200" : "bg-slate-100 border-slate-300 text-slate-800",
          icon: <Medal className="w-4 h-4 text-slate-400" />,
          pill: "bg-slate-300 text-slate-950 font-black",
          barColor: "from-slate-400 to-slate-300",
          glow: isDark ? "shadow-slate-400/10" : "shadow-slate-200/50",
        };
      case 3:
        return {
          bg: isDark ? "bg-orange-600/15 border-orange-500/30 text-orange-300" : "bg-orange-100 border-orange-300 text-orange-800",
          icon: <Medal className="w-4 h-4 text-orange-500" />,
          pill: "bg-orange-500 text-slate-950 font-black",
          barColor: "from-orange-500 to-amber-600",
          glow: isDark ? "shadow-orange-500/10" : "shadow-orange-200/50",
        };
      case 4:
        return {
          bg: isDark ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300" : "bg-emerald-50 border-emerald-200 text-emerald-800",
          icon: <PackageCheck className="w-4 h-4 text-emerald-500" />,
          pill: "bg-emerald-600 text-white font-bold",
          barColor: "from-emerald-500 to-teal-400",
          glow: isDark ? "shadow-emerald-500/10" : "shadow-emerald-200/50",
        };
      default:
        return {
          bg: isDark ? "bg-indigo-500/15 border-indigo-500/30 text-indigo-300" : "bg-indigo-50 border-indigo-200 text-indigo-800",
          icon: <PackageCheck className="w-4 h-4 text-indigo-500" />,
          pill: "bg-indigo-600 text-white font-bold",
          barColor: "from-indigo-500 to-blue-400",
          glow: isDark ? "shadow-indigo-500/10" : "shadow-indigo-200/50",
        };
    }
  };

  const highestCount = top5Senders[0]?.count || 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`border rounded-2xl p-5 sm:p-6 shadow-sm transition-colors ${
        isDark ? "bg-[#0b1118] border-slate-800/90" : "bg-white border-slate-200"
      }`}
    >
      {/* 1. Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800/80">
        <div className="flex items-center gap-3.5">
          <motion.div
            whileHover={{ scale: 1.05, rotate: 6 }}
            className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-inner ${
              isDark
                ? "bg-amber-500/10 border border-amber-500/30 text-amber-400"
                : "bg-amber-50 border border-amber-200 text-amber-600"
            }`}
          >
            <Trophy className="w-5 h-5" />
          </motion.div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-extrabold tracking-tight">
                Top 5 Kiriman Terbanyak
              </h3>
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                  isDark
                    ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                    : "bg-amber-50 text-amber-700 border-amber-200"
                }`}
              >
                Pengirim / Sender
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Peringkat pengirim dengan volume paket dan kontribusi transaksi tertinggi ({selectedMonthLabel} {selectedYearLabel} &bull; {selectedWilayahLabel})
            </p>
          </div>
        </div>

        {/* Right Controls: Column Picker & Summary */}
        <div className="flex items-center gap-2.5 self-start sm:self-center flex-wrap">
          <div className="flex items-center gap-1.5 text-xs">
            <span
              className={`text-[11px] font-medium ${
                isDark ? "text-slate-400" : "text-slate-500"
              }`}
            >
              Kolom:
            </span>
            <div className="relative">
              <select
                value={selectedCol}
                onChange={(e) => setSelectedCol(e.target.value)}
                className={`border rounded-lg pl-2.5 pr-7 py-1 text-xs focus:outline-none focus:border-amber-500 font-mono appearance-none transition ${
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
              <ChevronDown
                className={`w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none ${
                  isDark ? "text-slate-500" : "text-slate-400"
                }`}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 2. Mini KPI Highlights */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 my-5">
        <div
          className={`border rounded-xl p-3.5 transition ${
            isDark ? "bg-slate-950/60 border-slate-800/80" : "bg-slate-50/80 border-slate-200"
          }`}
        >
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-1">
            <span>Total Pengirim Aktif</span>
            <Users className="w-3.5 h-3.5 text-blue-500" />
          </div>
          <div className="text-lg sm:text-xl font-bold font-mono text-slate-900 dark:text-white">
            {allUniqueSendersCount.toLocaleString("id-ID")}{" "}
            <span className="text-xs font-normal text-slate-500">nama</span>
          </div>
        </div>

        <div
          className={`border rounded-xl p-3.5 transition ${
            isDark ? "bg-slate-950/60 border-slate-800/80" : "bg-slate-50/80 border-slate-200"
          }`}
        >
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-1">
            <span>Volume Paket Top 5</span>
            <PackageCheck className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="text-lg sm:text-xl font-bold font-mono text-amber-600 dark:text-amber-400">
            {totalTop5Shipments.toLocaleString("id-ID")}{" "}
            <span className="text-xs font-normal text-slate-500">kiriman</span>
          </div>
        </div>

        <div
          className={`border rounded-xl p-3.5 col-span-2 sm:col-span-1 transition ${
            isDark ? "bg-slate-950/60 border-slate-800/80" : "bg-slate-50/80 border-slate-200"
          }`}
        >
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-1">
            <span>Dominasi Top 5</span>
            <BarChart3 className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <div className="text-lg sm:text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
            {top5SharePercentage.toFixed(1)}%{" "}
            <span className="text-xs font-normal text-slate-500">dari total</span>
          </div>
        </div>
      </div>

      {/* 3. Top 5 List & Ranking Details */}
      {top5Senders.length === 0 ? (
        <div
          className={`p-8 text-center rounded-xl border border-dashed text-xs ${
            isDark ? "border-slate-800 text-slate-500" : "border-slate-300 text-slate-400"
          }`}
        >
          Tidak ada data pengirim yang cocok dengan filter saat ini.
        </div>
      ) : (
        <div className="space-y-3.5">
          {top5Senders.map((sender, idx) => {
            const badge = getRankBadge(sender.rank);
            const relativeWidth = Math.max((sender.count / highestCount) * 100, 4);

            return (
              <motion.div
                key={sender.name + idx}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: idx * 0.05 }}
                className={`border rounded-xl p-3.5 sm:p-4 transition-all duration-200 hover:shadow-md ${
                  isDark
                    ? "bg-slate-900/80 border-slate-800 hover:border-slate-700"
                    : "bg-white border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* Left: Rank, Avatar & Name */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border shadow-xs font-bold text-xs ${badge.bg}`}
                    >
                      {sender.rank <= 3 ? badge.icon : `#${sender.rank}`}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`font-bold text-sm truncate max-w-[240px] sm:max-w-[360px] ${
                            isDark ? "text-white" : "text-slate-900"
                          }`}
                          title={sender.name}
                        >
                          {sender.name}
                        </span>
                        {sender.rank === 1 && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-amber-500/20 text-amber-400 border border-amber-500/40">
                            Teratas #1
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2 flex-wrap">
                        <span>Pangsa: <strong className="text-slate-700 dark:text-slate-300 font-mono">{sender.percentage.toFixed(1)}%</strong></span>
                        {sender.totalRevenue > 0 && (
                          <>
                            <span>&bull;</span>
                            <span>Total Rev: <strong className="text-emerald-600 dark:text-emerald-400 font-mono">{formatIDR(sender.totalRevenue)}</strong></span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Quantity & Avg Stats */}
                  <div className="flex items-center justify-between sm:justify-end gap-5 pl-11 sm:pl-0">
                    <div className="text-left sm:text-right">
                      <div className="text-xs text-slate-400 uppercase tracking-wider">Volume</div>
                      <div className="text-base sm:text-lg font-bold font-mono text-indigo-600 dark:text-indigo-400">
                        {sender.count.toLocaleString("id-ID")}{" "}
                        <span className="text-xs font-normal text-slate-500">paket</span>
                      </div>
                    </div>

                    {sender.avgRevenue > 0 && (
                      <div className="text-right hidden md:block">
                        <div className="text-xs text-slate-400 uppercase tracking-wider">Avg/Paket</div>
                        <div className="text-xs sm:text-sm font-semibold font-mono text-slate-700 dark:text-slate-300">
                          {formatIDR(sender.avgRevenue)}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Relative Volume Progress Bar */}
                <div className="mt-3 w-full bg-slate-100 dark:bg-slate-950/80 rounded-full h-2 overflow-hidden border border-slate-200/50 dark:border-slate-800">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${relativeWidth}%` }}
                    transition={{ duration: 0.6, ease: "easeOut", delay: idx * 0.05 }}
                    className={`h-full rounded-full bg-gradient-to-r ${badge.barColor}`}
                  />
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
};
