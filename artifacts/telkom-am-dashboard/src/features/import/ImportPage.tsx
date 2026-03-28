import React, { useState, useRef, useCallback, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import { useImportPerformance, useImportFunnel, useImportActivity, useListImportHistory } from "@workspace/api-client-react";
import { useToast } from "@/shared/hooks/use-toast";
import { useImportGuard } from "@/shared/hooks/use-import-guard";
import { Button } from "@/shared/ui/button";
import {
  UploadCloud, CheckCircle2, History, Loader2, Calendar,
  AlertCircle, ArrowRight, X, FileSpreadsheet, Trash2,
  Eye, AlertTriangle, RefreshCw, BarChart2, Filter, Activity, Layers, Target, Plus, Save,
  Users, UserCheck, UserX, Pencil, ShieldCheck, ChevronDown, ChevronUp,
  Sheet, Play, Clock, CircleCheck, CircleX, SkipForward, FolderOpen, Download,
  ListChecks, CheckSquare2, Square, Terminal
} from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { RowActions } from "@/shared/ui/row-actions";
import { format } from "date-fns";
import { id } from "date-fns/locale";

const TABS = [
  { id: "performansi", label: "Performa AM",   icon: BarChart2, type: "performance" },
  { id: "funnel",      label: "Sales Funnel",  icon: Filter,    type: "funnel" },
  { id: "activity",   label: "Sales Activity", icon: Activity,  type: "activity" },
  { id: "target-ho",  label: "Target HO",      icon: Target,    type: "target" },
  { id: "gsheets",    label: "Google Sheets",  icon: Sheet,     type: "gsheets" },
];

const MONTHS_FULL = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];

async function apiFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const base = (import.meta.env.BASE_URL || "").replace(/\/$/, "");
  const r = await fetch(`${base}${path}`, { credentials: "include", ...opts });
  if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error((e as any).error || `API ${r.status}`); }
  return r.json();
}

function extractDateFromFilename(source: string): { display: string; isoDate: string; period: string } | null {
  const match = source.match(/[_-](\d{8})[._?&\s]/);
  if (!match) return null;
  const raw = match[1];
  const year = raw.slice(0, 4);
  const month = raw.slice(4, 6);
  const day = raw.slice(6, 8);
  const y = parseInt(year), mo = parseInt(month), d = parseInt(day);
  if (y < 2000 || y > 2100 || mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return {
    isoDate: `${year}-${month}-${day}`,
    period: `${year}-${month}`,
    display: `${day}/${month}/${year}`,
  };
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      const result = e.target?.result as string;
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/** Read just the sheet names from an Excel file (fast, no full parse) */
async function readSheetNames(file: File): Promise<string[]> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const data = e.target?.result;
        const wb = XLSX.read(data, { bookSheets: true });
        resolve(wb.SheetNames || []);
      } catch {
        resolve([]);
      }
    };
    reader.onerror = () => resolve([]);
    reader.readAsArrayBuffer(file);
  });
}

function formatSnapshotTitle(createdAt: string, type: string, snapshotDate?: string | null): string {
  const dateStr = snapshotDate || createdAt;
  const date = format(new Date(dateStr), "d MMMM yyyy", { locale: id });
  const upper = date.toUpperCase();
  if (type === "performance") return `SNAPSHOT PERFORMANSI AM WITEL SURAMADU (${upper})`;
  if (type === "funnel") return `SNAPSHOT SALES FUNNEL WITEL SURAMADU (${upper})`;
  return `SNAPSHOT SALES ACTIVITY WITEL SURAMADU (${upper})`;
}

type ConflictInfo = {
  error: string;
  existingId: number;
  existingRows: number;
  period: string;
  importedAt: string;
  pendingBody: any;
  pendingTab: string;
};

type SheetPicker = {
  file: File;
  sheets: string[];
};

