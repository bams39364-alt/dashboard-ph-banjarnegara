import React, { useState, useMemo } from "react";
import {
  Calendar,
  MapPin,
  Filter,
  RotateCcw,
  SlidersHorizontal,
  ChevronDown,
  X,
  Check,
  Search,
  Zap,
} from "lucide-react";
import { FilterState } from "../types";
import { getAvailableFilterOptions } from "../utils/dataHelper";
import { useTheme } from "../context/ThemeContext";

interface Props {
  headers: string[];
  rows: Record<string, any>[];
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  filteredCount: number;
  totalCount: number;
  extraRows?: Record<string, any>[];
  extraHeaders?: string[];
}

const MONTH_SHORT_LABELS: Record<string, string> = {
  "1": "Jan",
  "2": "Feb",
  "3": "Mar",
  "4": "Apr",
  "5": "Mei",
  "6": "Jun",
  "7": "Jul",
  "8": "Agu",
  "9": "Sep",
  "10": "Okt",
  "11": "Nov",
  "12": "Des",
};

export const DashboardFilters: React.FC<Props> = ({
  headers,
  rows,
  filters,
  onFilterChange,
  filteredCount,
  totalCount,
  extraRows = [],
  extraHeaders = [],
}) => {
  const { isDark } = useTheme();
  const currentYear = String(new Date().getFullYear());
  const currentMonth = String(new Date().getMonth() + 1);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [wilayahSearchQuery, setWilayahSearchQuery] = useState("");

  const { years, months, wilayahList } = useMemo(() => {
    return getAvailableFilterOptions(rows, headers, extraRows, extraHeaders);
  }, [rows, headers, extraRows, extraHeaders]);

  // Filtered list of wilayah based on search query in mobile modal
  const filteredWilayahList = useMemo(() => {
    if (!wilayahSearchQuery.trim()) return wilayahList;
    const q = wilayahSearchQuery.toLowerCase();
    return wilayahList.filter((w) => w.toLowerCase().includes(q));
  }, [wilayahList, wilayahSearchQuery]);

  const handleResetToCurrent = () => {
    const targetYear = years.includes(currentYear) ? currentYear : years[0] || currentYear;
    onFilterChange({
      year: targetYear,
      month: currentMonth,
      wilayah: "all",
    });
  };

  const handleClearAllFilters = () => {
    onFilterChange({
      year: "all",
      month: "all",
      wilayah: "all",
    });
  };

  // Active filter label helpers
  const activeMonthLabel = useMemo(() => {
    if (filters.month === "all") return "Semua Bulan";
    const found = months.find((m) => m.value === filters.month);
    return found ? found.label : `Bulan ${filters.month}`;
  }, [filters.month, months]);

  const activeMonthShort = useMemo(() => {
    if (filters.month === "all") return "Semua Bln";
    return MONTH_SHORT_LABELS[filters.month] || `Bln ${filters.month}`;
  }, [filters.month]);

  const activeYearLabel = filters.year === "all" ? "Semua Thn" : filters.year;
  const activeWilayahLabel =
    filters.wilayah === "all"
      ? "Semua Wilayah"
      : filters.wilayah.length > 12
      ? `${filters.wilayah.substring(0, 10)}...`
      : filters.wilayah;

  const isCustomFiltered =
    filters.year !== "all" || filters.month !== "all" || filters.wilayah !== "all";

  const isCurrentMonthActive =
    (filters.year === currentYear || (years.length > 0 && filters.year === years[0])) &&
    filters.month === currentMonth &&
    filters.wilayah === "all";

  return (
    <>
      {/* ======================================================== */}
      {/* 1. MOBILE VIEW (< md): REFINED COMPACT FILTER BAR         */}
      {/* ======================================================== */}
      <div
        className={`md:hidden border rounded-2xl p-3 shadow-sm space-y-2.5 transition-colors ${
          isDark
            ? "bg-[#0b1118] border-slate-800/90"
            : "bg-white border-slate-200"
        }`}
      >
        {/* Row 1: Header summary & Filter Modal Trigger */}
        <div className="flex items-center justify-between gap-2">
          {/* Active summary button that opens bottom sheet */}
          <button
            type="button"
            onClick={() => setIsMobileDrawerOpen(true)}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-left transition active:scale-[0.99] ${
              isDark
                ? "bg-slate-950/90 border-slate-800 hover:border-slate-700"
                : "bg-slate-50 border-slate-200 hover:border-slate-300"
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <div
                className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                  isDark
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "bg-emerald-50 text-emerald-600 border border-emerald-200"
                }`}
              >
                <Filter className="w-3.5 h-3.5" />
              </div>
              <div className="flex items-center gap-1.5 text-xs truncate">
                <span
                  className={`font-bold font-mono ${
                    isDark ? "text-emerald-400" : "text-emerald-700"
                  }`}
                >
                  {activeYearLabel}
                </span>
                <span className={isDark ? "text-slate-600" : "text-slate-300"}>•</span>
                <span
                  className={`font-semibold ${
                    isDark ? "text-indigo-300" : "text-indigo-600"
                  }`}
                >
                  {activeMonthShort}
                </span>
                <span className={isDark ? "text-slate-600" : "text-slate-300"}>•</span>
                <span
                  className={`truncate font-medium ${
                    isDark ? "text-slate-300" : "text-slate-700"
                  }`}
                >
                  {activeWilayahLabel}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-1.5">
              <span
                className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md border ${
                  isDark
                    ? "bg-slate-900 border-slate-800 text-slate-400"
                    : "bg-slate-200/70 border-slate-300 text-slate-600"
                }`}
              >
                {filteredCount} data
              </span>
              <ChevronDown
                className={`w-3.5 h-3.5 ${
                  isDark ? "text-slate-500" : "text-slate-400"
                }`}
              />
            </div>
          </button>
        </div>

        {/* Row 2: Direct 1-Tap Quick Action Pills (Horizontal Touch Bar) */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 text-xs">
          {/* Quick "Bulan Ini" Button */}
          <button
            type="button"
            onClick={handleResetToCurrent}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 shrink-0 transition ${
              isCurrentMonthActive
                ? isDark
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                  : "bg-emerald-100 text-emerald-800 border border-emerald-300"
                : isDark
                ? "bg-slate-950 border border-slate-800 text-slate-300 hover:text-white"
                : "bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200"
            }`}
          >
            <Zap className="w-3 h-3 text-amber-400 fill-amber-400" />
            <span>Bulan Ini</span>
          </button>

          {/* Direct Quick Select: Tahun */}
          <div className="relative shrink-0">
            <select
              value={filters.year}
              onChange={(e) => onFilterChange({ ...filters, year: e.target.value })}
              className={`pl-2 pr-6 py-1.5 rounded-lg text-xs font-semibold appearance-none border transition cursor-pointer focus:outline-none ${
                filters.year !== "all"
                  ? isDark
                    ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300"
                    : "bg-emerald-50 border-emerald-300 text-emerald-800"
                  : isDark
                  ? "bg-slate-950 border-slate-800 text-slate-400"
                  : "bg-slate-100 border-slate-200 text-slate-600"
              }`}
            >
              <option value="all">Semua Tahun</option>
              {years.map((y) => (
                <option key={y} value={y}>
                  Thn {y}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3 h-3 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-60" />
          </div>

          {/* Direct Quick Select: Bulan */}
          <div className="relative shrink-0">
            <select
              value={filters.month}
              onChange={(e) => onFilterChange({ ...filters, month: e.target.value })}
              className={`pl-2 pr-6 py-1.5 rounded-lg text-xs font-semibold appearance-none border transition cursor-pointer focus:outline-none ${
                filters.month !== "all"
                  ? isDark
                    ? "bg-indigo-950/40 border-indigo-500/40 text-indigo-300"
                    : "bg-indigo-50 border-indigo-300 text-indigo-800"
                  : isDark
                  ? "bg-slate-950 border-slate-800 text-slate-400"
                  : "bg-slate-100 border-slate-200 text-slate-600"
              }`}
            >
              <option value="all">Semua Bulan</option>
              {months.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3 h-3 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-60" />
          </div>

          {/* Direct Quick Select: Wilayah */}
          {wilayahList.length > 0 && (
            <div className="relative shrink-0">
              <select
                value={filters.wilayah}
                onChange={(e) => onFilterChange({ ...filters, wilayah: e.target.value })}
                className={`pl-2 pr-6 py-1.5 rounded-lg text-xs font-semibold appearance-none border transition cursor-pointer focus:outline-none max-w-[130px] truncate ${
                  filters.wilayah !== "all"
                    ? isDark
                      ? "bg-amber-950/40 border-amber-500/40 text-amber-300"
                      : "bg-amber-50 border-amber-300 text-amber-800"
                    : isDark
                    ? "bg-slate-950 border-slate-800 text-slate-400"
                    : "bg-slate-100 border-slate-200 text-slate-600"
                }`}
              >
                <option value="all">Semua Wilayah</option>
                {wilayahList.map((w) => (
                  <option key={w} value={w}>
                    {w}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-60" />
            </div>
          )}

          {/* Reset button if custom filtered */}
          {isCustomFiltered && (
            <button
              type="button"
              onClick={handleClearAllFilters}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border shrink-0 transition ${
                isDark
                  ? "bg-slate-900 border-slate-700 text-slate-400 hover:text-white"
                  : "bg-slate-200 border-slate-300 text-slate-700 hover:bg-slate-300"
              }`}
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. DESKTOP / TABLET VIEW (>= md): FULL EXPANDED CARD     */}
      {/* ======================================================== */}
      <div
        className={`hidden md:block border rounded-2xl p-4 sm:p-5 shadow-sm space-y-4 transition-colors ${
          isDark
            ? "bg-slate-900/90 border-slate-800"
            : "bg-white border-slate-200"
        }`}
      >
        {/* Title & Stats */}
        <div
          className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b ${
            isDark ? "border-slate-800/80" : "border-slate-100"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                isDark
                  ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
                  : "bg-emerald-50 border border-emerald-200 text-emerald-600"
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div>
              <h2
                className={`text-sm font-semibold flex items-center gap-2 ${
                  isDark ? "text-white" : "text-slate-900"
                }`}
              >
                Filter Data Pengiriman & Revenue
              </h2>
              <p
                className={`text-xs ${
                  isDark ? "text-slate-400" : "text-slate-500"
                }`}
              >
                Filter dinamis berdasarkan periode waktu dan wilayah operasional
              </p>
            </div>
          </div>

          {/* Counter Badge & Reset Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <div
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono border ${
                isDark
                  ? "bg-slate-950 border-slate-800 text-slate-300"
                  : "bg-slate-50 border-slate-200 text-slate-700"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="font-semibold">{filteredCount.toLocaleString("id-ID")}</span>
              <span className={isDark ? "text-slate-500" : "text-slate-400"}>
                / {totalCount.toLocaleString("id-ID")} data
              </span>
            </div>

            <button
              onClick={handleResetToCurrent}
              className={`px-2.5 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1 transition ${
                isDark
                  ? "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                  : "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200 shadow-sm"
              }`}
              title="Reset ke Bulan Ini"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Bulan Ini</span>
            </button>

            {isCustomFiltered && (
              <button
                onClick={handleClearAllFilters}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition ${
                  isDark
                    ? "bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"
                }`}
              >
                Semua Periode
              </button>
            )}
          </div>
        </div>

        {/* Dropdown Filters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          {/* 1. Dropdown Tahun */}
          <div className="space-y-1.5">
            <label
              className={`text-xs font-medium flex items-center gap-1.5 ${
                isDark ? "text-slate-300" : "text-slate-700"
              }`}
            >
              <Calendar
                className={`w-3.5 h-3.5 ${
                  isDark ? "text-emerald-400" : "text-emerald-600"
                }`}
              />
              <span>Tahun:</span>
            </label>
            <div className="relative">
              <select
                value={filters.year}
                onChange={(e) => onFilterChange({ ...filters, year: e.target.value })}
                className={`w-full border rounded-xl px-3.5 py-2.5 text-xs appearance-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-medium transition cursor-pointer pr-9 ${
                  isDark
                    ? "bg-slate-950 border-slate-700 hover:border-slate-600 text-white focus:border-emerald-500"
                    : "bg-white border-slate-300 hover:border-slate-400 text-slate-900 shadow-xs focus:border-emerald-500"
                }`}
              >
                <option value="all">-- Semua Tahun --</option>
                {years.map((yr) => (
                  <option key={yr} value={yr}>
                    Tahun {yr}
                  </option>
                ))}
              </select>
              <ChevronDown
                className={`w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none ${
                  isDark ? "text-slate-400" : "text-slate-500"
                }`}
              />
            </div>
          </div>

          {/* 2. Dropdown Bulan */}
          <div className="space-y-1.5">
            <label
              className={`text-xs font-medium flex items-center gap-1.5 ${
                isDark ? "text-slate-300" : "text-slate-700"
              }`}
            >
              <Calendar
                className={`w-3.5 h-3.5 ${
                  isDark ? "text-indigo-400" : "text-indigo-600"
                }`}
              />
              <span>Bulan:</span>
            </label>
            <div className="relative">
              <select
                value={filters.month}
                onChange={(e) => onFilterChange({ ...filters, month: e.target.value })}
                className={`w-full border rounded-xl px-3.5 py-2.5 text-xs appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium transition cursor-pointer pr-9 ${
                  isDark
                    ? "bg-slate-950 border-slate-700 hover:border-slate-600 text-white focus:border-indigo-500"
                    : "bg-white border-slate-300 hover:border-slate-400 text-slate-900 shadow-xs focus:border-indigo-500"
                }`}
              >
                <option value="all">-- Semua Bulan --</option>
                {months.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
              <ChevronDown
                className={`w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none ${
                  isDark ? "text-slate-400" : "text-slate-500"
                }`}
              />
            </div>
          </div>

          {/* 3. Dropdown Wilayah */}
          <div className="space-y-1.5">
            <label
              className={`text-xs font-medium flex items-center gap-1.5 ${
                isDark ? "text-slate-300" : "text-slate-700"
              }`}
            >
              <MapPin
                className={`w-3.5 h-3.5 ${
                  isDark ? "text-amber-400" : "text-amber-600"
                }`}
              />
              <span>Wilayah:</span>
            </label>
            <div className="relative">
              <select
                value={filters.wilayah}
                onChange={(e) => onFilterChange({ ...filters, wilayah: e.target.value })}
                className={`w-full border rounded-xl px-3.5 py-2.5 text-xs appearance-none focus:outline-none focus:ring-2 focus:ring-amber-500/20 font-medium transition cursor-pointer pr-9 ${
                  isDark
                    ? "bg-slate-950 border-slate-700 hover:border-slate-600 text-white focus:border-amber-500"
                    : "bg-white border-slate-300 hover:border-slate-400 text-slate-900 shadow-xs focus:border-amber-500"
                }`}
              >
                <option value="all">
                  {wilayahList.length > 0
                    ? `-- Semua Wilayah (${wilayahList.length} Wilayah) --`
                    : "-- Semua Wilayah --"}
                </option>
                {wilayahList.map((w) => (
                  <option key={w} value={w}>
                    {w}
                  </option>
                ))}
              </select>
              <ChevronDown
                className={`w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none ${
                  isDark ? "text-slate-400" : "text-slate-500"
                }`}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. MOBILE BOTTOM SHEET MODAL / VISUAL FILTER DRAWER      */}
      {/* ======================================================== */}
      {isMobileDrawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex flex-col justify-end bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          {/* Backdrop Click */}
          <div
            className="flex-1"
            onClick={() => setIsMobileDrawerOpen(false)}
          />

          {/* Drawer Content */}
          <div
            className={`border-t rounded-t-3xl p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto ${
              isDark
                ? "bg-[#0c1219] border-slate-800 text-white"
                : "bg-white border-slate-200 text-slate-900"
            }`}
          >
            {/* Drawer Handle */}
            <div
              className={`w-12 h-1.5 rounded-full mx-auto -mt-1 mb-1 ${
                isDark ? "bg-slate-700" : "bg-slate-300"
              }`}
            />

            {/* Drawer Header */}
            <div
              className={`flex items-center justify-between pb-3 border-b ${
                isDark ? "border-slate-800" : "border-slate-100"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                    isDark
                      ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
                      : "bg-emerald-50 border border-emerald-200 text-emerald-600"
                  }`}
                >
                  <SlidersHorizontal className="w-4 h-4" />
                </div>
                <div>
                  <h3
                    className={`text-sm font-bold ${
                      isDark ? "text-white" : "text-slate-900"
                    }`}
                  >
                    Pengaturan Filter
                  </h3>
                  <p
                    className={`text-[11px] ${
                      isDark ? "text-slate-400" : "text-slate-500"
                    }`}
                  >
                    Hasil terpilih: <strong>{filteredCount}</strong> dari {totalCount} data
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsMobileDrawerOpen(false)}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition ${
                  isDark
                    ? "bg-slate-800 text-slate-300 hover:text-white"
                    : "bg-slate-100 text-slate-600 hover:text-slate-900"
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Filter Presets */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResetToCurrent}
                className={`flex-1 py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                  isCurrentMonthActive
                    ? isDark
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                      : "bg-emerald-100 text-emerald-800 border-emerald-300"
                    : isDark
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 active:bg-emerald-500/20"
                    : "bg-emerald-50 border-emerald-200 text-emerald-700 active:bg-emerald-100"
                }`}
              >
                <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                <span>⚡ Set ke Bulan Ini</span>
              </button>

              <button
                type="button"
                onClick={handleClearAllFilters}
                className={`py-2.5 px-4 rounded-xl border text-xs font-semibold transition ${
                  isDark
                    ? "bg-slate-900 border-slate-800 text-slate-300 active:bg-slate-800"
                    : "bg-slate-100 border-slate-200 text-slate-700 active:bg-slate-200"
                }`}
              >
                Tampilkan Semua
              </button>
            </div>

            {/* 1. SELEKSI TAHUN (Touch Pills) */}
            <div className="space-y-2 pt-1">
              <label
                className={`text-xs font-bold flex items-center gap-1.5 ${
                  isDark ? "text-slate-300" : "text-slate-700"
                }`}
              >
                <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                <span>1. Pilih Tahun</span>
              </label>
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                <button
                  type="button"
                  onClick={() => onFilterChange({ ...filters, year: "all" })}
                  className={`px-3 py-2 rounded-xl text-xs font-bold shrink-0 transition border ${
                    filters.year === "all"
                      ? "bg-emerald-500 text-slate-950 border-emerald-400 shadow-sm"
                      : isDark
                      ? "bg-slate-900 border-slate-800 text-slate-300 hover:text-white"
                      : "bg-slate-100 border-slate-200 text-slate-700"
                  }`}
                >
                  Semua Tahun
                </button>
                {years.map((y) => (
                  <button
                    key={y}
                    type="button"
                    onClick={() => onFilterChange({ ...filters, year: y })}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 font-mono transition border ${
                      filters.year === y
                        ? "bg-emerald-500 text-slate-950 border-emerald-400 shadow-sm"
                        : isDark
                        ? "bg-slate-900 border-slate-800 text-slate-300 hover:text-white"
                        : "bg-slate-100 border-slate-200 text-slate-700"
                    }`}
                  >
                    Tahun {y}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. SELEKSI BULAN (Visual 4x3 Month Grid) */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <label
                  className={`text-xs font-bold flex items-center gap-1.5 ${
                    isDark ? "text-slate-300" : "text-slate-700"
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                  <span>2. Pilih Bulan</span>
                </label>
                <button
                  type="button"
                  onClick={() => onFilterChange({ ...filters, month: "all" })}
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-md border transition ${
                    filters.month === "all"
                      ? "bg-indigo-500 text-white border-indigo-400"
                      : isDark
                      ? "text-indigo-400 border-indigo-500/30 bg-indigo-500/10"
                      : "text-indigo-600 border-indigo-200 bg-indigo-50"
                  }`}
                >
                  Semua Bulan
                </button>
              </div>

              {/* 4x3 Grid of 12 Months */}
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { num: "1", label: "Jan" },
                  { num: "2", label: "Feb" },
                  { num: "3", label: "Mar" },
                  { num: "4", label: "Apr" },
                  { num: "5", label: "Mei" },
                  { num: "6", label: "Jun" },
                  { num: "7", label: "Jul" },
                  { num: "8", label: "Agu" },
                  { num: "9", label: "Sep" },
                  { num: "10", label: "Okt" },
                  { num: "11", label: "Nov" },
                  { num: "12", label: "Des" },
                ].map((m) => {
                  const isSelected = filters.month === m.num;
                  const isCurrent = m.num === currentMonth;
                  return (
                    <button
                      key={m.num}
                      type="button"
                      onClick={() => onFilterChange({ ...filters, month: m.num })}
                      className={`py-2 px-1 rounded-xl text-xs font-semibold border transition flex flex-col items-center justify-center relative ${
                        isSelected
                          ? "bg-indigo-600 text-white border-indigo-500 shadow-md font-bold"
                          : isDark
                          ? "bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white"
                          : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <span>{m.label}</span>
                      {isCurrent && (
                        <span
                          className={`text-[8px] font-mono leading-none mt-0.5 ${
                            isSelected
                              ? "text-indigo-200"
                              : isDark
                              ? "text-emerald-400"
                              : "text-emerald-600"
                          }`}
                        >
                          Ini
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. SELEKSI WILAYAH */}
            {wilayahList.length > 0 && (
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <label
                    className={`text-xs font-bold flex items-center gap-1.5 ${
                      isDark ? "text-slate-300" : "text-slate-700"
                    }`}
                  >
                    <MapPin className="w-3.5 h-3.5 text-amber-400" />
                    <span>3. Pilih Wilayah Operasional</span>
                  </label>
                  <span
                    className={`text-[11px] ${
                      isDark ? "text-slate-500" : "text-slate-400"
                    }`}
                  >
                    {wilayahList.length} Wilayah
                  </span>
                </div>

                {/* Search Bar for Wilayah */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={wilayahSearchQuery}
                    onChange={(e) => setWilayahSearchQuery(e.target.value)}
                    placeholder="Cari nama wilayah / kecamatan..."
                    className={`w-full pl-8.5 pr-3.5 py-2 rounded-xl text-xs border focus:outline-none transition ${
                      isDark
                        ? "bg-slate-950 border-slate-800 text-white placeholder-slate-500 focus:border-amber-500"
                        : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-amber-500"
                    }`}
                  />
                  {wilayahSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setWilayahSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Wilayah Horizontal / Grid Chips */}
                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1 rounded-xl border border-dashed border-slate-700/50">
                  <button
                    type="button"
                    onClick={() => onFilterChange({ ...filters, wilayah: "all" })}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition border ${
                      filters.wilayah === "all"
                        ? "bg-amber-500 text-slate-950 border-amber-400 font-bold"
                        : isDark
                        ? "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
                        : "bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    Semua Wilayah
                  </button>
                  {filteredWilayahList.map((w) => {
                    const isSel = filters.wilayah === w;
                    return (
                      <button
                        key={w}
                        type="button"
                        onClick={() => onFilterChange({ ...filters, wilayah: w })}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition border truncate max-w-[160px] ${
                          isSel
                            ? "bg-amber-500 text-slate-950 border-amber-400 font-bold shadow-xs"
                            : isDark
                            ? "bg-slate-900/90 border-slate-800 text-slate-300 hover:text-white"
                            : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        {w}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Apply & Close Button */}
            <div className="pt-2 sticky bottom-0 bg-inherit pb-1">
              <button
                type="button"
                onClick={() => setIsMobileDrawerOpen(false)}
                className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-xl transition active:scale-[0.98]"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Terapkan Filter ({filteredCount.toLocaleString("id-ID")} Baris Cocok)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
