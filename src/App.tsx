import React, { useState, useEffect, useMemo } from "react";
import {
  FileSpreadsheet,
  Database,
  BarChart3,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  Info,
  Zap,
  Truck,
  Receipt,
  Sun,
  Moon,
  Pill,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { sheetsService, extractSpreadsheetId } from "./services/googleSheets";
import { SheetData, SheetFile, FilterState } from "./types";
import { DashboardMetrics } from "./components/DashboardMetrics";
import { DashboardCharts } from "./components/DashboardCharts";
import { MonthOverMonthComparisonCard } from "./components/MonthOverMonthComparisonCard";
import { TotalLmPertanggalCard } from "./components/TotalLmPertanggalCard";
import { ExpenseDashboardView } from "./components/ExpenseDashboardView";
import { PaxelFarmaDashboardView } from "./components/PaxelFarmaDashboardView";
import { TopSendersCard } from "./components/TopSendersCard";
import { DatabaseTableView } from "./components/DatabaseTableView";
import { SpreadsheetSelectorModal } from "./components/SpreadsheetSelectorModal";
import { DashboardFilters } from "./components/DashboardFilters";
import { filterRows, getAvailableFilterOptions } from "./utils/dataHelper";
import { useTheme } from "./context/ThemeContext";

const TARGET_DEFAULT_SHEET_URL =
  "https://docs.google.com/spreadsheets/d/1gPNDNySosYpbckuWHINRJT8qmmnJIvA_eD-zkqqsTHg/edit?gid=0#gid=0";
const TARGET_DEFAULT_ID = "1gPNDNySosYpbckuWHINRJT8qmmnJIvA_eD-zkqqsTHg";

const INITIAL_EMPTY_SHEET_DATA: SheetData = {
  spreadsheetId: TARGET_DEFAULT_ID,
  spreadsheetTitle: "Google Spreadsheet (Memuat...)",
  sheets: [{ sheetId: 0, title: "Sheet1" }],
  activeSheetTitle: "Sheet1",
  headers: [],
  rows: [],
  rawValues: [],
};

export default function App() {
  const { theme, isDark, toggleTheme } = useTheme();
  const [isAuthenticated, setIsAuthenticated] = useState(sheetsService.isAuthenticated());
  const [activeView, setActiveView] = useState<"dashboard" | "lm" | "expense" | "charts" | "farma">("dashboard");
  const [sheetData, setSheetData] = useState<SheetData>(INITIAL_EMPTY_SHEET_DATA);
  const [lmSheetData, setLmSheetData] = useState<SheetData | null>(null);
  const [isLmLoading, setIsLmLoading] = useState(false);
  const [expenseSheetData, setExpenseSheetData] = useState<SheetData | null>(null);
  const [isExpenseLoading, setIsExpenseLoading] = useState(false);
  const [spreadsheetFiles, setSpreadsheetFiles] = useState<SheetFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<SheetFile | null>(null);

  // Filters State: Defaults to current month & current year
  const [filters, setFilters] = useState<FilterState>(() => {
    const curYear = String(new Date().getFullYear());
    const curMonth = String(new Date().getMonth() + 1);
    return {
      year: curYear,
      month: curMonth,
      wilayah: "all",
    };
  });

  const [inputUrlOrId, setInputUrlOrId] = useState(TARGET_DEFAULT_SHEET_URL);
  const [isLoading, setIsLoading] = useState(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [useFilterForTable, setUseFilterForTable] = useState(true);

  // Auto-hide notification banner
  useEffect(() => {
    if (notification) {
      const t = setTimeout(() => setNotification(null), 4000);
      return () => clearTimeout(t);
    }
  }, [notification]);

  // Initial load
  useEffect(() => {
    loadTargetSpreadsheet(TARGET_DEFAULT_SHEET_URL);
    if (isAuthenticated) {
      loadSpreadsheetList();
    }
  }, []);

  // Filtered rows calculation
  const filteredRows = useMemo(() => {
    return filterRows(sheetData.rows, sheetData.headers, filters);
  }, [sheetData.rows, sheetData.headers, filters]);

  // Handle Google OAuth Login
  const handleConnectGoogle = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      await sheetsService.requestOAuthToken();
      setIsAuthenticated(true);
      setNotification("Berhasil terhubung ke Google Sheets!");
      const currentTarget = selectedFile ? selectedFile.id : TARGET_DEFAULT_SHEET_URL;
      await loadTargetSpreadsheet(currentTarget);
      await loadSpreadsheetList();
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Gagal menghubungkan akun Google");
    } finally {
      setIsLoading(false);
    }
  };

  // Load file list from Google Drive
  const loadSpreadsheetList = async () => {
    if (!sheetsService.isAuthenticated()) return;
    try {
      const files = await sheetsService.listSpreadsheets();
      setSpreadsheetFiles(files);
    } catch (err: any) {
      if (err.message.includes("expired")) {
        setIsAuthenticated(false);
      }
      console.warn("Could not list drive files:", err.message);
    }
  };

  // Fetch specifically the DATA LM sheet tab
  const loadLmSheetData = async (spreadsheetId: string, customTabTitle: string = "DATA LM") => {
    setIsLmLoading(true);
    try {
      const data = await sheetsService.fetchSpreadsheet(spreadsheetId, customTabTitle);
      setLmSheetData(data);
    } catch (err: any) {
      console.warn("Could not fetch DATA LM sheet tab directly:", err);
    } finally {
      setIsLmLoading(false);
    }
  };

  // Fetch specifically the EXPENSE sheet tab
  const loadExpenseSheetData = async (spreadsheetId: string, customTabTitle: string = "EXPENSE") => {
    setIsExpenseLoading(true);
    try {
      const data = await sheetsService.fetchSpreadsheet(spreadsheetId, customTabTitle);
      setExpenseSheetData(data);
    } catch (err: any) {
      console.warn("Could not fetch EXPENSE sheet tab directly:", err);
    } finally {
      setIsExpenseLoading(false);
    }
  };

  // Connect to a spreadsheet via full URL or ID
  const loadTargetSpreadsheet = async (urlOrId: string, tabTitle?: string) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const { id, gid } = extractSpreadsheetId(urlOrId);
      const data = await sheetsService.fetchSpreadsheet(id, tabTitle, gid);

      const fileObj: SheetFile = {
        id,
        name: data.spreadsheetTitle || `Spreadsheet (${id.slice(0, 8)}...)`,
        webViewLink: `https://docs.google.com/spreadsheets/d/${id}/edit`,
      };

      setSelectedFile(fileObj);
      setSheetData(data);

      // Concurrently load DATA LM tab and EXPENSE tab from the same spreadsheet
      loadLmSheetData(id, "DATA LM");
      loadExpenseSheetData(id, "EXPENSE");

      // Set default filter to current month (bulan berjalan) and matching year
      if (data.rows.length > 0) {
        const { years } = getAvailableFilterOptions(data.rows, data.headers);
        const currentYear = String(new Date().getFullYear());
        const currentMonth = String(new Date().getMonth() + 1);
        const targetYear = years.includes(currentYear) ? currentYear : (years[0] || currentYear);

        setFilters({
          year: targetYear,
          month: currentMonth,
          wilayah: "all",
        });
      }

      setNotification(
        `Data spreadsheet '${data.spreadsheetTitle}' (${data.activeSheetTitle}) berhasil dimuat (${data.rows.length} baris)!`
      );
    } catch (err: any) {
      console.error("Failed to load target spreadsheet:", err);
      setErrorMessage(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Switch tab within the active spreadsheet
  const handleSelectTab = async (sheetTitle: string) => {
    if (!selectedFile) {
      setSheetData((prev) => ({
        ...prev,
        activeSheetTitle: sheetTitle,
      }));
      return;
    }
    await loadTargetSpreadsheet(selectedFile.id, sheetTitle);
  };

  // CRUD Operations
  const handleAddRow = async (rowValues: any[]) => {
    if (!selectedFile) {
      setErrorMessage("Silakan hubungkan spreadsheet terlebih dahulu.");
      return;
    }

    if (!isAuthenticated) {
      setErrorMessage(
        "Untuk menambahkan baris ke Google Sheets asli, silakan hubungkan akun Google terlebih dahulu."
      );
      await handleConnectGoogle();
      return;
    }

    setIsLoading(true);
    try {
      await sheetsService.appendRow(selectedFile.id, sheetData.activeSheetTitle, rowValues);
      setNotification("Data baris baru berhasil disimpan langsung ke Google Sheets!");
      await loadTargetSpreadsheet(selectedFile.id, sheetData.activeSheetTitle);
    } catch (err: any) {
      setErrorMessage(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateRow = async (rowIndex: number, rowValues: any[]) => {
    if (!selectedFile) {
      setErrorMessage("Silakan hubungkan spreadsheet terlebih dahulu.");
      return;
    }

    if (!isAuthenticated) {
      setErrorMessage(
        "Untuk mengedit baris di Google Sheets asli, silakan hubungkan akun Google terlebih dahulu."
      );
      await handleConnectGoogle();
      return;
    }

    setIsLoading(true);
    try {
      await sheetsService.updateRow(
        selectedFile.id,
        sheetData.activeSheetTitle,
        rowIndex,
        rowValues
      );
      setNotification(`Baris ke-${rowIndex} berhasil diperbarui di Google Sheets!`);
      await loadTargetSpreadsheet(selectedFile.id, sheetData.activeSheetTitle);
    } catch (err: any) {
      setErrorMessage(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteRow = async (sheetId: number, rowIndex: number) => {
    if (!selectedFile) {
      setErrorMessage("Silakan hubungkan spreadsheet terlebih dahulu.");
      return;
    }

    if (!isAuthenticated) {
      setErrorMessage(
        "Untuk menghapus baris di Google Sheets asli, silakan hubungkan akun Google terlebih dahulu."
      );
      await handleConnectGoogle();
      return;
    }

    setIsLoading(true);
    try {
      await sheetsService.deleteRow(selectedFile.id, sheetId, rowIndex);
      setNotification(`Baris ke-${rowIndex} berhasil dihapus dari Google Sheets!`);
      await loadTargetSpreadsheet(selectedFile.id, sheetData.activeSheetTitle);
    } catch (err: any) {
      setErrorMessage(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Create new spreadsheet
  const handleCreateNewSpreadsheet = async (title: string) => {
    if (!isAuthenticated) {
      setErrorMessage("Silakan hubungkan akun Google terlebih dahulu untuk membuat spreadsheet baru di Drive.");
      await handleConnectGoogle();
      return;
    }

    setIsLoading(true);
    try {
      const defaultHeaders = [
        "ID_Pengiriman",
        "Tanggal",
        "Wilayah",
        "Customer",
        "customer_type",
        "total_payment",
        "fix_cost_list_cop",
        "Status",
      ];
      const newSheetId = await sheetsService.createSpreadsheet(title, defaultHeaders, []);

      const newFile: SheetFile = {
        id: newSheetId,
        name: title,
        modifiedTime: new Date().toISOString(),
      };

      setSpreadsheetFiles((prev) => [newFile, ...prev]);
      await loadTargetSpreadsheet(newSheetId);
      setIsPickerOpen(false);
      setNotification(`Spreadsheet baru '${title}' berhasil dibuat di Google Drive Anda!`);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Data to pass to table view
  const tableSheetData: SheetData = useMemo(() => {
    if (!useFilterForTable) return sheetData;
    return {
      ...sheetData,
      rows: filteredRows,
    };
  }, [sheetData, filteredRows, useFilterForTable]);

  return (
    <div
      className={`min-h-screen font-sans flex flex-col transition-colors duration-200 ${
        isDark
          ? "bg-[#070b0f] text-slate-100"
          : "bg-slate-100 text-slate-900"
      }`}
    >
      {/* Top Navbar */}
      <header
        className={`sticky top-0 z-40 backdrop-blur-md px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3 transition-colors duration-200 border-b ${
          isDark
            ? "bg-[#0c1219]/95 border-slate-800/80 text-slate-100"
            : "bg-white/95 border-slate-200/90 text-slate-900 shadow-sm"
        }`}
      >
        <div className="w-full max-w-[1680px] 2xl:max-w-[1840px] mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Left: Brand & Live Indicator */}
          <div className="flex items-center justify-between w-full md:w-auto gap-3">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center p-1 overflow-hidden transition shadow-sm ${
                  isDark
                    ? "bg-slate-900 border border-slate-700/80"
                    : "bg-white border border-slate-200"
                }`}
              >
                <img
                  src="/logo_app.png"
                  alt="Logo PH Banjarnegara"
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    // Fallback to spreadsheet icon if image load fails
                    e.currentTarget.style.display = "none";
                  }}
                />
              </div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-extrabold tracking-tight">
                  PH BANJARNEGARA
                </h1>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-mono border font-medium ${
                    isDark
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                      : "bg-emerald-50 text-emerald-700 border-emerald-300"
                  }`}
                >
                  LIVE SYNC
                </span>
              </div>
            </div>

            {/* Mobile Header Actions (Refresh & Dark/Light Toggle) */}
            <div className="md:hidden flex items-center gap-1.5">
              <button
                onClick={() =>
                  selectedFile
                    ? loadTargetSpreadsheet(selectedFile.id, sheetData.activeSheetTitle)
                    : loadTargetSpreadsheet(TARGET_DEFAULT_SHEET_URL)
                }
                disabled={isLoading}
                className={`p-2 rounded-xl border transition text-xs flex items-center justify-center ${
                  isDark
                    ? "bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-300 active:bg-slate-800"
                    : "bg-slate-100 border-slate-200 hover:border-slate-300 text-slate-700 active:bg-slate-200"
                }`}
                title="Muat ulang data sheet"
              >
                <RefreshCw
                  className={`w-4 h-4 ${
                    isLoading ? "animate-spin text-emerald-500" : ""
                  }`}
                />
              </button>

              <button
                onClick={toggleTheme}
                className={`p-2 rounded-xl border transition text-xs flex items-center justify-center ${
                  isDark
                    ? "bg-slate-900 border-slate-800 text-amber-400 hover:bg-slate-800"
                    : "bg-slate-100 border-slate-200 text-indigo-600 hover:bg-slate-200"
                }`}
                title={isDark ? "Ganti ke Mode Terang" : "Ganti ke Mode Gelap"}
              >
                {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Center: Segmented Navigation Switcher (Dashboard, Total LM, Expense, Grafik, Paxel Farma) */}
          <div className="flex items-center justify-center gap-2 w-full md:w-auto">
            {/* Nav Tabs (5 columns or flex on desktop) */}
            <div
              className={`w-full md:w-auto flex flex-wrap sm:flex-nowrap p-1 rounded-xl border text-xs shadow-inner transition relative ${
                isDark
                  ? "bg-slate-900/90 border-slate-800"
                  : "bg-slate-200/70 border-slate-300"
              }`}
            >
              <button
                onClick={() => setActiveView("dashboard")}
                className={`relative py-2 sm:py-1.5 px-2 sm:px-3.5 rounded-lg font-semibold transition flex items-center justify-center gap-1 sm:gap-1.5 z-10 text-[11px] sm:text-xs ${
                  activeView === "dashboard"
                    ? "text-black"
                    : isDark
                    ? "text-slate-400 hover:text-white"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {activeView === "dashboard" && (
                  <motion.div
                    layoutId="activeTabPill"
                    className="absolute inset-0 bg-emerald-500 rounded-lg shadow-sm -z-10"
                    transition={{ type: "spring", stiffness: 450, damping: 32 }}
                  />
                )}
                <BarChart3 className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Dashboard</span>
              </button>
              <button
                onClick={() => setActiveView("lm")}
                className={`relative py-2 sm:py-1.5 px-2 sm:px-3.5 rounded-lg font-semibold transition flex items-center justify-center gap-1 sm:gap-1.5 z-10 text-[11px] sm:text-xs ${
                  activeView === "lm"
                    ? "text-black"
                    : isDark
                    ? "text-slate-400 hover:text-white"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {activeView === "lm" && (
                  <motion.div
                    layoutId="activeTabPill"
                    className="absolute inset-0 bg-emerald-500 rounded-lg shadow-sm -z-10"
                    transition={{ type: "spring", stiffness: 450, damping: 32 }}
                  />
                )}
                <Truck className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Total LM</span>
              </button>
              <button
                onClick={() => setActiveView("expense")}
                className={`relative py-2 sm:py-1.5 px-2 sm:px-3.5 rounded-lg font-semibold transition flex items-center justify-center gap-1 sm:gap-1.5 z-10 text-[11px] sm:text-xs ${
                  activeView === "expense"
                    ? "text-black"
                    : isDark
                    ? "text-slate-400 hover:text-white"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {activeView === "expense" && (
                  <motion.div
                    layoutId="activeTabPill"
                    className="absolute inset-0 bg-emerald-500 rounded-lg shadow-sm -z-10"
                    transition={{ type: "spring", stiffness: 450, damping: 32 }}
                  />
                )}
                <Receipt className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Expense</span>
              </button>
              <button
                onClick={() => setActiveView("charts")}
                className={`relative py-2 sm:py-1.5 px-2 sm:px-3.5 rounded-lg font-semibold transition flex items-center justify-center gap-1 sm:gap-1.5 z-10 text-[11px] sm:text-xs ${
                  activeView === "charts"
                    ? "text-black"
                    : isDark
                    ? "text-slate-400 hover:text-white"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {activeView === "charts" && (
                  <motion.div
                    layoutId="activeTabPill"
                    className="absolute inset-0 bg-emerald-500 rounded-lg shadow-sm -z-10"
                    transition={{ type: "spring", stiffness: 450, damping: 32 }}
                  />
                )}
                <Zap className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Grafik</span>
              </button>
              <button
                onClick={() => setActiveView("farma")}
                className={`relative py-2 sm:py-1.5 px-2 sm:px-3.5 rounded-lg font-semibold transition flex items-center justify-center gap-1 sm:gap-1.5 z-10 text-[11px] sm:text-xs ${
                  activeView === "farma"
                    ? "text-black"
                    : isDark
                    ? "text-slate-400 hover:text-white"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {activeView === "farma" && (
                  <motion.div
                    layoutId="activeTabPill"
                    className="absolute inset-0 bg-emerald-500 rounded-lg shadow-sm -z-10"
                    transition={{ type: "spring", stiffness: 450, damping: 32 }}
                  />
                )}
                <Pill className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                <span className="truncate">Paxel Farma</span>
              </button>
            </div>

            {/* Desktop Refresh Button */}
            <button
              onClick={() =>
                selectedFile
                  ? loadTargetSpreadsheet(selectedFile.id, sheetData.activeSheetTitle)
                  : loadTargetSpreadsheet(TARGET_DEFAULT_SHEET_URL)
              }
              disabled={isLoading}
              className={`hidden md:flex p-2 rounded-xl border transition text-xs items-center justify-center ${
                isDark
                  ? "bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white"
                  : "bg-white border-slate-300 hover:border-slate-400 text-slate-700 hover:text-slate-900 shadow-sm"
              }`}
              title="Muat ulang data sheet"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${
                  isLoading ? "animate-spin text-emerald-500" : ""
                }`}
              />
            </button>
          </div>

          {/* Right: Desktop Dark / Light Mode Switcher */}
          <div className="hidden md:flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition shadow-sm ${
                isDark
                  ? "bg-slate-900 border-slate-800 text-amber-300 hover:bg-slate-800 hover:border-slate-700"
                  : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400"
              }`}
              title={isDark ? "Ganti ke Mode Terang" : "Ganti ke Mode Gelap"}
            >
              {isDark ? (
                <>
                  <Sun className="w-4 h-4 text-amber-400" />
                  <span>Mode Terang</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-indigo-600" />
                  <span>Mode Gelap</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Notification Toast */}
      {notification && (
        <div
          className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 text-xs font-medium animate-in fade-in slide-in-from-bottom-4 border ${
            isDark
              ? "bg-emerald-950/90 border-emerald-500/50 text-emerald-300"
              : "bg-emerald-50 border-emerald-300 text-emerald-900 shadow-lg"
          }`}
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Error Banner */}
      {errorMessage && (
        <div
          className={`border-b px-6 py-2.5 text-xs flex items-center justify-between ${
            isDark
              ? "bg-rose-950/40 border-rose-500/30 text-rose-300"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-xs text-rose-500 hover:underline ml-2 font-medium"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 w-full max-w-[1680px] 2xl:max-w-[1840px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 py-4 sm:py-6 space-y-6">
        {/* Empty / Loading State Notice if no data has been parsed */}
        {sheetData.rows.length === 0 && !isLoading && (
          <div
            className={`border rounded-2xl p-8 text-center space-y-3 ${
              isDark
                ? "bg-slate-900/60 border-slate-800"
                : "bg-white border-slate-200 shadow-sm"
            }`}
          >
            <FileSpreadsheet className="w-12 h-12 text-slate-400 mx-auto" />
            <h3 className="text-base font-semibold">Belum Ada Baris Data Terbaca</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Sedang memuat data dari spreadsheet...
            </p>
          </div>
        )}

        {/* 1. STICKY FILTER DROPDOWNS: TAHUN, BULAN, WILAYAH (Hidden on Farma tab which has its own filters) */}
        {sheetData.rows.length > 0 && activeView !== "farma" && (
          <div
            className={`sticky top-[58px] sm:top-[61px] z-30 backdrop-blur-md py-1 -mt-2 transition-colors ${
              isDark ? "bg-[#070b0f]/95" : "bg-slate-100/95"
            }`}
          >
            <DashboardFilters
              headers={sheetData.headers}
              rows={sheetData.rows}
              filters={filters}
              onFilterChange={setFilters}
              filteredCount={filteredRows.length}
              totalCount={sheetData.rows.length}
              extraRows={[
                ...(lmSheetData?.rows || []),
                ...(expenseSheetData?.rows || []),
              ]}
              extraHeaders={[
                ...(lmSheetData?.headers || []),
                ...(expenseSheetData?.headers || []),
              ]}
            />
          </div>
        )}

        {/* Tab Views with Smooth Motion Transitions */}
        <AnimatePresence mode="wait">
          {activeView === "dashboard" && sheetData.rows.length > 0 && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-6"
            >
              {/* 1. KPI Metrics */}
              <DashboardMetrics
                sheetData={sheetData}
                filteredRows={filteredRows}
                filters={filters}
              />

              {/* 2. Dynamic Charts: Tren Revenue & Distribusi Layanan */}
              <DashboardCharts sheetData={sheetData} filteredRows={filteredRows} />

              {/* 3. Top 5 Kiriman Terbanyak Berdasarkan sender_name */}
              <TopSendersCard
                sheetData={sheetData}
                filteredRows={filteredRows}
                filters={filters}
              />
            </motion.div>
          )}

          {/* View 2: Dedicated Total LM Pertanggal View */}
          {activeView === "lm" && (
            <motion.div
              key="lm"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-6"
            >
              <TotalLmPertanggalCard
                lmSheetData={lmSheetData}
                mainSheetData={sheetData}
                filters={filters}
                isLoading={isLmLoading || isLoading}
                onRefreshLmSheet={() => {
                  const targetId = selectedFile ? selectedFile.id : TARGET_DEFAULT_ID;
                  loadLmSheetData(targetId, lmSheetData?.activeSheetTitle || "DATA LM");
                }}
                onSelectLmTab={(tabTitle) => {
                  const targetId = selectedFile ? selectedFile.id : TARGET_DEFAULT_ID;
                  loadLmSheetData(targetId, tabTitle);
                }}
              />
            </motion.div>
          )}

          {/* View 3: Dedicated Expense View */}
          {activeView === "expense" && (
            <motion.div
              key="expense"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-6"
            >
              <ExpenseDashboardView
                expenseSheetData={expenseSheetData}
                filters={filters}
                isLoading={isExpenseLoading || isLoading}
                onRefreshExpenseSheet={() => {
                  const targetId = selectedFile ? selectedFile.id : TARGET_DEFAULT_ID;
                  loadExpenseSheetData(targetId, expenseSheetData?.activeSheetTitle || "EXPENSE");
                }}
              />
            </motion.div>
          )}

          {/* View 4: Visual Analytics & Deep Charts View (Month-over-Month Comparison) */}
          {activeView === "charts" && (
            <motion.div
              key="charts"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-6"
            >
              {/* 1. Month-over-Month (MoM) Comparison Card */}
              <MonthOverMonthComparisonCard
                sheetData={sheetData}
                filters={filters}
              />

              {/* 2. KPI Metrics for filtered selection */}
              <DashboardMetrics
                sheetData={sheetData}
                filteredRows={filteredRows}
                filters={filters}
              />

              {/* 3. Daily Trend & Service Distribution */}
              <DashboardCharts sheetData={sheetData} filteredRows={filteredRows} />
            </motion.div>
          )}

          {/* View 5: Dedicated Paxel Farma RSUD Banjarnegara View */}
          {activeView === "farma" && (
            <motion.div
              key="farma"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-6"
            >
              <PaxelFarmaDashboardView />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Spreadsheet Picker Modal */}
      {isPickerOpen && (
        <SpreadsheetSelectorModal
          files={spreadsheetFiles}
          activeFileId={selectedFile?.id || null}
          isLoading={isLoading}
          onSelectFile={(file) => {
            loadTargetSpreadsheet(file.id);
            setIsPickerOpen(false);
          }}
          onConnectByUrl={(url) => {
            setInputUrlOrId(url);
            loadTargetSpreadsheet(url);
          }}
          onCreateNewSheet={handleCreateNewSpreadsheet}
          onRefresh={loadSpreadsheetList}
          onClose={() => setIsPickerOpen(false)}
        />
      )}
    </div>
  );
}