export default function ImportData() {
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("performansi");
  const [files, setFiles] = useState<Record<string, File | null>>({ performansi: null, funnel: null, activity: null });
  const [sheetNames, setSheetNames] = useState<Record<string, string>>({ performansi: "", funnel: "", activity: "" });
  const [snapshotOverride, setSnapshotOverride] = useState<Record<string, string>>({ performansi: "", funnel: "", activity: "" });
  const [isDragOver, setIsDragOver] = useState(false);
  const [sheetPicker, setSheetPicker] = useState<SheetPicker | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { setIsImporting } = useImportGuard();

  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [conflictInfo, setConflictInfo] = useState<ConflictInfo | null>(null);
  const [isOverwriting, setIsOverwriting] = useState(false);
  const [importProgress, setImportProgress] = useState<{ percent: number; stage: string } | null>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const qc = useQueryClient();
  const { data: history, refetch } = useListImportHistory();
  const perfMut = useImportPerformance();
  const funnelMut = useImportFunnel();
  const actMut = useImportActivity();

  // Target HO state
  const curYear = new Date().getFullYear();
  const curMonth = new Date().getMonth() + 1;
  const [tSaving, setTSaving] = useState(false);
  const [tDelConfirm, setTDelConfirm] = useState<number | null>(null);
  const [editRowId, setEditRowId] = useState<number | "new" | null>(null);
  const [editRowData, setEditRowData] = useState({ tahun: String(curYear), divisi: "DPS", targetHo: "", targetFullHo: "" });
  const [focusField, setFocusField] = useState<string | null>(null);
  const { data: targets = [], refetch: refetchTargets } = useQuery<any[]>({
    queryKey: ["funnel-targets"],
    queryFn: () => apiFetch("/api/funnel/targets"),
    staleTime: 30_000,
  });

  // Google Drive sync state
  const [driveForm, setDriveForm] = useState({ folderPerformance: "", folderFunnel: "", folderActivity: "", folderTarget: "" });
  const [driveSaving, setDriveSaving] = useState(false);
  const [driveListLoading, setDriveListLoading] = useState<Record<string, boolean>>({});
  const [driveFiles, setDriveFiles] = useState<Record<string, any[]>>({});
  const [driveSyncing, setDriveSyncing] = useState<Record<string, boolean>>({});
  const [driveSyncResult, setDriveSyncResult] = useState<Record<string, any>>({});
  // Upload mode per tab: "manual" | "drive"
  const [uploadMode, setUploadMode] = useState<Record<string, "manual" | "drive">>({ performansi: "manual", funnel: "manual", activity: "manual" });
  // Date override for Drive mode per driveType ("performance" | "funnel" | "activity")
  const [driveSnapshotOverride, setDriveSnapshotOverride] = useState<Record<string, string>>({});
  // Progress simulation for Drive sync
  const [driveProgress, setDriveProgress] = useState<Record<string, { percent: number; stage: string } | null>>({});
  const driveProgressRef = useRef<Record<string, ReturnType<typeof setInterval>>>({});
  // Multi-select per driveType
  const [driveSelectedFiles, setDriveSelectedFiles] = useState<Record<string, Record<string, boolean>>>({});
  // Sync log
  type SyncLogEntry = { fileId: string; fileName: string; status: "waiting" | "running" | "ok" | "error"; message: string; rows?: number };
  const [syncLog, setSyncLog] = useState<SyncLogEntry[]>([]);
  const [syncLogOpen, setSyncLogOpen] = useState(true);

  // Google Sheets sync state
  const [gsForm, setGsForm] = useState<{
    spreadsheetId: string; apiKey: string; funnelPattern: string;
    syncEnabled: boolean; syncHourWib: number; syncIntervalDays: number;
    _mode: "sheets" | "drive";
  }>({
    spreadsheetId: "", apiKey: "", funnelPattern: "TREG3_SALES_FUNNEL_",
    syncEnabled: false, syncHourWib: 6, syncIntervalDays: 1, _mode: "sheets",
  });
  // Drive scheduler form (separate from GSheets scheduler)
  const [driveSchedulerForm, setDriveSchedulerForm] = useState({ enabled: false, hourWib: 7, intervalDays: 1 });
  const [driveSchedulerSaving, setDriveSchedulerSaving] = useState(false);
  const [checkNowLoading, setCheckNowLoading] = useState(false);
  const [driveLogsOpen, setDriveLogsOpen] = useState(true);
  const [gsSaving, setGsSaving] = useState(false);
  const [gsSyncing, setGsSyncing] = useState(false);
  const [gsSyncResult, setGsSyncResult] = useState<any>(null);
  const [gsSheets, setGsSheets] = useState<any[]>([]);
  const [gsLoadingSheets, setGsLoadingSheets] = useState(false);
  const [gsSelected, setGsSelected] = useState<Record<string, boolean>>({});
  const [gsTypeOverride, setGsTypeOverride] = useState<Record<string, "funnel" | "activity" | "performance" | "">>({});
  const [gsSyncingSelected, setGsSyncingSelected] = useState(false);

  const { data: gsStatus, refetch: refetchGsStatus } = useQuery<any>({
    queryKey: ["gsheets-status"],
    queryFn: () => apiFetch("/api/gsheets/sync-status"),
    staleTime: 30_000,
    enabled: activeTab === "gsheets",
  });
  const { data: appSettings } = useQuery<any>({
    queryKey: ["app-settings-gs"],
    queryFn: () => apiFetch("/api/settings"),
    staleTime: 60_000,
  });
  const { data: driveLogsData, refetch: refetchDriveLogs } = useQuery<{ logs: any[] }>({
    queryKey: ["drive-read-logs"],
    queryFn: () => apiFetch("/api/gdrive/read-logs?limit=30"),
    staleTime: 30_000,
    enabled: activeTab === "gsheets",
  });
  useEffect(() => {
    if (!appSettings) return;
    const hasDriveFolders = !!(appSettings.gDriveFolderFunnel || appSettings.gDriveFolderPerformance || appSettings.gDriveFolderActivity);
    setGsForm(p => ({
      spreadsheetId: appSettings.gSheetsSpreadsheetId || "",
      apiKey: appSettings.gSheetsApiKey?.startsWith("***") ? p.apiKey : (appSettings.gSheetsApiKey || ""),
      funnelPattern: appSettings.gSheetsFunnelPattern || "TREG3_SALES_FUNNEL_",
      syncEnabled: appSettings.gSheetsSyncEnabled ?? false,
      syncHourWib: appSettings.gSheetsSyncHourWib ?? 6,
      syncIntervalDays: appSettings.gSheetsSyncIntervalDays ?? 1,
      _mode: p._mode === "drive" ? "drive" : (hasDriveFolders ? "drive" : "sheets"),
    }));
    setDriveForm({
      folderPerformance: appSettings.gDriveFolderPerformance || "",
      folderFunnel: appSettings.gDriveFolderFunnel || "",
      folderActivity: appSettings.gDriveFolderActivity || "",
      folderTarget: appSettings.gDriveFolderTarget || "",
    });
    setDriveSchedulerForm({
      enabled: appSettings.gDriveSyncEnabled ?? false,
      hourWib: appSettings.gDriveSyncHourWib ?? 7,
      intervalDays: appSettings.gDriveSyncIntervalDays ?? 1,
    });
    // Auto-default upload mode to "drive" for tabs with configured folders
    setUploadMode(p => ({
      performansi: appSettings.gDriveFolderPerformance ? "drive" : p.performansi,
      funnel: appSettings.gDriveFolderFunnel ? "drive" : p.funnel,
      activity: appSettings.gDriveFolderActivity ? "drive" : p.activity,
    }));
  }, [appSettings]);

  const handleSaveGsSettings = async () => {
    setGsSaving(true);
    try {
      await apiFetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gSheetsSpreadsheetId: gsForm.spreadsheetId,
          gSheetsApiKey: gsForm.apiKey || undefined,
          gSheetsFunnelPattern: gsForm.funnelPattern,
          gSheetsSyncEnabled: gsForm.syncEnabled,
          gSheetsSyncHourWib: gsForm.syncHourWib,
          gSheetsSyncIntervalDays: gsForm.syncIntervalDays,
        }),
      });
      toast({ title: "Pengaturan Tersimpan", description: "Konfigurasi Google Sheets berhasil disimpan" });
      refetchGsStatus();
      qc.invalidateQueries({ queryKey: ["app-settings-gs"] });
    } catch (e: any) {
      toast({ title: "Gagal Simpan", description: e.message, variant: "destructive" });
    } finally { setGsSaving(false); }
  };

  const handleSaveDriveFolders = async () => {
    setDriveSaving(true);
    try {
      await apiFetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gDriveFolderPerformance: driveForm.folderPerformance || null,
          gDriveFolderFunnel: driveForm.folderFunnel || null,
          gDriveFolderActivity: driveForm.folderActivity || null,
          gDriveFolderTarget: driveForm.folderTarget || null,
        }),
      });
      toast({ title: "Folder Tersimpan", description: "URL folder Google Drive berhasil disimpan" });
      qc.invalidateQueries({ queryKey: ["app-settings-gs"] });
    } catch (e: any) {
      toast({ title: "Gagal Simpan", description: e.message, variant: "destructive" });
    } finally { setDriveSaving(false); }
  };

  const handleSaveDriveScheduler = async () => {
    setDriveSchedulerSaving(true);
    try {
      await apiFetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gDriveSyncEnabled: driveSchedulerForm.enabled,
          gDriveSyncHourWib: driveSchedulerForm.hourWib,
          gDriveSyncIntervalDays: driveSchedulerForm.intervalDays,
        }),
      });
      toast({ title: "Jadwal Drive Disimpan", description: driveSchedulerForm.enabled ? `Pengecekan otomatis jam ${String(driveSchedulerForm.hourWib).padStart(2, "0")}:00 WIB setiap ${driveSchedulerForm.intervalDays} hari` : "Jadwal otomatis dinonaktifkan" });
      qc.invalidateQueries({ queryKey: ["app-settings-gs"] });
    } catch (e: any) {
      toast({ title: "Gagal Simpan", description: e.message, variant: "destructive" });
    } finally { setDriveSchedulerSaving(false); }
  };

  const handleCheckNow = async () => {
    setCheckNowLoading(true);
    try {
      const result = await apiFetch<{ results: any[] }>("/api/gdrive/check-now?type=all", { method: "POST" });
      const imported = (result.results || []).filter(r => r.condition === "imported").length;
      const skipped = (result.results || []).filter(r => r.condition === "date_same").length;
      const errors = (result.results || []).filter(r => ["api_error", "import_error"].includes(r.condition)).length;
      toast({
        title: imported > 0 ? `${imported} folder berhasil diimport` : "Pengecekan selesai",
        description: `${imported} import · ${skipped} dilewati (sama) · ${errors} error`,
      });
      refetchDriveLogs();
      if (imported > 0) refetch();
    } catch (e: any) {
      toast({ title: "Gagal Cek Drive", description: e.message, variant: "destructive" });
    } finally { setCheckNowLoading(false); }
  };

  const handleDriveList = async (type: string) => {
    setDriveListLoading(p => ({ ...p, [type]: true }));
    setDriveFiles(p => ({ ...p, [type]: [] }));
    try {
      const data = await apiFetch<{ files: any[] }>(`/api/gdrive/list?type=${type}`);
      const files = data.files || [];
      setDriveFiles(p => ({ ...p, [type]: files }));
      // Auto-detect snapshot date from latest file name
      if (files.length > 0) {
        const detected = extractDateFromFilename(files[0].name);
        if (detected) {
          setDriveSnapshotOverride(p => ({ ...p, [type]: detected.isoDate }));
        }
      }
    } catch (e: any) {
      toast({ title: "Gagal Memuat Daftar File", description: e.message, variant: "destructive" });
    } finally { setDriveListLoading(p => ({ ...p, [type]: false })); }
  };

  const DRIVE_STAGES = [
    { to: 15, step: 1.2, label: "Menghubungi Google Drive..." },
    { to: 40, step: 0.5, label: "Mengunduh file Excel..." },
    { to: 75, step: 0.3, label: "Proses cleaning & import data..." },
    { to: 95, step: 0.04, label: "Menyimpan ke database..." },
  ];

  const startDriveProgress = (type: string) => {
    let p = 0; let si = 0;
    setDriveProgress(prev => ({ ...prev, [type]: { percent: 0, stage: DRIVE_STAGES[0].label } }));
    driveProgressRef.current[type] = setInterval(() => {
      p += DRIVE_STAGES[si].step;
      if (p >= DRIVE_STAGES[si].to && si < DRIVE_STAGES.length - 1) si++;
      const capped = Math.min(p, DRIVE_STAGES[si].to);
      setDriveProgress(prev => ({ ...prev, [type]: { percent: Math.round(capped), stage: DRIVE_STAGES[si].label } }));
    }, 50);
  };

  const stopDriveProgress = (type: string, success: boolean) => {
    if (driveProgressRef.current[type]) {
      clearInterval(driveProgressRef.current[type]);
      delete driveProgressRef.current[type];
    }
    if (success) {
      setDriveProgress(prev => ({ ...prev, [type]: { percent: 100, stage: "Selesai ✓" } }));
      setTimeout(() => setDriveProgress(prev => ({ ...prev, [type]: null })), 2500);
    } else {
      setDriveProgress(prev => ({ ...prev, [type]: null }));
    }
  };

  const handleDriveSync = async (type: string, fileId?: string, snapshotDateDirect?: string) => {
    setDriveSyncing(p => ({ ...p, [type]: true }));
    setDriveSyncResult(p => ({ ...p, [type]: null }));
    startDriveProgress(type);
    try {
      const snapshotDate = snapshotDateDirect ?? driveSnapshotOverride[type] ?? undefined;
      const result = await apiFetch<any>(`/api/gdrive/sync?type=${type}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId, snapshotDate: snapshotDate || undefined }),
      });
      stopDriveProgress(type, true);
      setDriveSyncResult(p => ({ ...p, [type]: result }));
      refetch();
      toast({ title: "Sync Berhasil", description: `${result.imported} baris diimport dari "${result.fileName}"` });
      if ((result.newAmDiscovered ?? 0) > 0) {
        setTimeout(() => {
          toast({
            title: `🔔 ${result.newAmDiscovered} AM Baru Terdeteksi`,
            description: `NIK baru ditemukan dari data import. Buka halaman Manajemen Akun untuk menyetujui penambahan AM.`,
          });
        }, 600);
      }
    } catch (e: any) {
      stopDriveProgress(type, false);
      toast({ title: "Sync Gagal", description: e.message, variant: "destructive" });
    } finally { setDriveSyncing(p => ({ ...p, [type]: false })); }
  };

  const handleDriveSyncBatch = async (type: string, filesToSync: any[]) => {
    if (filesToSync.length === 0) return;
    const entries: SyncLogEntry[] = filesToSync.map(f => ({
      fileId: f.id, fileName: f.name, status: "waiting", message: "Menunggu...",
    }));
    setSyncLog(entries);
    setSyncLogOpen(true);
    setDriveSyncing(p => ({ ...p, [type]: true }));
    setDriveSyncResult(p => ({ ...p, [type]: null }));
    startDriveProgress(type);
    let anyOk = false;
    for (let i = 0; i < filesToSync.length; i++) {
      const f = filesToSync[i];
      setSyncLog(prev => prev.map((e, idx) => idx === i ? { ...e, status: "running", message: "Sedang download & import..." } : e));
      try {
        const fDetected = extractDateFromFilename(f.name);
        const result = await apiFetch<any>(`/api/gdrive/sync?type=${type}`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileId: f.id, snapshotDate: fDetected?.isoDate || driveSnapshotOverride[type] || undefined }),
        });
        setSyncLog(prev => prev.map((e, idx) => idx === i ? { ...e, status: "ok", message: `${result.imported} baris berhasil diimport`, rows: result.imported } : e));
        anyOk = true;
      } catch (e: any) {
        setSyncLog(prev => prev.map((e2, idx) => idx === i ? { ...e2, status: "error", message: e.message || "Gagal" } : e2));
      }
    }
    stopDriveProgress(type, anyOk);
    setDriveSyncing(p => ({ ...p, [type]: false }));
    if (anyOk) refetch();
  };

  const handleGsSync = async () => {
    setGsSyncing(true);
    setGsSyncResult(null);
    try {
      const result = await apiFetch<any>("/api/gsheets/sync", { method: "POST" });
      setGsSyncResult(result);
      refetchGsStatus();
      refetch();
      const imported = result.results?.filter((r: any) => r.status === "imported").length ?? 0;
      toast({ title: imported > 0 ? `${imported} snapshot berhasil diimport` : "Sync selesai", description: result.error || `${result.sheetsFound} sheet ditemukan` });
    } catch (e: any) {
      toast({ title: "Sync Gagal", description: e.message, variant: "destructive" });
    } finally { setGsSyncing(false); }
  };

  const handleLoadGsSheets = async () => {
    setGsLoadingSheets(true);
    setGsSheets([]);
    setGsSelected({});
    setGsTypeOverride({});
    try {
      const data = await apiFetch<{ sheets: any[] }>("/api/gsheets/sheets");
      const sheets = data.sheets || [];
      setGsSheets(sheets);
      const autoSel: Record<string, boolean> = {};
      const autoType: Record<string, "funnel" | "activity" | "performance" | ""> = {};
      sheets.forEach((s: any) => {
        autoSel[s.title] = !!s.detectedType;
        autoType[s.title] = s.detectedType || "";
      });
      setGsSelected(autoSel);
      setGsTypeOverride(autoType);
    } catch (e: any) {
      toast({ title: "Gagal Memuat Sheet", description: e.message, variant: "destructive" });
    } finally { setGsLoadingSheets(false); }
  };

  const handleSyncSelected = async () => {
    const selections = gsSheets
      .filter((s: any) => gsSelected[s.title])
      .map((s: any) => ({
        title: s.title,
        sheetId: s.sheetId,
        type: (gsTypeOverride[s.title] || s.detectedType) as "funnel" | "activity" | "performance",
      }))
      .filter(sel => !!sel.type);
    if (selections.length === 0) {
      toast({ title: "Belum ada pilihan", description: "Pilih minimal satu sheet dan pastikan tipe data sudah dipilih", variant: "destructive" });
      return;
    }
    setGsSyncingSelected(true);
    try {
      const result = await apiFetch<any>("/api/gsheets/sync-selected", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selections }),
      });
      setGsSyncResult(result);
      refetchGsStatus();
      const imported = (result.results || []).filter((r: any) => r.status === "imported").length;
      toast({
        title: imported > 0 ? `${imported} sheet berhasil diimport` : "Sync selesai",
        description: result.error || `${selections.length} sheet diproses`,
      });
      if (imported > 0) refetch();
    } catch (e: any) {
      toast({ title: "Gagal Import", description: e.message, variant: "destructive" });
    } finally { setGsSyncingSelected(false); }
  };

  // Data Quality proof state
  const [dqExpanded, setDqExpanded] = useState(false);
  const { data: dqData } = useQuery<any>({
    queryKey: ["data-quality"],
    queryFn: () => apiFetch("/api/funnel/data-quality"),
    staleTime: 60_000,
  });

  const handleSaveTargetRow = async () => {
    if (!editRowData.tahun || !editRowData.divisi) {
      toast({ title: "Lengkapi data", description: "Tahun dan divisi wajib diisi", variant: "destructive" }); return;
    }
    setTSaving(true);
    try {
      await apiFetch("/api/funnel/targets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tahun: Number(editRowData.tahun),
          divisi: editRowData.divisi,
          targetHo: Number(editRowData.targetHo.replace(/\D/g, "") || 0),
          targetFullHo: Number(editRowData.targetFullHo.replace(/\D/g, "") || 0),
        }),
      });
      toast({ title: "Tersimpan", description: `${editRowData.divisi} ${editRowData.tahun}` });
      refetchTargets();
      qc.invalidateQueries({ queryKey: ["funnel-data"] });
      setEditRowId(null);
      setFocusField(null);
    } catch (e: any) {
      toast({ title: "Gagal Menyimpan", description: e.message || "Terjadi kesalahan", variant: "destructive" });
    } finally {
      setTSaving(false);
    }
  };

  const handleDeleteTarget = async (id: number) => {
    try {
      await apiFetch(`/api/funnel/targets/${id}`, { method: "DELETE" });
      toast({ title: "Target Dihapus" });
      setTDelConfirm(null);
      refetchTargets();
      qc.invalidateQueries({ queryKey: ["funnel-data"] });
    } catch (e: any) {
      toast({ title: "Gagal Menghapus", description: e.message, variant: "destructive" });
    }
  };

  const activeTabData = TABS.find(t => t.id === activeTab)!;
  const currentFile = files[activeTab] || null;
  const currentSnapshotOverride = snapshotOverride[activeTab] || "";
  const currentSheetName = sheetNames[activeTab] || "";

  const fileDetected = currentFile ? extractDateFromFilename(currentFile.name) : null;
  // Final snapshot = override OR auto-detected from filename
  const finalSnapshotDate = currentSnapshotOverride || fileDetected?.isoDate || null;
  const finalPeriod = finalSnapshotDate ? finalSnapshotDate.slice(0, 7) : fileDetected?.period || null;

  const isPending =
    (activeTab === "performansi" && perfMut.isPending) ||
    (activeTab === "funnel" && funnelMut.isPending) ||
    (activeTab === "activity" && actMut.isPending);

  // Block browser back/reload while importing
  useEffect(() => {
    if (!isPending) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "Import sedang berjalan, yakin ingin meninggalkan halaman?";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isPending]);

  const filteredHistory = history?.filter(h => h.type === activeTabData.type) || [];
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const sameDayImport = filteredHistory.find(h => format(new Date(h.createdAt), "yyyy-MM-dd") === todayStr);

  // ── File selection handler ─────────────────────────────────────────────────
  const applyFile = useCallback(async (file: File) => {
    const sheets = await readSheetNames(file);
    if (sheets.length > 1) {
      setSheetPicker({ file, sheets });
    } else {
      commitFile(file, sheets[0] || "");
    }
  }, [activeTab]);

  const commitFile = useCallback((file: File, sheet: string) => {
    setFiles(prev => ({ ...prev, [activeTab]: file }));
    setSheetNames(prev => ({ ...prev, [activeTab]: sheet }));
    // Auto-fill snapshot date from filename
    const detected = extractDateFromFilename(file.name);
    if (detected) {
      setSnapshotOverride(prev => ({ ...prev, [activeTab]: detected.isoDate }));
    }
    setSheetPicker(null);
  }, [activeTab]);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) applyFile(file);
    e.target.value = "";
  };

  const clearFile = () => {
    setFiles(prev => ({ ...prev, [activeTab]: null }));
    setSheetNames(prev => ({ ...prev, [activeTab]: "" }));
    setSnapshotOverride(prev => ({ ...prev, [activeTab]: "" }));
  };

  // ── Drag & Drop ────────────────────────────────────────────────────────────
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };
  const handleDragLeave = () => setIsDragOver(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && (file.name.endsWith(".xlsx") || file.name.endsWith(".xls"))) {
      applyFile(file);
    } else if (file) {
      toast({ title: "Format Tidak Didukung", description: "Hanya file .xlsx atau .xls yang diperbolehkan", variant: "destructive" });
    }
  };

  // ── Progress simulation ────────────────────────────────────────────────────
  const PROGRESS_STAGES = [
    { to: 20,  step: 0.8,   label: "Membaca & encode file..." },
    { to: 60,  step: 0.4,   label: "Proses cleaning data..." },
    { to: 95,  step: 0.04,  label: "Menyimpan ke database..." },
  ];

  function startProgressSim() {
    let p = 0;
    let si = 0;
    setImportProgress({ percent: 0, stage: PROGRESS_STAGES[0].label });
    setIsImporting(true);
    progressIntervalRef.current = setInterval(() => {
      p += PROGRESS_STAGES[si].step;
      if (p >= PROGRESS_STAGES[si].to && si < PROGRESS_STAGES.length - 1) si++;
      const capped = Math.min(p, PROGRESS_STAGES[si].to);
      setImportProgress({ percent: Math.round(capped), stage: PROGRESS_STAGES[si].label });
    }, 50);
  }

  function stopProgressSim(success: boolean) {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    setIsImporting(false);
    if (success) {
      setImportProgress({ percent: 100, stage: "Selesai ✓" });
      setTimeout(() => setImportProgress(null), 2000);
    } else {
      setImportProgress(null);
    }
  }

  // ── Import logic ───────────────────────────────────────────────────────────
  const buildBody = async (): Promise<any | null> => {
    if (!currentFile) {
      toast({ title: "File Kosong", description: "Pilih file Excel terlebih dahulu", variant: "destructive" });
      return null;
    }
    try {
      const fileData = await fileToBase64(currentFile);
      const body: any = { fileData };
      if (currentSheetName) body.sheetName = currentSheetName;
      if (finalPeriod) body.period = finalPeriod;
      if (finalSnapshotDate) body.snapshotDate = finalSnapshotDate;
      return body;
    } catch {
      toast({ title: "Gagal Membaca File", description: "File tidak dapat dibaca", variant: "destructive" });
      return null;
    }
  };

  const runImport = async (body: any, tab: string) => {
    const mut = tab === "performansi" ? perfMut : tab === "funnel" ? funnelMut : actMut;
    const tabData = TABS.find(t => t.id === tab)!;
    const res = await mut.mutateAsync({ data: body });
    const extraInfo = (res as any).rawCount != null
      ? ` (${(res as any).rawCount} baris mentah, ${res.rowsImported} lolos cleaning)`
      : ` (${res.rowsImported} baris)`;
    toast({
      title: "Import Berhasil",
      description: `Data ${tabData.label} berhasil diimport${extraInfo}. Periode: ${res.period}`,
    });
    const discovered = (res as any).newAmDiscovered ?? 0;
    if (discovered > 0) {
      setTimeout(() => {
        toast({
          title: `🔔 ${discovered} AM Baru Terdeteksi`,
          description: `NIK baru ditemukan dari data import. Buka halaman Manajemen Akun untuk melihat dan menyetujui penambahan AM.`,
        });
      }, 600);
    }
    setConflictInfo(null);
    refetch();
  };

  const handleSync = async () => {
    const body = await buildBody();
    if (!body) return;
    startProgressSim();
    try {
      await runImport(body, activeTab);
      stopProgressSim(true);
    } catch (e: any) {
      stopProgressSim(false);
      const errData = e?.data || e?.error;
      if (e?.status === 409 || errData?.conflict) {
        const info = errData || e?.data;
        setConflictInfo({
          error: info?.error || "Data periode ini sudah ada",
          existingId: info?.existingId,
          existingRows: info?.existingRows,
          period: info?.period,
          importedAt: info?.importedAt,
          pendingBody: body,
          pendingTab: activeTab,
        });
        return;
      }
      const errMsg = e?.data?.error || e?.error?.error || e?.message || "Gagal menghubungi server";
      toast({ title: "Import Gagal", description: errMsg, variant: "destructive" });
    }
  };

  const handleOverwrite = async () => {
    if (!conflictInfo) return;
    setIsOverwriting(true);
    startProgressSim();
    try {
      await runImport({ ...conflictInfo.pendingBody, forceOverwrite: true }, conflictInfo.pendingTab);
      stopProgressSim(true);
    } catch (e: any) {
      stopProgressSim(false);
      const errMsg = e?.data?.error || e?.message || "Gagal menimpa data";
      toast({ title: "Gagal Menimpa", description: errMsg, variant: "destructive" });
    } finally {
      setIsOverwriting(false);
    }
  };

  const handleDeleteImport = async (importId: number) => {
    setIsDeleting(true);
    try {
      const base = (import.meta.env.BASE_URL || "").replace(/\/$/, "");
      const res = await fetch(`${base}/api/import/${importId}`, { method: "DELETE", credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menghapus");
      toast({ title: "Import Dihapus", description: data.message });
      setDeleteConfirmId(null);
      refetch();
    } catch (e: any) {
      toast({ title: "Gagal Menghapus", description: e.message || "Terjadi kesalahan", variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Sheet Picker Modal */}
      {sheetPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-sm mx-4 overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex items-center gap-3">
              <Layers className="w-4 h-4 text-primary" />
              <div>
                <p className="font-display font-bold text-sm text-foreground">Pilih Sheet</p>
                <p className="text-[11px] text-muted-foreground mt-0.5 truncate max-w-[220px]">{sheetPicker.file.name}</p>
              </div>
            </div>
            <div className="p-4 space-y-2">
              <p className="text-xs text-muted-foreground mb-3">File ini memiliki {sheetPicker.sheets.length} sheet. Pilih sheet yang berisi data:</p>
              {sheetPicker.sheets.map(sheet => (
                <button
                  key={sheet}
                  onClick={() => commitFile(sheetPicker.file, sheet)}
                  className="w-full text-left px-4 py-2.5 rounded-xl border border-border hover:border-primary/40 hover:bg-primary/5 text-sm font-medium text-foreground transition-all"
                >
                  {sheet}
                </button>
              ))}
            </div>
            <div className="px-4 pb-4">
              <Button variant="ghost" size="sm" className="w-full text-muted-foreground" onClick={() => setSheetPicker(null)}>
                Batal
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Conflict Warning Banner */}
      {conflictInfo && (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-display font-bold text-amber-900 text-sm mb-1">Data Duplikat Terdeteksi</p>
              <p className="text-amber-800 text-xs mb-3">{conflictInfo.error}</p>
              <div className="bg-amber-100/70 border border-amber-200 rounded-xl px-4 py-2.5 mb-4 text-xs space-y-1">
                <div className="flex justify-between"><span className="text-amber-700">Import yang ada:</span><span className="font-semibold text-amber-900">#{conflictInfo.existingId}</span></div>
                <div className="flex justify-between"><span className="text-amber-700">Baris lama:</span><span className="font-semibold text-amber-900">{conflictInfo.existingRows?.toLocaleString("id-ID")} baris</span></div>
                <div className="flex justify-between"><span className="text-amber-700">Waktu import lama:</span><span className="font-semibold text-amber-900">{conflictInfo.importedAt ? format(new Date(conflictInfo.importedAt), "dd MMM yyyy, HH:mm", { locale: id }) : "-"}</span></div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="destructive" onClick={handleOverwrite} disabled={isOverwriting} className="bg-amber-600 hover:bg-amber-700">
                  {isOverwriting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <RefreshCw className="w-3.5 h-3.5 mr-1.5" />}
                  Timpa Data Lama
                </Button>
                <Button size="sm" variant="outline" onClick={() => setConflictInfo(null)} disabled={isOverwriting}>Batalkan</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main card */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        {/* Tab bar — disabled while importing */}
        <div className="flex border-b border-border bg-secondary/20">
          {TABS.map(tab => (
            <button
              key={tab.id}
              disabled={isPending && activeTab !== tab.id}
              onClick={() => { if (!isPending) { setActiveTab(tab.id); setConflictInfo(null); } }}
              title={isPending && activeTab !== tab.id ? "Tunggu import selesai sebelum ganti tab" : undefined}
              className={cn(
                "flex items-center gap-2 px-5 py-4 text-sm font-semibold transition-all relative",
                activeTab === tab.id ? "text-primary" : "text-muted-foreground hover:text-foreground",
                isPending && activeTab !== tab.id && "opacity-40 cursor-not-allowed pointer-events-none"
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {activeTab === tab.id && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />
              )}
            </button>
          ))}
          {isPending && (
            <div className="ml-auto flex items-center px-4 text-[11px] text-amber-600 dark:text-amber-400 font-medium gap-1.5">
              <Loader2 className="w-3 h-3 animate-spin" /> Import berjalan...
            </div>
          )}
        </div>

        {/* Target HO Tab Content — Excel-style inline edit */}
        {activeTab === "target-ho" && (
          <div className="p-6">
            <div className="border border-border rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-red-700 text-white">
                      <th className="px-4 py-2.5 text-xs font-black uppercase w-24">Tahun</th>
                      <th className="px-4 py-2.5 text-xs font-black uppercase w-24">Divisi</th>
                      <th className="px-4 py-2.5 text-xs font-black uppercase text-right">Target HO</th>
                      <th className="px-4 py-2.5 text-xs font-black uppercase text-right">Target Full HO</th>
                      <th className="px-4 py-2.5 text-xs font-black uppercase text-right w-24">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {targets.length === 0 && editRowId !== "new" && (
                      <tr>
                        <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground text-sm">
                          <Target className="w-8 h-8 mx-auto mb-3 opacity-20" />
                          Belum ada data. Klik <span className="font-semibold text-primary">+ Tambah Baris</span> di bawah.
                        </td>
                      </tr>
                    )}

                    {targets.map((t: any) => {
                      const isEditing = editRowId === t.id;
                      const isDeleting = tDelConfirm === t.id;
                      return (
                        <tr
                          key={t.id}
                          className={cn(
                            "transition-colors group",
                            isDeleting ? "bg-red-50" : isEditing ? "bg-yellow-50" : "hover:bg-secondary/20"
                          )}
                          onDoubleClick={() => {
                            if (isEditing) return;
                            setEditRowId(t.id);
                            setEditRowData({
                              tahun: String(t.tahun),
                              divisi: t.divisi || "DPS",
                              targetHo: String(t.targetHo || ""),
                              targetFullHo: String(t.targetFullHo || ""),
                            });
                            setFocusField(null);
                          }}
                        >
                          {/* TAHUN */}
                          <td className="px-2 py-1.5">
                            {isEditing ? (
                              <input
                                type="number" min="2020" max="2099"
                                value={editRowData.tahun}
                                autoFocus={focusField === "tahun" || focusField === null}
                                onChange={e => setEditRowData(p => ({ ...p, tahun: e.target.value }))}
                                onKeyDown={e => { if (e.key === "Enter") handleSaveTargetRow(); if (e.key === "Escape") { setEditRowId(null); setFocusField(null); } }}
                                className="w-full h-8 px-2 bg-white border-2 border-primary rounded text-sm font-mono focus:outline-none"
                              />
                            ) : (
                              <span className="px-2 font-mono text-sm">{t.tahun}</span>
                            )}
                          </td>
                          {/* DIVISI */}
                          <td className="px-2 py-1.5">
                            {isEditing ? (
                              <select
                                value={editRowData.divisi}
                                onChange={e => setEditRowData(p => ({ ...p, divisi: e.target.value }))}
                                onKeyDown={e => { if (e.key === "Enter") handleSaveTargetRow(); if (e.key === "Escape") { setEditRowId(null); setFocusField(null); } }}
                                className="w-full h-8 px-2 bg-white border-2 border-primary rounded text-sm focus:outline-none"
                              >
                                <option value="DPS">DPS</option>
                                <option value="DSS">DSS</option>
                              </select>
                            ) : (
                              <span className={cn("text-xs font-bold px-2 py-0.5 rounded", t.divisi === "DPS" ? "bg-blue-100 text-blue-800" : "bg-violet-100 text-violet-800")}>
                                {t.divisi || "—"}
                              </span>
                            )}
                          </td>
                          {/* TARGET HO */}
                          <td className="px-2 py-1.5 text-right">
                            {isEditing ? (
                              <input
                                type="text" placeholder="0"
                                value={editRowData.targetHo}
                                onChange={e => setEditRowData(p => ({ ...p, targetHo: e.target.value }))}
                                onKeyDown={e => { if (e.key === "Enter") handleSaveTargetRow(); if (e.key === "Escape") { setEditRowId(null); setFocusField(null); } }}
                                className="w-full h-8 px-2 bg-white border-2 border-primary rounded text-sm font-mono text-right focus:outline-none"
                              />
                            ) : (
                              <span className="px-2 font-mono text-sm">Rp {((t.targetHo||0)/1e9).toFixed(2)}M</span>
                            )}
                          </td>
                          {/* TARGET FULL HO */}
                          <td className="px-2 py-1.5 text-right">
                            {isEditing ? (
                              <input
                                type="text" placeholder="0"
                                value={editRowData.targetFullHo}
                                onChange={e => setEditRowData(p => ({ ...p, targetFullHo: e.target.value }))}
                                onKeyDown={e => { if (e.key === "Enter") handleSaveTargetRow(); if (e.key === "Escape") { setEditRowId(null); setFocusField(null); } }}
                                className="w-full h-8 px-2 bg-white border-2 border-primary rounded text-sm font-mono text-right focus:outline-none"
                              />
                            ) : (
                              <span className="px-2 font-mono text-sm font-semibold">Rp {((t.targetFullHo||0)/1e9).toFixed(2)}M</span>
                            )}
                          </td>
                          {/* AKSI */}
                          <td className="px-2 py-1.5 text-right">
                            {isEditing ? (
                              <div className="flex items-center justify-end gap-1">
                                <Button size="sm" onClick={handleSaveTargetRow} disabled={tSaving}
                                  className="h-7 px-2 bg-green-600 hover:bg-green-700 text-white text-xs">
                                  {tSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => { setEditRowId(null); setFocusField(null); }}
                                  className="h-7 px-2 text-muted-foreground hover:text-foreground text-xs">
                                  <X className="w-3 h-3" />
                                </Button>
                              </div>
                            ) : isDeleting ? (
                              <div className="flex items-center justify-end gap-1">
                                <Button size="sm" variant="destructive" onClick={() => handleDeleteTarget(t.id)} className="h-7 px-2 text-xs">Hapus</Button>
                                <Button size="sm" variant="ghost" onClick={() => setTDelConfirm(null)} className="h-7 px-2 text-xs">Batal</Button>
                              </div>
                            ) : (
                              <Button size="sm" variant="ghost" onClick={() => setTDelConfirm(t.id)}
                                className="h-7 px-2 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-opacity">
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}

                    {/* New row being added */}
                    {editRowId === "new" && (
                      <tr className="bg-yellow-50">
                        <td className="px-2 py-1.5">
                          <input type="number" min="2020" max="2099"
                            value={editRowData.tahun} autoFocus
                            onChange={e => setEditRowData(p => ({ ...p, tahun: e.target.value }))}
                            onKeyDown={e => { if (e.key === "Enter") handleSaveTargetRow(); if (e.key === "Escape") { setEditRowId(null); setFocusField(null); } }}
                            className="w-full h-8 px-2 bg-white border-2 border-primary rounded text-sm font-mono focus:outline-none"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <select value={editRowData.divisi}
                            onChange={e => setEditRowData(p => ({ ...p, divisi: e.target.value }))}
                            onKeyDown={e => { if (e.key === "Enter") handleSaveTargetRow(); if (e.key === "Escape") { setEditRowId(null); setFocusField(null); } }}
                            className="w-full h-8 px-2 bg-white border-2 border-primary rounded text-sm focus:outline-none">
                            <option value="DPS">DPS</option>
                            <option value="DSS">DSS</option>
                          </select>
                        </td>
                        <td className="px-2 py-1.5">
                          <input type="text" placeholder="0"
                            value={editRowData.targetHo}
                            onChange={e => setEditRowData(p => ({ ...p, targetHo: e.target.value }))}
                            onKeyDown={e => { if (e.key === "Enter") handleSaveTargetRow(); if (e.key === "Escape") { setEditRowId(null); setFocusField(null); } }}
                            className="w-full h-8 px-2 bg-white border-2 border-primary rounded text-sm font-mono text-right focus:outline-none"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <input type="text" placeholder="0"
                            value={editRowData.targetFullHo}
                            onChange={e => setEditRowData(p => ({ ...p, targetFullHo: e.target.value }))}
                            onKeyDown={e => { if (e.key === "Enter") handleSaveTargetRow(); if (e.key === "Escape") { setEditRowId(null); setFocusField(null); } }}
                            className="w-full h-8 px-2 bg-white border-2 border-primary rounded text-sm font-mono text-right focus:outline-none"
                          />
                        </td>
                        <td className="px-2 py-1.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button size="sm" onClick={handleSaveTargetRow} disabled={tSaving}
                              className="h-7 px-2 bg-green-600 hover:bg-green-700 text-white text-xs">
                              {tSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => { setEditRowId(null); setFocusField(null); }}
                              className="h-7 px-2 text-muted-foreground hover:text-foreground text-xs">
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )}

                    {/* Add row button row */}
                    {editRowId === null && (
                      <tr>
                        <td colSpan={5} className="px-3 py-1.5">
                          <button
                            onClick={() => {
                              setEditRowId("new");
                              setEditRowData({ tahun: String(curYear), divisi: "DPS", targetHo: "", targetFullHo: "" });
                              setFocusField(null);
                            }}
                            className="flex items-center gap-1.5 text-xs text-primary/70 hover:text-primary font-semibold py-1 px-1 rounded transition-colors"
                          >
                            <span className="text-base leading-none">+</span> Tambah Baris
                          </button>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            {targets.length > 0 && (
              <p className="mt-2 text-xs text-muted-foreground">Klik dua kali pada baris untuk mengedit · Enter untuk simpan · Esc untuk batal</p>
            )}
          </div>
        )}

        {/* File-based tabs content */}
        {activeTab !== "target-ho" && activeTab !== "gsheets" && (() => {
          const typeMap: Record<string, string> = { performansi: "performance", funnel: "funnel", activity: "activity" };
          const driveType = typeMap[activeTab];
          const driveHasFolder = driveType === "performance" ? !!appSettings?.gDriveFolderPerformance
            : driveType === "funnel" ? !!appSettings?.gDriveFolderFunnel
            : !!appSettings?.gDriveFolderActivity;
          const curMode = uploadMode[activeTab] || "manual";
          const driveFilesList = driveFiles[driveType] || [];
          const isListing = !!driveListLoading[driveType];
          const isSyncing = !!driveSyncing[driveType];
          const syncResult = driveSyncResult[driveType];
          const curDriveSnap = driveSnapshotOverride[driveType] || "";
          const driveDetected = driveFilesList.length > 0 ? extractDateFromFilename(driveFilesList[0].name) : null;
          const curDriveProgress = driveProgress[driveType] || null;

          return (
          <div className="p-6 space-y-4">
            {/* Upload mode toggle */}
            <div className="flex items-center gap-1 p-1 bg-red-50 border border-red-200 rounded-lg w-fit">
              {([
                { key: "manual", label: "Upload Manual", icon: UploadCloud },
                { key: "drive",  label: "Google Drive",  icon: FolderOpen },
              ] as const).map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => {
                    setUploadMode(p => ({ ...p, [activeTab]: key }));
                    if (key === "drive" && driveHasFolder && driveFilesList.length === 0) {
                      handleDriveList(driveType);
                    }
                  }}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all",
                    curMode === key
                      ? "bg-red-700 text-white shadow-sm"
                      : "text-red-700/70 hover:text-red-700 hover:bg-red-100"
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                  {key === "drive" && !driveHasFolder && (
                    <span className={cn("ml-1 text-[9px] font-normal normal-case", curMode === key ? "text-red-200" : "text-red-400/60")}>(belum diatur)</span>
                  )}
                </button>
              ))}
            </div>

            {/* ── MANUAL MODE ────────────────────────────────────────────────── */}
            {curMode === "manual" && (
              <>
                {/* File upload with drag & drop */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    File Excel (.xlsx / .xls)
                  </label>
                  {currentFile ? (
                    <div className="flex items-center gap-3 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                      <FileSpreadsheet className="w-5 h-5 text-emerald-600 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-emerald-800 truncate">{currentFile.name}</p>
                        <p className="text-xs text-emerald-600">
                          {(currentFile.size / 1024).toFixed(0)} KB
                          {currentSheetName && <> · Sheet: <span className="font-medium">{currentSheetName}</span></>}
                        </p>
                      </div>
                      <button onClick={clearFile} className="text-emerald-400 hover:text-emerald-700 transition-colors p-0.5">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      className={cn(
                        "w-full px-4 py-8 border-2 border-dashed rounded-xl text-center cursor-pointer transition-all select-none",
                        isDragOver
                          ? "border-primary bg-primary/5 scale-[1.01]"
                          : "border-border hover:border-primary/40 hover:bg-primary/[0.02]"
                      )}
                    >
                      <UploadCloud className={cn("w-8 h-8 mx-auto mb-2 transition-colors", isDragOver ? "text-primary" : "text-muted-foreground/40")} />
                      <p className={cn("text-sm font-semibold transition-colors", isDragOver ? "text-primary" : "text-muted-foreground")}>
                        {isDragOver ? "Lepaskan file di sini" : "Klik atau seret file Excel ke sini"}
                      </p>
                      <p className="text-xs text-muted-foreground/60 mt-1">Format: .xlsx atau .xls</p>
                    </div>
                  )}
                  <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileInputChange} />
                </div>

                {/* Auto-detected / warning banners */}
                {fileDetected && (
                  <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl border bg-emerald-50 border-emerald-200 text-emerald-700 text-xs font-medium">
                    <Calendar className="w-3.5 h-3.5 shrink-0" />
                    <span>Snapshot terdeteksi dari nama file: <strong>{fileDetected.display}</strong> (Periode: {fileDetected.period})</span>
                  </div>
                )}
                {!fileDetected && currentFile && (
                  <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl border bg-amber-50 border-amber-200 text-amber-700 text-xs font-medium">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>Tanggal tidak terdeteksi dari nama file — isi tanggal snapshot secara manual di bawah</span>
                  </div>
                )}

                {/* Same-day duplicate warning */}
                {sameDayImport && (
                  <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl border bg-amber-50 border-amber-300 text-amber-800">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                    <div className="text-xs">
                      <p className="font-bold mb-0.5">Sudah Ada Snapshot Hari Ini</p>
                      <p className="text-amber-700 leading-relaxed">
                        {formatSnapshotTitle(sameDayImport.createdAt, sameDayImport.type, sameDayImport.snapshotDate)} sudah tersimpan ({sameDayImport.rowsImported} baris).
                        Jika Anda mengimport ulang, data lama untuk periode ini akan <strong>ditimpa</strong>.
                      </p>
                    </div>
                  </div>
                )}

                {/* Snapshot date + Import button */}
                <div className="flex items-end gap-2 flex-wrap">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" /> Tanggal Snapshot
                      <span className="text-[10px] font-normal normal-case text-muted-foreground/60">(opsional)</span>
                    </label>
                    <input
                      type="date"
                      value={currentSnapshotOverride}
                      onChange={e => setSnapshotOverride(prev => ({ ...prev, [activeTab]: e.target.value }))}
                      className="h-9 px-3 bg-secondary/40 border border-border rounded-lg text-sm font-sans focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition-all"
                    />
                  </div>
                  {currentSnapshotOverride && !isPending && (
                    <Button size="sm" variant="outline" onClick={() => setSnapshotOverride(prev => ({ ...prev, [activeTab]: "" }))}>
                      Reset
                    </Button>
                  )}
                  {/* Progress bar (inline, appears when importing) */}
                  {importProgress && (
                    <div className="flex-1 min-w-[160px] flex flex-col justify-end gap-1.5 pb-0.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-medium text-muted-foreground truncate">{importProgress.stage}</span>
                        <span className={cn(
                          "text-[11px] font-bold tabular-nums shrink-0",
                          importProgress.percent === 100 ? "text-emerald-600" : "text-primary"
                        )}>{importProgress.percent}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-border overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-200 ease-out",
                            importProgress.percent === 100 ? "bg-emerald-500" : "bg-primary"
                          )}
                          style={{ width: `${importProgress.percent}%` }}
                        />
                      </div>
                    </div>
                  )}
                  <Button onClick={handleSync} disabled={isPending || !currentFile} className="h-9 px-5 gap-2">
                    {isPending
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Mengimport...</>
                      : <><UploadCloud className="w-4 h-4" /> Import Sekarang <ArrowRight className="w-3.5 h-3.5" /></>
                    }
                  </Button>
                </div>

                {/* Period info */}
                {finalPeriod && !isPending && (
                  <p className="text-xs text-muted-foreground">
                    periode: <span className="font-semibold text-foreground">{finalPeriod}</span>
                    {finalSnapshotDate && <> &middot; snapshot: <span className="font-semibold text-foreground">{finalSnapshotDate}</span></>}
                  </p>
                )}

                {/* Cleaning info */}
                <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-secondary/60 border border-border text-xs text-muted-foreground">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-primary/60" />
                  <div>
                    <span className="font-semibold text-foreground">Pipeline cleaning aktif:</span>
                    {activeTab === "performansi" && " File RAW (PERIODE, NAMA_AM, TARGET_REVENUE, REAL_REVENUE per pelanggan) — otomatis diagregasi per AM."}
                    {activeTab === "funnel" && " Filter witel=SURAMADU, divisi=DPS/DSS, validasi NIK, fix AM Reni→Havea (mulai 2026), UPPER+TRIM pelanggan."}
                    {activeTab === "activity" && " Filter witel=SURAMADU, divisi=DPS/DSS, validasi NIK, UPPER+TRIM nama customer."}
                  </div>
                </div>
              </>
            )}

            {/* ── DRIVE MODE ─────────────────────────────────────────────────── */}
            {curMode === "drive" && (
              <>
                {!driveHasFolder ? (
                  <div className="flex items-start gap-3 px-4 py-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-800">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
                    <div className="text-xs">
                      <p className="font-bold mb-1">Folder Google Drive Belum Dikonfigurasi</p>
                      <p className="text-amber-700">Buka tab <strong>Google Sheets</strong> → pilih mode <em>Auto-sync Drive</em> → isi URL folder untuk tab ini.</p>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Snapshot date override for Drive mode */}
                    <div className="space-y-2">
                      <div className="flex items-end gap-2 flex-wrap">
                        <div className="flex flex-col gap-1">
                          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5" /> Tanggal Snapshot
                            <span className="text-[10px] font-normal normal-case text-muted-foreground/60">(auto-detect dari nama file)</span>
                          </label>
                          <input
                            type="date"
                            value={curDriveSnap}
                            onChange={e => setDriveSnapshotOverride(p => ({ ...p, [driveType]: e.target.value }))}
                            className="h-9 px-3 bg-secondary/40 border border-border rounded-lg text-sm font-sans focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary transition-all"
                          />
                        </div>
                        {curDriveSnap && (
                          <Button size="sm" variant="outline" onClick={() => setDriveSnapshotOverride(p => ({ ...p, [driveType]: driveDetected?.isoDate || "" }))}>
                            Reset
                          </Button>
                        )}
                      </div>
                      {curDriveSnap && (
                        <p className="text-xs text-muted-foreground">
                          snapshot: <span className="font-semibold text-foreground">{curDriveSnap}</span>
                          &middot; periode: <span className="font-semibold text-foreground">{curDriveSnap.slice(0, 7)}</span>
                        </p>
                      )}
                    </div>

                    {/* Drive action buttons */}
                    <div className="space-y-2">
                      <div className="flex gap-2 flex-wrap">
                        <Button variant="outline" size="sm" onClick={() => {
                          handleDriveList(driveType);
                          setDriveSelectedFiles(p => ({ ...p, [driveType]: {} }));
                          setSyncLog([]);
                        }} disabled={isListing || isSyncing} className="gap-2 h-8 text-xs">
                          {isListing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FolderOpen className="w-3.5 h-3.5 text-amber-500" />}
                          {driveFilesList.length > 0 ? "Refresh Daftar File" : "Cek File di Drive"}
                        </Button>
                      </div>
                      {/* Progress bar for Drive sync */}
                      {curDriveProgress && (
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-medium text-muted-foreground truncate">{curDriveProgress.stage}</span>
                            <span className={cn(
                              "text-[11px] font-bold tabular-nums shrink-0",
                              curDriveProgress.percent === 100 ? "text-emerald-600" : "text-amber-600"
                            )}>{curDriveProgress.percent}%</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-border overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all duration-200 ease-out",
                                curDriveProgress.percent === 100 ? "bg-emerald-500" : "bg-amber-500"
                              )}
                              style={{ width: `${curDriveProgress.percent}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* File list with multi-select */}
                    {driveFilesList.length > 0 && (() => {
                      const selMap = driveSelectedFiles[driveType] || {};
                      const selectedIds = driveFilesList.filter((f: any) => selMap[f.id]).map((f: any) => f.id);
                      const allSelected = driveFilesList.length > 0 && driveFilesList.every((f: any) => selMap[f.id]);
                      const someSelected = selectedIds.length > 0;
                      const toggleAll = () => {
                        const next: Record<string, boolean> = {};
                        if (!allSelected) driveFilesList.forEach((f: any) => { next[f.id] = true; });
                        setDriveSelectedFiles(p => ({ ...p, [driveType]: next }));
                      };
                      const toggleFile = (fid: string) => {
                        setDriveSelectedFiles(p => ({
                          ...p,
                          [driveType]: { ...(p[driveType] || {}), [fid]: !(p[driveType] || {})[fid] },
                        }));
                      };
                      return (
                        <div className="border border-border rounded-xl overflow-hidden">
                          {/* Header with select-all + action */}
                          <div className="px-3 py-2 bg-secondary/40 border-b border-border flex items-center gap-2">
                            <button onClick={toggleAll} disabled={isSyncing} className="flex items-center gap-1.5 text-[11px] font-bold text-foreground hover:text-primary transition-colors">
                              {allSelected
                                ? <CheckSquare2 className="w-3.5 h-3.5 text-primary" />
                                : someSelected
                                  ? <CheckSquare2 className="w-3.5 h-3.5 text-muted-foreground" />
                                  : <Square className="w-3.5 h-3.5 text-muted-foreground" />
                              }
                              {driveFilesList.length} file ditemukan
                            </button>
                            <div className="ml-auto flex items-center gap-2">
                              {someSelected && (
                                <Button size="sm"
                                  onClick={() => handleDriveSyncBatch(driveType, driveFilesList.filter((f: any) => selMap[f.id]))}
                                  disabled={isSyncing}
                                  className="h-6 px-2.5 text-[10px] gap-1.5 bg-red-700 hover:bg-red-800 text-white"
                                >
                                  {isSyncing ? <Loader2 className="w-3 h-3 animate-spin" /> : <ListChecks className="w-3 h-3" />}
                                  Sync {selectedIds.length} file
                                </Button>
                              )}
                              <Button size="sm"
                                onClick={() => handleDriveSyncBatch(driveType, driveFilesList.slice(0, 1))}
                                disabled={isSyncing}
                                className="h-6 px-2.5 text-[10px] gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
                              >
                                {isSyncing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                                Terbaru saja
                              </Button>
                            </div>
                          </div>
                          <div className="divide-y divide-border/50 max-h-60 overflow-y-auto">
                            {driveFilesList.map((f: any, i: number) => {
                              const fDetected = extractDateFromFilename(f.name);
                              const isGSheet = f.mimeType === "application/vnd.google-apps.spreadsheet";
                              const isChecked = !!(selMap[f.id]);
                              return (
                                <div
                                  key={f.id}
                                  onClick={() => !isSyncing && toggleFile(f.id)}
                                  className={cn(
                                    "px-3 py-2.5 flex items-center gap-2.5 cursor-pointer transition-colors select-none",
                                    isChecked ? "bg-primary/5 border-l-2 border-l-primary" : i === 0 ? "bg-amber-50/60 hover:bg-amber-50" : "hover:bg-secondary/30"
                                  )}
                                >
                                  {isChecked
                                    ? <CheckSquare2 className="w-3.5 h-3.5 shrink-0 text-primary" />
                                    : <Square className="w-3.5 h-3.5 shrink-0 text-border" />
                                  }
                                  <FileSpreadsheet className={cn("w-3.5 h-3.5 shrink-0", i === 0 ? "text-amber-600" : isGSheet ? "text-green-600" : "text-muted-foreground/60")} />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <p className="text-xs font-semibold text-foreground truncate">{f.name}</p>
                                      {isGSheet && (
                                        <span className="shrink-0 text-[9px] font-bold bg-green-100 text-green-700 px-1.5 py-0.5 rounded border border-green-200">Sheets</span>
                                      )}
                                      {i === 0 && <span className="text-[9px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full border border-amber-200 shrink-0">Terbaru</span>}
                                    </div>
                                    <p className="text-[10px] text-muted-foreground mt-0.5">
                                      {f.modifiedTime ? format(new Date(f.modifiedTime), "d MMM yyyy, HH:mm", { locale: id }) : ""}
                                      {fDetected && <> · <span className="font-medium text-emerald-600">Snapshot: {fDetected.display}</span></>}
                                    </p>
                                  </div>
                                  <Button
                                    variant="ghost" size="sm"
                                    onClick={e => {
                                      e.stopPropagation();
                                      handleDriveSyncBatch(driveType, [f]);
                                    }}
                                    disabled={isSyncing}
                                    className="h-6 px-2 text-[10px] shrink-0 hover:bg-amber-100 hover:text-amber-800"
                                  >
                                    <Download className="w-3 h-3 mr-0.5" /> Sync ini
                                  </Button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Sync log panel — collapsible */}
                    {syncLog.length > 0 && (
                      <div className="border border-border rounded-xl overflow-hidden">
                        <button
                          onClick={() => setSyncLogOpen(p => !p)}
                          className="w-full px-3 py-2 flex items-center gap-2 bg-secondary/40 hover:bg-secondary/60 transition-colors border-b border-border text-left"
                        >
                          <Terminal className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <span className="text-[11px] font-bold text-foreground flex-1">Log Proses Sync</span>
                          <span className={cn(
                            "text-[9px] font-bold px-1.5 py-0.5 rounded-full",
                            syncLog.every(e => e.status === "ok") ? "bg-emerald-100 text-emerald-700"
                            : syncLog.some(e => e.status === "error") ? "bg-red-100 text-red-700"
                            : "bg-amber-100 text-amber-700"
                          )}>
                            {syncLog.filter(e => e.status === "ok").length}/{syncLog.length} OK
                          </span>
                          {syncLogOpen ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
                        </button>
                        {syncLogOpen && (
                          <div className="max-h-52 overflow-y-auto divide-y divide-border/40 bg-[#1e1e2e]/[0.03]">
                            {syncLog.map((entry, i) => (
                              <div key={entry.fileId} className="flex items-start gap-2.5 px-3 py-2.5">
                                <div className="shrink-0 mt-0.5">
                                  {entry.status === "waiting" && <Clock className="w-3.5 h-3.5 text-muted-foreground/40" />}
                                  {entry.status === "running" && <Loader2 className="w-3.5 h-3.5 text-amber-500 animate-spin" />}
                                  {entry.status === "ok" && <CircleCheck className="w-3.5 h-3.5 text-emerald-500" />}
                                  {entry.status === "error" && <CircleX className="w-3.5 h-3.5 text-red-500" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-[11px] font-semibold text-foreground truncate">{entry.fileName}</p>
                                  <p className={cn(
                                    "text-[10px] mt-0.5",
                                    entry.status === "ok" ? "text-emerald-600" : entry.status === "error" ? "text-red-600" : "text-muted-foreground"
                                  )}>{entry.message}</p>
                                </div>
                                {entry.rows !== undefined && (
                                  <span className="shrink-0 text-[10px] font-bold tabular-nums text-emerald-600">{entry.rows.toLocaleString("id-ID")} baris</span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
          );
        })()}
      </div>

      {/* History Table — only for file-import tabs (not gsheets, history appears in respective type tabs) */}
      {activeTab !== "target-ho" && activeTab !== "gsheets" && (
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-border flex items-center gap-3">
          <History className="w-4 h-4 text-muted-foreground" />
          <h2 className="font-display font-bold text-sm text-foreground">Riwayat Import — {activeTabData.label}</h2>
          <span className="ml-auto text-xs text-muted-foreground">{filteredHistory.length} snapshot tersedia</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-secondary/30 border-b border-border">
                <th className="px-6 py-3 text-xs font-bold text-foreground uppercase tracking-wide">Versi Snapshot</th>
                <th className="px-5 py-3 text-xs font-bold text-foreground uppercase tracking-wide">Periode</th>
                <th className="px-5 py-3 text-xs font-bold text-foreground uppercase tracking-wide text-right">Baris</th>
                <th className="px-5 py-3 text-xs font-bold text-foreground uppercase tracking-wide">Status</th>
                <th className="px-5 py-3 text-xs font-bold text-foreground uppercase tracking-wide text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filteredHistory.map((h, i) => (
                <tr key={i} className={cn("transition-colors", deleteConfirmId === h.id ? "bg-red-50" : "hover:bg-secondary/20")}>
                  <td className="px-6 py-3.5">
                    <p className="text-xs font-semibold text-foreground leading-snug">{formatSnapshotTitle(h.createdAt, h.type, h.snapshotDate)}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{format(new Date(h.createdAt), 'HH:mm:ss', { locale: id })} WIB · ID #{h.id}</p>
                  </td>
                  <td className="px-5 py-3.5 font-mono text-sm text-foreground">{h.period}</td>
                  <td className="px-5 py-3.5 text-right font-semibold text-foreground tabular-nums">{h.rowsImported.toLocaleString('id-ID')}</td>
                  <td className="px-5 py-3.5">
                    <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-semibold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3" /> Sukses
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    {deleteConfirmId === h.id ? (
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-xs text-red-600 font-semibold">Hapus semua data?</span>
                        <Button size="sm" variant="destructive" onClick={() => handleDeleteImport(h.id)} disabled={isDeleting}>
                          {isDeleting ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Trash2 className="w-3 h-3 mr-1" />}
                          Ya, Hapus
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setDeleteConfirmId(null)} disabled={isDeleting}>Batal</Button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end">
                        <RowActions actions={[
                          { type: "view", onClick: () => navigate(`/import/detail/${h.id}`), label: "Lihat Data" },
                          { type: "delete", onClick: () => setDeleteConfirmId(h.id) },
                        ]} />
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {filteredHistory.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-14 text-center text-muted-foreground text-sm">
                    <History className="w-8 h-8 mx-auto mb-3 opacity-30" />
                    Belum ada riwayat import untuk {activeTabData.label}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* Google Sheets / Drive Config Tab */}
      {activeTab === "gsheets" && (
        <div className="space-y-3">

          {/* ── Row 1: API Key + Mode selector (compact, side-by-side) ──────── */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
            <div className="px-5 py-3 flex items-center gap-3 flex-wrap">
              {/* API Key section */}
              <div className="flex items-center gap-2 flex-1 min-w-[260px]">
                <div className="shrink-0">
                  {appSettings?.gSheetsApiKey
                    ? <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200"><CheckCircle2 className="w-3 h-3" /> API Key</span>
                    : <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200"><AlertCircle className="w-3 h-3" /> API Key</span>
                  }
                </div>
                <input
                  type="password"
                  value={gsForm.apiKey}
                  onChange={e => setGsForm(p => ({ ...p, apiKey: e.target.value }))}
                  placeholder={appSettings?.gSheetsApiKey ? "Sudah tersimpan — isi untuk mengganti" : "AIza... (Google API Key)"}
                  className="flex-1 h-8 px-3 bg-background border border-border rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <Button
                  size="sm"
                  onClick={handleSaveGsSettings}
                  disabled={gsSaving || !gsForm.apiKey}
                  className="h-8 gap-1.5 text-xs shrink-0"
                >
                  {gsSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Simpan
                </Button>
              </div>

              {/* Mode selector — button group */}
              <div className="flex items-center gap-1 p-0.5 bg-secondary/60 border border-border rounded-lg shrink-0">
                <button
                  onClick={() => setGsForm(p => ({ ...p, _mode: "sheets" }))}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all",
                    gsForm._mode !== "drive"
                      ? "bg-white text-foreground shadow-sm border border-border"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Sheet className="w-3.5 h-3.5 text-emerald-600" />
                  Google Spreadsheet
                </button>
                <button
                  onClick={() => setGsForm(p => ({ ...p, _mode: "drive" }))}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all",
                    gsForm._mode === "drive"
                      ? "bg-white text-foreground shadow-sm border border-border"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <FolderOpen className="w-3.5 h-3.5 text-amber-500" />
                  Google Drive Folder
                  {driveSchedulerForm.enabled && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* ── Path A: Google Sheets ──────────────────────────────────────── */}
          {gsForm._mode !== "drive" && (
            <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
              <div className="px-5 py-3.5 border-b border-border flex items-center gap-3">
                <Sheet className="w-4 h-4 text-emerald-600" />
                <h2 className="font-display font-bold text-sm text-foreground">Import dari Google Sheets</h2>
                <p className="text-[11px] text-muted-foreground">Paste URL → cek sheet → pilih → import</p>
              </div>
              <div className="p-5 space-y-4">
                {/* Spreadsheet URL */}
                <div className="space-y-1.5">
                  <div className="flex gap-2">
                    <input type="text" value={gsForm.spreadsheetId} onChange={e => {
                      const val = e.target.value.trim();
                      const match = val.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
                      setGsForm(p => ({ ...p, spreadsheetId: match ? match[1] : val }));
                    }}
                      placeholder="Paste URL Google Sheets atau Spreadsheet ID langsung..."
                      className="flex-1 h-9 px-3 bg-background border border-border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30" />
                    <Button variant="outline" onClick={handleSaveGsSettings} disabled={gsSaving} className="gap-1.5 h-9 text-xs shrink-0">
                      {gsSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                      Simpan ID
                    </Button>
                    <Button variant="outline" onClick={handleLoadGsSheets} disabled={gsLoadingSheets || !gsForm.spreadsheetId} className="gap-1.5 h-9 text-xs shrink-0">
                      {gsLoadingSheets ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sheet className="w-3.5 h-3.5" />}
                      Cek Sheet
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground">Pola otomatis: <span className="font-mono">TREG3_SALES_FUNNEL_YYYYMMDD</span> · <span className="font-mono">TREG3_ACTIVITY_YYYYMMDD</span> · <span className="font-mono">PERFORMANSI_YYYYMMDD</span></p>
                </div>

                {/* Sheet list */}
                {gsSheets.length > 0 && (() => {
                  const detected = gsSheets.filter((s: any) => s.detectedType);
                  const selectedCount = gsSheets.filter((s: any) => gsSelected[s.title]).length;
                  return (
                    <div className="border border-border rounded-xl overflow-hidden">
                      <div className="px-4 py-2 bg-secondary/40 border-b border-border flex items-center gap-2">
                        <Sheet className="w-3.5 h-3.5 text-primary" />
                        <p className="text-xs font-bold text-foreground">
                          {gsSheets.length} sheet
                          {detected.length > 0 && <span className="ml-1 font-normal text-emerald-700">({detected.length} auto-detect)</span>}
                        </p>
                        <div className="ml-auto flex items-center gap-2">
                          <button onClick={() => { const a: Record<string, boolean> = {}; gsSheets.forEach((s: any) => { a[s.title] = true; }); setGsSelected(a); }} className="text-[11px] text-primary font-semibold hover:underline">Pilih Semua</button>
                          <span className="text-muted-foreground text-[11px]">·</span>
                          <button onClick={() => setGsSelected({})} className="text-[11px] text-muted-foreground font-semibold hover:underline">Batal</button>
                        </div>
                      </div>
                      <div className="divide-y divide-border max-h-52 overflow-y-auto">
                        {gsSheets.map((s: any) => {
                          const match = s.title.match(/(\d{8})$/);
                          const dateStr = match ? `${match[1].slice(0,4)}-${match[1].slice(4,6)}-${match[1].slice(6,8)}` : null;
                          const currentType = gsTypeOverride[s.title] || s.detectedType || "";
                          const isChecked = !!gsSelected[s.title];
                          return (
                            <div key={s.sheetId} className={cn("px-3 py-2 flex items-center gap-2.5 text-sm transition-colors", isChecked ? "bg-primary/5" : "hover:bg-secondary/20")}>
                              <input type="checkbox" checked={isChecked} onChange={e => setGsSelected(p => ({ ...p, [s.title]: e.target.checked }))} className="w-3.5 h-3.5 accent-primary shrink-0 cursor-pointer" />
                              <Sheet className="w-3 h-3 text-muted-foreground shrink-0" />
                              <span className="font-mono text-[11px] text-foreground flex-1 truncate" title={s.title}>{s.title}</span>
                              {dateStr && <span className="text-[10px] text-muted-foreground bg-secondary/60 px-1.5 py-0.5 rounded-full shrink-0">{dateStr}</span>}
                              <select value={currentType} onChange={e => setGsTypeOverride(p => ({ ...p, [s.title]: e.target.value as any }))}
                                className={cn("h-6 px-1.5 text-[10px] font-semibold rounded border focus:outline-none shrink-0",
                                  currentType === "funnel" ? "bg-blue-50 border-blue-200 text-blue-700"
                                    : currentType === "activity" ? "bg-purple-50 border-purple-200 text-purple-700"
                                    : currentType === "performance" ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                                    : "bg-secondary border-border text-muted-foreground")}>
                                <option value="">-- Tipe --</option>
                                <option value="funnel">Sales Funnel</option>
                                <option value="activity">Sales Activity</option>
                                <option value="performance">Performa AM</option>
                              </select>
                            </div>
                          );
                        })}
                      </div>
                      <div className="px-4 py-2.5 bg-secondary/20 border-t border-border flex items-center justify-between gap-3">
                        <p className="text-[11px] text-muted-foreground">
                          {selectedCount > 0 ? <><strong className="text-foreground">{selectedCount} sheet</strong> dipilih</> : "Centang sheet yang ingin diimport"}
                        </p>
                        <Button onClick={handleSyncSelected} disabled={gsSyncingSelected || selectedCount === 0} size="sm" className="gap-2 h-8 text-xs">
                          {gsSyncingSelected ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                          Import Pilihan ({selectedCount})
                        </Button>
                      </div>
                    </div>
                  );
                })()}

                {/* Quick sync + result */}
                <div className="flex items-center gap-3">
                  <Button onClick={handleGsSync} disabled={gsSyncing || !gsStatus?.configured} variant="outline" size="sm" className="gap-2 h-8 text-xs">
                    {gsSyncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                    Sync Semua (skip duplikat)
                  </Button>
                  {!gsStatus?.configured && <p className="text-xs text-amber-600 font-medium">Simpan Spreadsheet ID dulu</p>}
                </div>

                {(gsSyncResult || gsStatus?.lastSyncResult) && (() => {
                  const result = gsSyncResult || gsStatus?.lastSyncResult;
                  return (
                    <div className="border border-border rounded-xl overflow-hidden">
                      <div className="px-4 py-2 bg-secondary/30 border-b border-border flex items-center gap-2 text-xs">
                        <History className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="font-bold text-foreground">Hasil Sync Terakhir</span>
                        {result.syncedAt && <span className="ml-auto text-muted-foreground">{format(new Date(result.syncedAt), "d MMM, HH:mm", { locale: id })}</span>}
                      </div>
                      <div className="divide-y divide-border/50 max-h-48 overflow-y-auto">
                        {(result.results || []).map((r: any, i: number) => (
                          <div key={i} className="px-4 py-2 flex items-center gap-3">
                            {r.status === "imported" && <CircleCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                            {r.status === "skipped" && <SkipForward className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                            {r.status === "error" && <CircleX className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                            <p className="font-mono text-[11px] text-foreground flex-1 truncate">{r.sheetName}</p>
                            <p className="text-[10px] text-muted-foreground truncate max-w-[200px]">{r.message}</p>
                            {r.rowsImported && <span className="text-[10px] font-bold text-emerald-600 shrink-0">{r.rowsImported}b</span>}
                          </div>
                        ))}
                      </div>
                      <div className="px-4 py-1.5 bg-secondary/20 border-t border-border flex items-center gap-4 text-[11px]">
                        <span className="text-emerald-600 font-bold">{(result.results || []).filter((r: any) => r.status === "imported").length} import</span>
                        <span className="text-amber-600 font-bold">{(result.results || []).filter((r: any) => r.status === "skipped").length} skip</span>
                        <span className="text-red-600 font-bold">{(result.results || []).filter((r: any) => r.status === "error").length} error</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* ── Path B: Google Drive Folder ─────────────────────────────────── */}
          {gsForm._mode === "drive" && (
            <div className="space-y-3">

              {/* Folder config + scheduler (side-by-side on desktop) */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">

                {/* Folder URL inputs */}
                <div className="lg:col-span-2 bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                  <div className="px-5 py-3.5 border-b border-border flex items-center gap-3">
                    <FolderOpen className="w-4 h-4 text-amber-500" />
                    <h2 className="font-display font-bold text-sm text-foreground">URL Folder Google Drive</h2>
                    <p className="text-[11px] text-muted-foreground ml-1">Atur akses folder: "Anyone with the link can view"</p>
                  </div>
                  <div className="p-5 space-y-3">
                    {([
                      { key: "folderPerformance", label: "Performa AM", placeholder: "https://drive.google.com/drive/folders/1qt32...", color: "text-emerald-600", configured: !!appSettings?.gDriveFolderPerformance },
                      { key: "folderFunnel",      label: "Sales Funnel",  placeholder: "https://drive.google.com/drive/folders/1BX1u...", color: "text-blue-600",   configured: !!appSettings?.gDriveFolderFunnel },
                      { key: "folderActivity",    label: "Sales Activity",placeholder: "https://drive.google.com/drive/folders/1sFgs...", color: "text-purple-600", configured: !!appSettings?.gDriveFolderActivity },
                      { key: "folderTarget",      label: "Target HO",     placeholder: "https://drive.google.com/drive/folders/1O082...", color: "text-red-600",    configured: !!appSettings?.gDriveFolderTarget },
                    ] as { key: keyof typeof driveForm; label: string; placeholder: string; color: string; configured: boolean }[]).map(({ key, label, placeholder, color, configured }) => (
                      <div key={key} className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 w-28 shrink-0">
                          <label className={cn("text-[11px] font-bold uppercase tracking-wide", color)}>{label}</label>
                          {configured && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                        </div>
                        <input
                          type="text"
                          value={driveForm[key]}
                          onChange={e => setDriveForm(p => ({ ...p, [key]: e.target.value }))}
                          placeholder={placeholder}
                          className="flex-1 h-8 px-3 bg-background border border-border rounded-lg text-[11px] font-mono focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                      </div>
                    ))}
                    <div className="flex items-center gap-2 pt-1">
                      <Button onClick={handleSaveDriveFolders} disabled={driveSaving} size="sm" className="gap-1.5 h-8 text-xs bg-amber-600 hover:bg-amber-700 text-white">
                        {driveSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        Simpan URL Folder
                      </Button>
                      <Button onClick={handleCheckNow} disabled={checkNowLoading || !appSettings?.gSheetsApiKey} size="sm" variant="outline" className="gap-1.5 h-8 text-xs">
                        {checkNowLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 text-amber-600" />}
                        Cek Semua Sekarang
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Drive Scheduler */}
                <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                  <div className="px-5 py-3.5 border-b border-border flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <h2 className="font-display font-bold text-sm text-foreground">Jadwal Otomatis</h2>
                    {driveSchedulerForm.enabled && (
                      <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">Aktif</span>
                    )}
                  </div>
                  <div className="p-5 space-y-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn("w-9 h-5 rounded-full transition-colors relative cursor-pointer shrink-0", driveSchedulerForm.enabled ? "bg-amber-500" : "bg-gray-200")}
                        onClick={() => setDriveSchedulerForm(p => ({ ...p, enabled: !p.enabled }))}
                      >
                        <div className={cn("absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all", driveSchedulerForm.enabled ? "left-4" : "left-0.5")} />
                      </div>
                      <span className="text-sm font-semibold text-foreground">{driveSchedulerForm.enabled ? "Aktif" : "Nonaktif"}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Jam WIB</label>
                        <select
                          value={driveSchedulerForm.hourWib}
                          onChange={e => setDriveSchedulerForm(p => ({ ...p, hourWib: Number(e.target.value) }))}
                          disabled={!driveSchedulerForm.enabled}
                          className="w-full h-8 px-2 bg-background border border-border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-40"
                        >
                          {Array.from({ length: 24 }, (_, i) => (
                            <option key={i} value={i}>{String(i).padStart(2, "0")}:00</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Interval</label>
                        <select
                          value={driveSchedulerForm.intervalDays}
                          onChange={e => setDriveSchedulerForm(p => ({ ...p, intervalDays: Number(e.target.value) }))}
                          disabled={!driveSchedulerForm.enabled}
                          className="w-full h-8 px-2 bg-background border border-border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-40"
                        >
                          <option value={1}>Harian</option>
                          <option value={2}>2 hari</option>
                          <option value={3}>3 hari</option>
                          <option value={7}>Mingguan</option>
                        </select>
                      </div>
                    </div>
                    {appSettings?.gDriveLastCheckAt && (
                      <p className="text-[10px] text-muted-foreground">
                        Cek terakhir: <strong className="text-foreground">{format(new Date(appSettings.gDriveLastCheckAt), "d MMM, HH:mm", { locale: id })}</strong>
                      </p>
                    )}
                    <Button onClick={handleSaveDriveScheduler} disabled={driveSchedulerSaving} size="sm" className="w-full gap-1.5 h-8 text-xs">
                      {driveSchedulerSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                      Simpan Jadwal
                    </Button>

                    {/* GSheets scheduler (small section) */}
                    <div className="pt-2 border-t border-border space-y-2">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                        <Sheet className="w-3 h-3 text-emerald-600" /> Jadwal Google Sheets
                      </p>
                      <div className="flex items-center gap-2">
                        <div
                          className={cn("w-8 h-4 rounded-full transition-colors relative cursor-pointer shrink-0", gsForm.syncEnabled ? "bg-emerald-500" : "bg-gray-200")}
                          onClick={() => setGsForm(p => ({ ...p, syncEnabled: !p.syncEnabled }))}
                        >
                          <div className={cn("absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all", gsForm.syncEnabled ? "left-4" : "left-0.5")} />
                        </div>
                        <span className="text-[11px] font-semibold">{gsForm.syncEnabled ? `Jam ${String(gsForm.syncHourWib).padStart(2,"0")}:00 setiap ${gsForm.syncIntervalDays}h` : "Nonaktif"}</span>
                      </div>
                      {gsForm.syncEnabled && (
                        <div className="flex gap-1.5">
                          <select value={gsForm.syncHourWib} onChange={e => setGsForm(p => ({ ...p, syncHourWib: Number(e.target.value) }))}
                            className="flex-1 h-7 px-2 bg-background border border-border rounded-lg text-[11px] focus:outline-none">
                            {Array.from({ length: 24 }, (_, i) => <option key={i} value={i}>{String(i).padStart(2,"0")}:00</option>)}
                          </select>
                          <select value={gsForm.syncIntervalDays} onChange={e => setGsForm(p => ({ ...p, syncIntervalDays: Number(e.target.value) }))}
                            className="flex-1 h-7 px-2 bg-background border border-border rounded-lg text-[11px] focus:outline-none">
                            <option value={1}>Harian</option>
                            <option value={2}>2 hari</option>
                            <option value={3}>3 hari</option>
                            <option value={7}>Mingguan</option>
                          </select>
                        </div>
                      )}
                      {gsForm.syncEnabled && (
                        <Button onClick={handleSaveGsSettings} disabled={gsSaving} size="sm" variant="outline" className="w-full h-7 text-[11px] gap-1">
                          {gsSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                          Simpan
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Drive Read History Logs */}
              <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                <button
                  onClick={() => setDriveLogsOpen(p => !p)}
                  className="w-full px-5 py-3.5 flex items-center gap-3 hover:bg-secondary/20 transition-colors text-left border-b border-border"
                >
                  <Terminal className="w-4 h-4 text-muted-foreground" />
                  <h2 className="font-display font-bold text-sm text-foreground flex-1">Riwayat Baca Folder Google Drive</h2>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={e => { e.stopPropagation(); refetchDriveLogs(); }}
                    className="h-7 px-2 text-[11px] gap-1 text-muted-foreground hover:text-foreground"
                  >
                    <RefreshCw className="w-3 h-3" /> Refresh
                  </Button>
                  {driveLogsOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
                </button>
                {driveLogsOpen && (() => {
                  const logs = driveLogsData?.logs || [];
                  const conditionConfig: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
                    imported:       { label: "Imported",      cls: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: <CircleCheck className="w-3 h-3" /> },
                    date_same:      { label: "Skip (sama)",   cls: "bg-amber-100 text-amber-700 border-amber-200",   icon: <SkipForward className="w-3 h-3" /> },
                    no_files:       { label: "Kosong",        cls: "bg-gray-100 text-gray-600 border-gray-200",       icon: <FolderOpen className="w-3 h-3" /> },
                    format_invalid: { label: "Format Salah",  cls: "bg-orange-100 text-orange-700 border-orange-200", icon: <AlertCircle className="w-3 h-3" /> },
                    api_error:      { label: "API Error",     cls: "bg-red-100 text-red-700 border-red-200",         icon: <CircleX className="w-3 h-3" /> },
                    import_error:   { label: "Import Error",  cls: "bg-red-100 text-red-700 border-red-200",         icon: <CircleX className="w-3 h-3" /> },
                    api_key_missing:{ label: "No API Key",    cls: "bg-red-100 text-red-700 border-red-200",         icon: <AlertCircle className="w-3 h-3" /> },
                    folder_missing: { label: "No Folder",     cls: "bg-gray-100 text-gray-600 border-gray-200",       icon: <AlertCircle className="w-3 h-3" /> },
                    folder_invalid: { label: "URL Error",     cls: "bg-orange-100 text-orange-700 border-orange-200", icon: <AlertCircle className="w-3 h-3" /> },
                  };
                  const typeLabels: Record<string, { label: string; cls: string }> = {
                    performance: { label: "Performa AM",   cls: "bg-emerald-100 text-emerald-700" },
                    funnel:      { label: "Sales Funnel",  cls: "bg-blue-100 text-blue-700" },
                    activity:    { label: "Sales Activity",cls: "bg-purple-100 text-purple-700" },
                    target:      { label: "Target HO",     cls: "bg-red-100 text-red-700" },
                  };
                  return (
                    <div>
                      {logs.length === 0 ? (
                        <div className="px-5 py-10 text-center text-sm text-muted-foreground">
                          <Terminal className="w-8 h-8 mx-auto mb-3 opacity-20" />
                          <p>Belum ada riwayat baca folder</p>
                          <p className="text-xs mt-1">Klik "Cek Semua Sekarang" untuk mulai, atau tunggu jadwal otomatis</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left">
                            <thead>
                              <tr className="bg-secondary/30 border-b border-border text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
                                <th className="px-4 py-2">Waktu</th>
                                <th className="px-3 py-2">Tipe</th>
                                <th className="px-3 py-2">Kondisi</th>
                                <th className="px-3 py-2">File Terbaru</th>
                                <th className="px-3 py-2">Tanggal File</th>
                                <th className="px-3 py-2">Snapshot DB</th>
                                <th className="px-3 py-2 text-right">Baris</th>
                                <th className="px-3 py-2">Pemicu</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50">
                              {logs.map((log: any) => {
                                const cond = conditionConfig[log.condition] || { label: log.condition, cls: "bg-gray-100 text-gray-600 border-gray-200", icon: null };
                                const typeInfo = typeLabels[log.type] || { label: log.type, cls: "bg-gray-100 text-gray-600" };
                                return (
                                  <tr key={log.id} className={cn("hover:bg-secondary/20 transition-colors", log.condition === "imported" ? "bg-emerald-50/40" : log.condition === "date_same" ? "bg-amber-50/20" : "")}>
                                    <td className="px-4 py-2.5">
                                      <p className="text-[11px] font-semibold text-foreground">{format(new Date(log.checkedAt), "d MMM", { locale: id })}</p>
                                      <p className="text-[10px] text-muted-foreground">{format(new Date(log.checkedAt), "HH:mm:ss", { locale: id })}</p>
                                    </td>
                                    <td className="px-3 py-2.5">
                                      <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded", typeInfo.cls)}>{typeInfo.label}</span>
                                    </td>
                                    <td className="px-3 py-2.5">
                                      <span className={cn("inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded border", cond.cls)}>
                                        {cond.icon}{cond.label}
                                      </span>
                                    </td>
                                    <td className="px-3 py-2.5 max-w-[180px]">
                                      <p className="text-[10px] font-mono text-foreground truncate" title={log.latestFileName || ""}>{log.latestFileName || <span className="text-muted-foreground">—</span>}</p>
                                    </td>
                                    <td className="px-3 py-2.5">
                                      {log.latestFileDateExtracted
                                        ? <span className="text-[11px] font-semibold text-foreground font-mono">{log.latestFileDateExtracted}</span>
                                        : <span className="text-muted-foreground text-[10px]">—</span>}
                                    </td>
                                    <td className="px-3 py-2.5">
                                      {log.existingSnapshotDate
                                        ? <span className="text-[11px] font-mono text-muted-foreground">{log.existingSnapshotDate}</span>
                                        : <span className="text-muted-foreground text-[10px]">—</span>}
                                    </td>
                                    <td className="px-3 py-2.5 text-right">
                                      {log.rowsImported != null
                                        ? <span className="text-[11px] font-bold text-emerald-700 tabular-nums">{log.rowsImported.toLocaleString("id-ID")}</span>
                                        : <span className="text-muted-foreground text-[10px]">—</span>}
                                    </td>
                                    <td className="px-3 py-2.5">
                                      <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded",
                                        log.triggeredBy === "auto" ? "bg-blue-100 text-blue-700" : "bg-secondary text-muted-foreground")}>
                                        {log.triggeredBy === "auto" ? "Otomatis" : "Manual"}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                          <div className="px-5 py-2 border-t border-border bg-secondary/20 flex items-center gap-4 text-[10px] text-muted-foreground">
                            <span>{logs.length} entri log terakhir</span>
                            <span className="ml-auto text-emerald-600 font-semibold">{logs.filter((l: any) => l.condition === "imported").length} import</span>
                            <span className="text-amber-600 font-semibold">{logs.filter((l: any) => l.condition === "date_same").length} skip</span>
                            <span className="text-red-600 font-semibold">{logs.filter((l: any) => ["api_error","import_error"].includes(l.condition)).length} error</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Data Cleaning Proof — hidden, data still fetched for internal use */}
      {false && activeTab === "funnel" && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          <button
            className="w-full px-6 py-4 border-b border-border flex items-center gap-3 hover:bg-secondary/20 transition-colors text-left"
            onClick={() => setDqExpanded(p => !p)}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <h2 className="font-display font-bold text-sm text-foreground flex-1">Laporan Pembersihan Data (Data Quality Proof)</h2>
            {dqExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </button>
          {dqExpanded && (
            <div className="p-6 space-y-5">
              {/* Stats row */}
              {dqData && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: "Total LOP Valid", value: dqData.totalLop?.toLocaleString("id-ID"), color: "text-foreground" },
                    { label: "LOP DPS", value: dqData.dpLop?.toLocaleString("id-ID"), color: "text-blue-700" },
                    { label: "LOP DSS", value: dqData.dssLop?.toLocaleString("id-ID"), color: "text-violet-700" },
                    { label: "AM Aktif", value: dqData.activeAm, color: "text-emerald-700" },
                    { label: "Unik AM (NIK)", value: dqData.uniqueAmNik, color: "text-foreground" },
                    { label: "LOP Havea (ex-Reni)", value: dqData.haveaLop?.toLocaleString("id-ID"), color: "text-amber-700" },
                    { label: "AM Nama Kosong", value: dqData.nullAmRows, color: dqData?.nullAmRows > 0 ? "text-red-700" : "text-emerald-700" },
                    { label: "Nama Numerik (NIK)", value: dqData.numericAmName, color: dqData?.numericAmName > 0 ? "text-red-700" : "text-emerald-700" },
                  ].map(s => (
                    <div key={s.label} className="bg-secondary/30 border border-border rounded-xl p-3">
                      <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-1">{s.label}</div>
                      <div className={cn("text-2xl font-black font-mono", s.color)}>{s.value ?? "—"}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Cleaning steps table */}
              <div className="border border-border rounded-xl overflow-hidden">
                <div className="px-4 py-2.5 bg-emerald-700 text-white">
                  <h4 className="text-xs font-black uppercase tracking-wide">Langkah Pembersihan yang Diterapkan</h4>
                </div>
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="bg-secondary/40 text-xs font-bold text-foreground uppercase tracking-wide">
                      <th className="px-4 py-2">#</th>
                      <th className="px-4 py-2">Langkah</th>
                      <th className="px-4 py-2">Rule / Aturan</th>
                      <th className="px-4 py-2 text-right">Data Terdampak</th>
                      <th className="px-4 py-2 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {(dqData?.cleaningSteps || []).map((s: any, i: number) => (
                      <tr key={i} className={i % 2 === 0 ? "bg-background" : "bg-secondary/20"}>
                        <td className="px-4 py-2.5 text-xs font-mono text-muted-foreground">{i + 1}</td>
                        <td className="px-4 py-2.5 font-bold text-foreground text-sm">{s.step}</td>
                        <td className="px-4 py-2.5 text-xs font-mono text-foreground">{s.rule}</td>
                        <td className="px-4 py-2.5 text-right text-sm font-bold font-mono">
                          {s.affected !== undefined ? s.affected.toLocaleString("id-ID") + " baris" : <span className="text-muted-foreground">semua data</span>}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          {s.status === "applied" && (
                            <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                              <CheckCircle2 className="w-3 h-3" /> Diterapkan
                            </span>
                          )}
                          {s.status === "applied_on_new_import" && (
                            <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                              <CheckCircle2 className="w-3 h-3" /> Import Baru
                            </span>
                          )}
                          {s.status === "applied_at_query" && (
                            <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                              <CheckCircle2 className="w-3 h-3" /> Saat Query
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 mr-1">Diterapkan</span> = berlaku untuk semua data (termasuk data lama).{" "}
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 mr-1">Import Baru</span> = berlaku saat import file berikutnya.{" "}
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 mr-1">Saat Query</span> = filter diterapkan tiap kali dashboard memuat data.{" "}
                AM Aktif = {dqData?.activeAm ?? 13} dari account_managers (aktif = true).
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
