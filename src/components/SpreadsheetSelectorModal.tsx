import React from "react";
import {
  FileSpreadsheet,
  Plus,
  RefreshCw,
  ExternalLink,
  Search,
  CheckCircle2,
  FolderOpen,
  Calendar,
  X,
  PlusCircle,
  Database,
  Link,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { SheetFile } from "../types";
import { extractSpreadsheetId } from "../services/googleSheets";

interface Props {
  files: SheetFile[];
  activeFileId: string | null;
  isLoading: boolean;
  onSelectFile: (file: SheetFile) => void;
  onConnectByUrl: (urlOrId: string) => void;
  onCreateNewSheet: (title: string) => void;
  onRefresh: () => void;
  onClose: () => void;
}

export const SpreadsheetSelectorModal: React.FC<Props> = ({
  files,
  activeFileId,
  isLoading,
  onSelectFile,
  onConnectByUrl,
  onCreateNewSheet,
  onRefresh,
  onClose,
}) => {
  const [activeTab, setActiveTab] = React.useState<"drive" | "url" | "create">("url");
  const [searchTerm, setSearchTerm] = React.useState("");
  const [customUrl, setCustomUrl] = React.useState("https://docs.google.com/spreadsheets/d/1gPNDNySosYpbckuWHINRJT8qmmnJIvA_eD-zkqqsTHg/edit?gid=0#gid=0");
  const [newTitle, setNewTitle] = React.useState("");

  const filteredFiles = files.filter((f) =>
    f.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customUrl.trim()) return;
    onConnectByUrl(customUrl.trim());
    onClose();
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    onCreateNewSheet(newTitle.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Hubungkan Google Spreadsheet</h2>
              <p className="text-xs text-slate-400">Pilih dari Drive, masukkan link URL, atau buat baru</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 px-6 pt-2 gap-2 text-xs">
          <button
            onClick={() => setActiveTab("url")}
            className={`pb-2.5 px-3 font-medium flex items-center gap-1.5 transition border-b-2 ${
              activeTab === "url"
                ? "border-emerald-500 text-emerald-400 font-semibold"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            <Link className="w-3.5 h-3.5" />
            <span>Link URL / ID Spreadsheet</span>
          </button>

          <button
            onClick={() => setActiveTab("drive")}
            className={`pb-2.5 px-3 font-medium flex items-center gap-1.5 transition border-b-2 ${
              activeTab === "drive"
                ? "border-emerald-500 text-emerald-400 font-semibold"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span>Google Drive Anda ({files.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("create")}
            className={`pb-2.5 px-3 font-medium flex items-center gap-1.5 transition border-b-2 ${
              activeTab === "create"
                ? "border-emerald-500 text-emerald-400 font-semibold"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Buat Sheet Baru</span>
          </button>
        </div>

        {/* TAB 1: CONNECT VIA URL / ID */}
        {activeTab === "url" && (
          <div className="p-6 space-y-5">
            <form onSubmit={handleUrlSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Masukkan Link Google Spreadsheet atau ID File:
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/1gPNDNySosYpbckuWHINRJT8qmmnJIvA_eD-zkqqsTHg/..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5">
                  Mendukung URL penuh Google Sheets (dengan atau tanpa gid) ataupun Spreadsheet ID.
                </p>
              </div>

              {/* Quick Preset for the requested spreadsheet */}
              <div className="bg-emerald-950/30 border border-emerald-500/20 rounded-xl p-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div className="truncate">
                    <p className="text-xs font-medium text-emerald-300">Spreadsheet Diminta:</p>
                    <p className="text-[11px] text-slate-400 truncate font-mono">
                      1gPNDNySosYpbckuWHINRJT8qmmnJIvA_eD-zkqqsTHg
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setCustomUrl("https://docs.google.com/spreadsheets/d/1gPNDNySosYpbckuWHINRJT8qmmnJIvA_eD-zkqqsTHg/edit?gid=0#gid=0");
                    onConnectByUrl("https://docs.google.com/spreadsheets/d/1gPNDNySosYpbckuWHINRJT8qmmnJIvA_eD-zkqqsTHg/edit?gid=0#gid=0");
                    onClose();
                  }}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs transition shrink-0 flex items-center gap-1"
                >
                  <span>Gunakan Ini</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:bg-slate-800 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isLoading || !customUrl.trim()}
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs transition flex items-center gap-1.5 shadow-lg shadow-emerald-950"
                >
                  {isLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Database className="w-3.5 h-3.5" />}
                  <span>Sinkronkan Spreadsheet</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 2: GOOGLE DRIVE LIST */}
        {activeTab === "drive" && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Search & Refresh */}
            <div className="p-4 border-b border-slate-800 bg-slate-950/40 flex gap-2 items-center justify-between">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari file di Google Drive..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <button
                onClick={onRefresh}
                disabled={isLoading}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition text-xs flex items-center gap-1.5"
                title="Refresh daftar spreadsheet"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-emerald-400" : ""}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 divide-y divide-slate-800/40">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400 space-y-3">
                  <RefreshCw className="w-8 h-8 animate-spin text-emerald-500" />
                  <p className="text-xs">Memuat daftar Google Sheets dari Drive Anda...</p>
                </div>
              ) : filteredFiles.length === 0 ? (
                <div className="text-center py-12 text-slate-500 space-y-2">
                  <FolderOpen className="w-10 h-10 mx-auto text-slate-600" />
                  <p className="text-sm font-medium text-slate-300">Tidak ada spreadsheet ditemukan di Drive</p>
                  <p className="text-xs text-slate-500">
                    Silakan gunakan tab "Link URL" di atas untuk menghubungkan via tautan spreadsheet langsung.
                  </p>
                </div>
              ) : (
                filteredFiles.map((file) => {
                  const isSelected = file.id === activeFileId;
                  const formattedDate = file.modifiedTime
                    ? new Date(file.modifiedTime).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    : "";

                  return (
                    <div
                      key={file.id}
                      onClick={() => onSelectFile(file)}
                      className={`pt-2 pb-2 px-3 rounded-xl flex items-center justify-between cursor-pointer transition ${
                        isSelected
                          ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-300"
                          : "hover:bg-slate-800/60 text-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <FileSpreadsheet
                          className={`w-5 h-5 shrink-0 ${isSelected ? "text-emerald-400" : "text-slate-400"}`}
                        />
                        <div className="truncate">
                          <p className="text-xs font-medium truncate text-white">{file.name}</p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-500">
                            {formattedDate && (
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" /> {formattedDate}
                              </span>
                            )}
                            <span className="font-mono">ID: {file.id.slice(0, 8)}...</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {isSelected ? (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-400 font-medium">
                            <CheckCircle2 className="w-4 h-4" /> Aktif
                          </span>
                        ) : (
                          <button className="px-2.5 py-1 rounded-lg text-xs bg-slate-800 hover:bg-slate-700 text-slate-200">
                            Pilih
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* TAB 3: CREATE NEW SPREADSHEET */}
        {activeTab === "create" && (
          <div className="p-6 space-y-4">
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Judul Spreadsheet Baru:
                </label>
                <input
                  type="text"
                  placeholder="Misal: Data Operasional Bisnis 2026..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  autoFocus
                />
                <p className="text-[11px] text-slate-400 mt-1.5">
                  File spreadsheet baru akan otomatis dibuat di Google Drive Anda dengan template kolom database standar.
                </p>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:bg-slate-800 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isLoading || !newTitle.trim()}
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs transition flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Buat & Sinkronkan</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
