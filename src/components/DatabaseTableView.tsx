import React, { useState } from "react";
import {
  Table as TableIcon,
  Plus,
  Edit2,
  Trash2,
  Search,
  ArrowUpDown,
  Filter,
  Download,
  Check,
  X,
  RefreshCw,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Database,
  Layers,
} from "lucide-react";
import { SheetData, SheetTab } from "../types";

interface Props {
  sheetData: SheetData;
  isLoading: boolean;
  onAddRow: (rowValues: any[]) => Promise<void>;
  onUpdateRow: (rowIndex: number, rowValues: any[]) => Promise<void>;
  onDeleteRow: (sheetId: number, rowIndex: number) => Promise<void>;
  onSelectTab: (sheetTitle: string) => void;
  onRefresh: () => void;
  isReadOnlyDemo?: boolean;
}

export const DatabaseTableView: React.FC<Props> = ({
  sheetData,
  isLoading,
  onAddRow,
  onUpdateRow,
  onDeleteRow,
  onSelectTab,
  onRefresh,
  isReadOnlyDemo = false,
}) => {
  const { headers, rows, rawValues, sheets, activeSheetTitle, spreadsheetId } = sheetData;

  const [searchTerm, setSearchTerm] = useState("");
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Modals for CRUD
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingRowIndex, setEditingRowIndex] = useState<number | null>(null); // 2-indexed
  const [formRowData, setFormRowData] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sorting
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  // Filtered & Sorted Rows
  const processedRows = React.useMemo(() => {
    let result = rows.map((r, originalIdx) => ({
      ...r,
      __rowNumber: originalIdx + 2, // 2-indexed in Google Sheets (Row 1 is Header)
    }));

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter((row) =>
        Object.values(row).some((val) => String(val).toLowerCase().includes(term))
      );
    }

    if (sortColumn) {
      result.sort((a, b) => {
        const valA = a[sortColumn];
        const valB = b[sortColumn];
        if (typeof valA === "number" && typeof valB === "number") {
          return sortDirection === "asc" ? valA - valB : valB - valA;
        }
        return sortDirection === "asc"
          ? String(valA || "").localeCompare(String(valB || ""))
          : String(valB || "").localeCompare(String(valA || ""));
      });
    }

    return result;
  }, [rows, searchTerm, sortColumn, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(processedRows.length / pageSize) || 1;
  const paginatedRows = processedRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Open Add Modal
  const handleOpenAdd = () => {
    const initial: Record<string, any> = {};
    headers.forEach((h) => {
      initial[h] = "";
    });
    setFormRowData(initial);
    setIsAddModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (row: any) => {
    setEditingRowIndex(row.__rowNumber);
    const initial: Record<string, any> = {};
    headers.forEach((h) => {
      initial[h] = row[h] !== undefined ? row[h] : "";
    });
    setFormRowData(initial);
    setIsEditModalOpen(true);
  };

  // Submit Add Row
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const valuesArray = headers.map((h) => formRowData[h] ?? "");
      await onAddRow(valuesArray);
      setIsAddModalOpen(false);
    } catch (err: any) {
      alert("Gagal menambahkan data: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Edit Row
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingRowIndex === null) return;
    setIsSubmitting(true);
    try {
      const valuesArray = headers.map((h) => formRowData[h] ?? "");
      await onUpdateRow(editingRowIndex, valuesArray);
      setIsEditModalOpen(false);
    } catch (err: any) {
      alert("Gagal memperbarui data: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Row
  const handleDelete = async (row: any) => {
    const currentTab = sheets.find((s) => s.title === activeSheetTitle);
    const sheetId = currentTab ? currentTab.sheetId : 0;
    if (window.confirm(`Hapus baris ke-${row.__rowNumber} dari Google Sheets?`)) {
      try {
        await onDeleteRow(sheetId, row.__rowNumber);
      } catch (err: any) {
        alert("Gagal menghapus baris: " + err.message);
      }
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (rawValues.length === 0) return;
    const csvContent =
      "data:text/csv;charset=utf-8," +
      rawValues.map((e) => e.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${activeSheetTitle}_export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden flex flex-col">
      {/* Tab Navigation (Sheets in Spreadsheet) */}
      <div className="flex items-center justify-between px-6 pt-4 pb-2 border-b border-slate-800/80 bg-slate-950/40 flex-wrap gap-3">
        <div className="flex items-center gap-2 overflow-x-auto max-w-full pb-1">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mr-2">
            <Layers className="w-3.5 h-3.5 text-emerald-400" /> Tab Database:
          </span>
          {sheets.map((tab) => {
            const isActive = tab.title === activeSheetTitle;
            return (
              <button
                key={tab.sheetId}
                onClick={() => onSelectTab(tab.title)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 whitespace-nowrap ${
                  isActive
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm"
                    : "bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800"
                }`}
              >
                <span>{tab.title}</span>
                {tab.rowCount !== undefined && (
                  <span className="text-[10px] opacity-60 font-mono">({tab.rowCount})</span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          {spreadsheetId && !spreadsheetId.startsWith("demo-") && (
            <a
              href={`https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-emerald-400 hover:underline px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/20"
            >
              <ExternalLink className="w-3 h-3" /> Buka di Google Sheets
            </a>
          )}
        </div>
      </div>

      {/* Action Bar (Search, Refresh, Insert Row, Export) */}
      <div className="p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-slate-800/80">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari data dalam tabel..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition text-xs flex items-center gap-1.5"
            title="Refresh tabel"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-emerald-400" : ""}`} />
            <span className="hidden sm:inline">Refresh Data</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition text-xs flex items-center gap-1.5"
            title="Export CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs flex items-center gap-1.5 transition shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Baris Baru</span>
          </button>
        </div>
      </div>

      {/* Real-time Data Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[11px]">
            <tr>
              <th className="py-3.5 px-4 w-12 text-center text-slate-500 font-mono">#</th>
              {headers.map((header) => (
                <th
                  key={header}
                  onClick={() => handleSort(header)}
                  className="py-3.5 px-4 cursor-pointer hover:text-white transition select-none whitespace-nowrap"
                >
                  <div className="flex items-center gap-1.5">
                    <span>{header}</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  </div>
                </th>
              ))}
              <th className="py-3.5 px-4 text-right w-24">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-sans">
            {paginatedRows.length === 0 ? (
              <tr>
                <td colSpan={headers.length + 2} className="text-center py-12 text-slate-500">
                  {isLoading ? (
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" /> Memuat data...
                    </div>
                  ) : (
                    "Tidak ada data baris ditemukan."
                  )}
                </td>
              </tr>
            ) : (
              paginatedRows.map((row, idx) => (
                <tr
                  key={row.__rowNumber || idx}
                  className="hover:bg-slate-800/40 transition group duration-150"
                >
                  <td className="py-3 px-4 text-center font-mono text-[11px] text-slate-500">
                    {row.__rowNumber}
                  </td>
                  {headers.map((header) => {
                    const val = row[header];
                    const isStatus = /status/i.test(header);
                    const isPrice = /amount|total|price|harga|nominal/i.test(header) && typeof val === "number";

                    return (
                      <td key={header} className="py-3 px-4 whitespace-nowrap">
                        {isStatus ? (
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                              /completed|success|selesai|lunas|active/i.test(String(val))
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : /pending|processing|proses/i.test(String(val))
                                ? "bg-amber-500/10 text-amber-300 border border-amber-500/20"
                                : "bg-slate-800 text-slate-300 border border-slate-700"
                            }`}
                          >
                            {String(val || "-")}
                          </span>
                        ) : isPrice ? (
                          <span className="font-mono text-emerald-300">
                            {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val)}
                          </span>
                        ) : (
                          <span className="text-slate-200">{val !== undefined && val !== "" ? String(val) : "-"}</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => handleOpenEdit(row)}
                        className="p-1.5 rounded-md text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition"
                        title="Edit baris di Google Sheets"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(row)}
                        className="p-1.5 rounded-md text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                        title="Hapus baris dari Google Sheets"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="p-4 bg-slate-950/60 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
        <div>
          Menampilkan {(currentPage - 1) * pageSize + 1} s/d{" "}
          {Math.min(currentPage * pageSize, processedRows.length)} dari total {processedRows.length} baris
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 disabled:opacity-40 transition"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-2 font-mono">
            Halaman {currentPage} dari {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 disabled:opacity-40 transition"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Modal: Tambah Baris Baru (Insert Record) */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-400" />
                <span>Tambah Baris Baru ke '{activeSheetTitle}'</span>
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-6 overflow-y-auto space-y-4">
              {headers.map((header) => (
                <div key={header} className="space-y-1">
                  <label className="text-xs font-medium text-slate-300 block">{header}</label>
                  <input
                    type="text"
                    value={formRowData[header] || ""}
                    onChange={(e) =>
                      setFormRowData({ ...formRowData, [header]: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    placeholder={`Masukkan ${header}...`}
                  />
                </div>
              ))}

              <div className="pt-4 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs text-slate-400 hover:bg-slate-800 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition flex items-center gap-1.5"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Menyimpan ke Sheets...
                    </>
                  ) : (
                    "Simpan ke Google Sheets"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Baris (Update Record) */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-emerald-400" />
                <span>Edit Baris #{editingRowIndex} di '{activeSheetTitle}'</span>
              </h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 overflow-y-auto space-y-4">
              {headers.map((header) => (
                <div key={header} className="space-y-1">
                  <label className="text-xs font-medium text-slate-300 block">{header}</label>
                  <input
                    type="text"
                    value={formRowData[header] !== undefined ? formRowData[header] : ""}
                    onChange={(e) =>
                      setFormRowData({ ...formRowData, [header]: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              ))}

              <div className="pt-4 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs text-slate-400 hover:bg-slate-800 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition flex items-center gap-1.5"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Memperbarui...
                    </>
                  ) : (
                    "Perbarui Baris di Sheets"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
