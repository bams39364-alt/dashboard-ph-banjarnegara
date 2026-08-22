import React from "react";
import {
  TrendingUp,
  DollarSign,
  Package,
  Calendar,
  Layers,
  MapPin,
  Clock,
  ShieldCheck,
  Building2,
  Sparkles,
} from "lucide-react";
import { motion } from "motion/react";
import { SheetData, FilterState } from "../types";
import { calculateFilteredMetrics, formatIDR, MONTH_NAMES_ID } from "../utils/dataHelper";
import { useTheme } from "../context/ThemeContext";

interface Props {
  sheetData: SheetData;
  filteredRows: Record<string, any>[];
  filters: FilterState;
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.98 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring" as const,
      stiffness: 350,
      damping: 24,
    },
  },
};

export const DashboardMetrics: React.FC<Props> = ({
  sheetData,
  filteredRows,
  filters,
}) => {
  const { isDark } = useTheme();
  const { headers } = sheetData;
  const metrics = calculateFilteredMetrics(filteredRows, headers);

  const selectedMonthLabel =
    filters.month === "all"
      ? "Semua Bulan"
      : MONTH_NAMES_ID.find((m) => m.value === filters.month)?.label || `Bulan ${filters.month}`;

  const selectedYearLabel = filters.year === "all" ? "Semua Tahun" : `Tahun ${filters.year}`;
  const selectedWilayahLabel = filters.wilayah === "all" ? "Semua Wilayah" : filters.wilayah;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5"
    >
      {/* CARD 1: TOTAL PENGIRIMAN */}
      <motion.div
        variants={cardVariants}
        whileHover={{ y: -3, transition: { duration: 0.2 } }}
        className={`border rounded-2xl p-5 shadow-sm transition-shadow flex flex-col justify-between group ${
          isDark
            ? "bg-slate-900 border-slate-800 hover:border-blue-500/40 hover:shadow-lg hover:shadow-blue-500/5"
            : "bg-white border-slate-200 hover:border-blue-300 hover:shadow-md"
        }`}
      >
        <div>
          <div className="flex items-center justify-between">
            <span
              className={`text-xs font-semibold uppercase tracking-wider ${
                isDark ? "text-slate-400" : "text-slate-500"
              }`}
            >
              Total Pengiriman
            </span>
            <motion.div
              whileHover={{ rotate: 8, scale: 1.1 }}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-transform ${
                isDark
                  ? "bg-blue-500/10 border border-blue-500/20 text-blue-400"
                  : "bg-blue-50 border border-blue-200 text-blue-600"
              }`}
            >
              <Package className="w-4 h-4" />
            </motion.div>
          </div>

          <div className="mt-3 flex items-baseline gap-2">
            <span
              className={`text-3xl font-bold font-mono tracking-tight ${
                isDark ? "text-white" : "text-slate-900"
              }`}
            >
              {metrics.totalPengiriman.toLocaleString("id-ID")}
            </span>
            <span
              className={`text-xs font-medium ${
                isDark ? "text-slate-400" : "text-slate-500"
              }`}
            >
              pengiriman
            </span>
          </div>
        </div>

        <div
          className={`mt-4 pt-3 border-t flex items-center justify-between text-[11px] ${
            isDark
              ? "border-slate-800/80 text-slate-400"
              : "border-slate-100 text-slate-500"
          }`}
        >
          <span
            className={`flex items-center gap-1 font-medium ${
              isDark ? "text-blue-400" : "text-blue-600"
            }`}
          >
            <TrendingUp className="w-3 h-3" /> Berdasarkan Filter
          </span>
          <span
            className="truncate max-w-[150px]"
            title={`${selectedMonthLabel} ${selectedYearLabel}`}
          >
            {selectedMonthLabel} {filters.year !== "all" ? filters.year : ""}
          </span>
        </div>
      </motion.div>

      {/* CARD 2: TOTAL REVENUE & TOTAL COP */}
      <motion.div
        variants={cardVariants}
        whileHover={{ y: -3, transition: { duration: 0.2 } }}
        className={`border rounded-2xl p-5 shadow-sm transition-shadow flex flex-col justify-between group ${
          isDark
            ? "bg-slate-900 border-slate-800 hover:border-emerald-500/40 hover:shadow-lg hover:shadow-emerald-500/5"
            : "bg-white border-slate-200 hover:border-emerald-300 hover:shadow-md"
        }`}
      >
        <div>
          <div className="flex items-center justify-between">
            <span
              className={`text-xs font-semibold uppercase tracking-wider ${
                isDark ? "text-slate-400" : "text-slate-500"
              }`}
            >
              Total Revenue
            </span>
            <motion.div
              whileHover={{ rotate: 8, scale: 1.1 }}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-transform ${
                isDark
                  ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                  : "bg-emerald-50 border border-emerald-200 text-emerald-600"
              }`}
            >
              <DollarSign className="w-4 h-4" />
            </motion.div>
          </div>

          <div className="mt-3 flex items-baseline gap-2">
            <span
              className={`text-2xl sm:text-3xl font-extrabold font-mono tracking-tight ${
                isDark ? "text-emerald-400" : "text-emerald-600"
              }`}
            >
              {formatIDR(metrics.totalRevenue)}
            </span>
          </div>
        </div>

        {/* SUB-STAT: TOTAL COP (fix_cost_list_cop) */}
        <div
          className={`mt-4 pt-3 border-t space-y-1 ${
            isDark ? "border-slate-800/80" : "border-slate-100"
          }`}
        >
          <div className="flex items-center justify-between text-xs">
            <span
              className={`font-medium flex items-center gap-1.5 ${
                isDark ? "text-slate-400" : "text-slate-600"
              }`}
            >
              <Building2
                className={`w-3.5 h-3.5 ${
                  isDark ? "text-amber-400" : "text-amber-600"
                }`}
              />
              <span>Total COP (fix_cost):</span>
            </span>
            <span
              className={`font-mono font-bold ${
                isDark ? "text-amber-300" : "text-amber-600"
              }`}
            >
              {formatIDR(metrics.totalCOPRevenue)}
            </span>
          </div>
          <div
            className={`text-[11px] flex justify-between ${
              isDark ? "text-slate-500" : "text-slate-400"
            }`}
          >
            <span>Volume Transaksi COP:</span>
            <span
              className={`font-mono font-medium ${
                isDark ? "text-slate-400" : "text-slate-600"
              }`}
            >
              {metrics.totalCOPPengiriman} pengiriman
            </span>
          </div>
        </div>
      </motion.div>

      {/* CARD 3: RATA-RATA REVENUE PER HARI */}
      <motion.div
        variants={cardVariants}
        whileHover={{ y: -3, transition: { duration: 0.2 } }}
        className={`border rounded-2xl p-5 shadow-sm transition-shadow flex flex-col justify-between group sm:col-span-2 lg:col-span-1 ${
          isDark
            ? "bg-slate-900 border-slate-800 hover:border-indigo-500/40 hover:shadow-lg hover:shadow-indigo-500/5"
            : "bg-white border-slate-200 hover:border-indigo-300 hover:shadow-md"
        }`}
      >
        <div>
          <div className="flex items-center justify-between">
            <span
              className={`text-xs font-semibold uppercase tracking-wider ${
                isDark ? "text-slate-400" : "text-slate-500"
              }`}
            >
              Rata-rata Revenue / Hari
            </span>
            <motion.div
              whileHover={{ rotate: 8, scale: 1.1 }}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-transform ${
                isDark
                  ? "bg-indigo-500/10 border border-indigo-500/20 text-indigo-400"
                  : "bg-indigo-50 border border-indigo-200 text-indigo-600"
              }`}
            >
              <Calendar className="w-4 h-4" />
            </motion.div>
          </div>

          <div className="mt-3 flex items-baseline gap-2">
            <span
              className={`text-2xl sm:text-3xl font-extrabold font-mono tracking-tight ${
                isDark ? "text-indigo-300" : "text-indigo-600"
              }`}
            >
              {formatIDR(metrics.avgRevenuePerHari)}
            </span>
            <span
              className={`text-xs font-medium ${
                isDark ? "text-slate-400" : "text-slate-500"
              }`}
            >
              / hari
            </span>
          </div>
        </div>

        <div
          className={`mt-4 pt-3 border-t flex items-center justify-between text-[11px] ${
            isDark
              ? "border-slate-800/80 text-slate-400"
              : "border-slate-100 text-slate-500"
          }`}
        >
          <span
            className={`flex items-center gap-1 font-medium ${
              isDark ? "text-indigo-400" : "text-indigo-600"
            }`}
          >
            <Clock className="w-3 h-3" /> {metrics.activeDaysCount} Hari Aktif Transaksi
          </span>
          <span
            className="truncate max-w-[130px]"
            title={selectedWilayahLabel}
          >
            {selectedWilayahLabel}
          </span>
        </div>
      </motion.div>
    </motion.div>
  );
};

