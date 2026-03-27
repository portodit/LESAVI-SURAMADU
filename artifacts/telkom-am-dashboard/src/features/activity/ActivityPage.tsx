import React, { useState, useMemo, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/shared/lib/utils";
import { Search, ChevronDown, Target, Users, TrendingUp, AlertTriangle, CheckCircle2, ChevronRight, Expand, Minimize2 } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MasterAm { nik: string; nama: string; divisi: string; }

interface ActivityItem {
  id: number;
  activityEndDate: string | null;
  activityType: string | null;
  label: string | null;
  caName: string | null;
  picName: string | null;
  activityNotes: string | null;
  isKpi: boolean;
}

interface AmActivity {
  nik: string;
  fullname: string;
  divisi: string;
  kpiCount: number;
  totalCount: number;
  kpiTarget: number;
  activities: ActivityItem[];
}

interface ActivityData {
  totalKpiActivities: number;
  masterAms: MasterAm[];
  byAm: AmActivity[];
  distinctLabels: string[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MONTHS_FULL = ["","Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
const MONTHS_SHORT = ["","Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agt","Sep","Okt","Nov","Des"];
const DAYS_ID = ["Min","Sen","Sel","Rab","Kam","Jum","Sab"];
const MONTH_NUMS = ["01","02","03","04","05","06","07","08","09","10","11","12"];

const ACTIVITY_TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  "Kunjungan":    { bg: "#e3f2fd", text: "#1565C0" },
  "Administrasi": { bg: "#f3e5f5", text: "#6a1b9a" },
  "Follow-up":    { bg: "#e8f5e9", text: "#2e7d32" },
  "Penawaran":    { bg: "#fff3e0", text: "#e65100" },
  "Koordinasi":   { bg: "#fce4ec", text: "#880e4f" },
  "Negosiasi":    { bg: "#e0f7fa", text: "#00695c" },
};

function getLabelStyle(label: string | null) {
  if (!label) return { cls: "bg-secondary text-muted-foreground", short: "—" };
  const l = label.toLowerCase();
  if (l.includes("tanpa")) return { cls: "bg-secondary text-muted-foreground", short: "Tanpa Pelanggan" };
  if (l.includes("proyek")) return { cls: "bg-teal-50 text-teal-700 dark:bg-teal-950/30 dark:text-teal-400", short: "Dg Proyek" };
  return { cls: "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400", short: "Dg Pelanggan" };
}

function getActivityTypeStyle(type: string | null) {
  if (!type) return { bg: "hsl(var(--secondary))", text: "hsl(var(--muted-foreground))" };
  return ACTIVITY_TYPE_COLORS[type] || { bg: "hsl(var(--secondary))", text: "hsl(var(--muted-foreground))" };
}

// ─── API ─────────────────────────────────────────────────────────────────────

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
async function apiFetch<T>(path: string): Promise<T> {
  const r = await fetch(`${BASE}${path}`, { credentials: "include" });
  if (!r.ok) throw new Error(`API ${r.status}`);
  return r.json();
}

// ─── SelectDropdown ───────────────────────────────────────────────────────────

function SelectDropdown({ label, value, onChange, options, className }: {
  label?: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[]; className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, minW: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (triggerRef.current && !triggerRef.current.contains(e.target as Node) &&
          dropRef.current && !dropRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const toggle = () => {
    if (triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 4, left: r.left, minW: r.width });
    }
    setOpen(o => !o);
  };

  const current = options.find(o => o.value === value);
  return (
    <div className={cn("flex flex-col gap-1", className)} ref={triggerRef}>
      {label && <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{label}</label>}
      <button
        type="button"
        onClick={toggle}
        className={cn(
          "h-9 px-3 bg-secondary/50 border border-border rounded-lg text-sm flex items-center gap-1.5 w-full transition-colors text-left",
          open && "border-primary/50 ring-2 ring-primary/20"
        )}
      >
        <span className="flex-1 truncate font-medium text-foreground">{current?.label ?? value}</span>
        <ChevronDown className={cn("w-3.5 h-3.5 text-muted-foreground shrink-0 transition-transform", open && "rotate-180")} />
      </button>
      {open && createPortal(
        <div ref={dropRef} style={{ position: "fixed", top: pos.top, left: pos.left, minWidth: pos.minW, zIndex: 9999 }}
          className="bg-card border border-border rounded-xl shadow-xl max-h-64 overflow-y-auto py-1">
          {options.map(opt => (
            <button key={opt.value} onClick={() => { onChange(opt.value); setOpen(false); }}
              className={cn("w-full text-left px-3 py-2 text-sm hover:bg-secondary transition-colors flex items-center gap-2",
                opt.value === value ? "font-semibold text-primary bg-primary/5" : "text-foreground")}>
              {opt.value === value && <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
              {opt.value !== value && <span className="w-1.5 shrink-0" />}
              {opt.label}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}

// ─── PeriodeDropdown ── year select + month checkboxes combined ────────────────

function PeriodeDropdown({ year, month, onYearChange, onMonthChange, className }: {
  year: string; month: string;
  onYearChange: (y: string) => void; onMonthChange: (m: string) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  const years = ["2026", "2025", "2024"];

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (triggerRef.current && !triggerRef.current.contains(e.target as Node) &&
          dropRef.current && !dropRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const toggle = () => {
    if (triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 4, left: r.left });
    }
    setOpen(o => !o);
  };

  const displayText = month === "all"
    ? `Semua Bulan ${year}`
    : `${MONTHS_SHORT[parseInt(month)]} ${year}`;

  return (
    <div className={cn("flex flex-col gap-1", className)} ref={triggerRef}>
      <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Periode</label>
      <button
        type="button" onClick={toggle}
        className={cn(
          "h-9 px-3 bg-secondary/50 border border-border rounded-lg text-sm flex items-center gap-1.5 w-full transition-colors text-left min-w-[170px]",
          open && "border-primary/50 ring-2 ring-primary/20"
        )}
      >
        <span className="flex-1 truncate font-medium text-foreground">{displayText}</span>
        <ChevronDown className={cn("w-3.5 h-3.5 text-muted-foreground shrink-0 transition-transform", open && "rotate-180")} />
      </button>
      {open && createPortal(
        <div ref={dropRef} style={{ position: "fixed", top: pos.top, left: pos.left, zIndex: 9999 }}
          className="bg-card border border-border rounded-xl shadow-xl w-[240px] overflow-hidden">

          {/* Year row */}
          <div className="flex items-center gap-1.5 px-3 py-2 border-b border-border bg-secondary/30">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide flex-1">TAHUN</span>
            <div className="flex gap-1">
              {years.map(y => (
                <button key={y} onClick={() => onYearChange(y)}
                  className={cn(
                    "px-2 py-0.5 rounded text-xs font-bold transition-colors",
                    year === y ? "bg-primary text-white" : "bg-secondary text-muted-foreground hover:text-foreground"
                  )}>{y}</button>
              ))}
            </div>
          </div>

          {/* Month checkboxes */}
          <div className="px-3 pt-2 pb-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">BULAN</span>
              <button onClick={() => { onMonthChange("all"); setOpen(false); }}
                className="text-[10px] text-primary font-semibold hover:underline">Semua</button>
            </div>
            <div className="grid grid-cols-3 gap-1 pb-2">
              {MONTHS_SHORT.slice(1).map((m, i) => {
                const val = String(i + 1);
                const isSelected = month === val;
                return (
                  <button key={val}
                    onClick={() => { onMonthChange(val); setOpen(false); }}
                    className={cn(
                      "py-1 px-1.5 rounded-lg text-xs font-semibold transition-colors text-center",
                      isSelected ? "bg-primary text-white" : "hover:bg-secondary text-foreground"
                    )}
                  >{m}</button>
                );
              })}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

// ─── CheckboxDropdown ─────────────────────────────────────────────────────────

function CheckboxDropdown({ label, options, selected, onChange, placeholder, labelFn, summaryLabel, className, kpiBadge }: {
  label: string; options: string[]; selected: Set<string>; onChange: (next: Set<string>) => void;
  placeholder?: string; labelFn?: (v: string) => string; summaryLabel?: string; className?: string; kpiBadge?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const getLabel = (v: string) => labelFn ? labelFn(v) : v;

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (triggerRef.current && !triggerRef.current.contains(e.target as Node) &&
          dropRef.current && !dropRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const toggle = () => {
    if (triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 4, left: r.left });
    }
    setOpen(o => !o);
  };

  const toggleItem = (item: string) => {
    const next = new Set(selected);
    if (next.has(item)) next.delete(item); else next.add(item);
    onChange(next);
  };

  const filtered = options.filter(o => !search || getLabel(o).toLowerCase().includes(search.toLowerCase()));
  const unit = summaryLabel ?? "item";
  const displayText = selected.size === 0 ? (placeholder ?? "Semua")
    : selected.size === options.length ? `Semua ${unit}`
    : selected.size === 1 ? getLabel([...selected][0])
    : `${selected.size} ${unit} dipilih`;

  return (
    <div className={cn("flex flex-col gap-1", className)} ref={triggerRef}>
      <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{label}</label>
      <button
        type="button" onClick={toggle}
        disabled={options.length === 0}
        className={cn(
          "h-9 px-3 bg-secondary/50 border border-border rounded-lg text-sm flex items-center gap-1.5 w-full disabled:opacity-40 transition-colors text-left",
          open && "border-primary/50 ring-2 ring-primary/20"
        )}
      >
        <span className="flex-1 truncate font-medium text-foreground">{displayText}</span>
        {selected.size > 0 && selected.size < options.length && (
          <span className="bg-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none shrink-0">{selected.size}</span>
        )}
        <ChevronDown className={cn("w-3.5 h-3.5 text-muted-foreground shrink-0 transition-transform", open && "rotate-180")} />
      </button>
      {open && createPortal(
        <div ref={dropRef} style={{ position: "fixed", top: pos.top, left: pos.left, zIndex: 9999 }}
          className="bg-card border border-border rounded-xl shadow-xl min-w-[220px] max-w-[280px] overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-secondary/30">
            <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{label}</span>
            <div className="flex gap-1.5">
              <button onClick={() => onChange(new Set(options))} className="text-[11px] text-primary font-semibold hover:underline">Semua</button>
              <span className="text-muted-foreground text-[11px]">·</span>
              <button onClick={() => onChange(new Set())} className="text-[11px] text-muted-foreground font-semibold hover:text-foreground hover:underline">Kosongkan</button>
            </div>
          </div>
          {options.length > 6 && (
            <div className="p-2 border-b border-border">
              <input autoFocus value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Cari..." className="w-full border border-border rounded-md px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-primary/50 bg-background" />
            </div>
          )}
          <div className="max-h-56 overflow-y-auto py-1">
            {filtered.map(opt => (
              <button key={opt} onClick={() => toggleItem(opt)}
                className={cn("w-full text-left px-3 py-2 text-sm hover:bg-secondary flex items-center gap-2 transition-colors",
                  selected.has(opt) ? "font-semibold text-primary bg-primary/5" : "text-foreground")}>
                <span className={cn("w-3.5 h-3.5 rounded border shrink-0 flex items-center justify-center",
                  selected.has(opt) ? "bg-primary border-primary" : "border-border")}>
                  {selected.has(opt) && <span className="text-white text-[8px] font-black">✓</span>}
                </span>
                <span className="flex-1">{getLabel(opt)}</span>
                {kpiBadge && !getLabel(opt).toLowerCase().includes("tanpa") && (
                  <span className="bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400 text-[9px] font-bold px-1 py-px rounded shrink-0">KPI</span>
                )}
              </button>
            ))}
          </div>
          {kpiBadge && (
            <div className="px-3 py-2 border-t border-border bg-secondary/30 text-[10px] text-muted-foreground">
              <span className="inline bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400 text-[9px] font-bold px-1 rounded mr-1">KPI</span>
              = dihitung untuk capaian KPI aktivitas bulanan
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}

// ─── Overview Card ────────────────────────────────────────────────────────────

function OverviewCard({ icon, label, value, sub, accent }: {
  icon: React.ReactNode; label: string; value: number | string; sub: React.ReactNode; accent: string;
}) {
  return (
    <div className="bg-secondary/50 border border-border rounded-xl p-4 flex items-start gap-4 overflow-hidden relative">
      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", accent)}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1">{label}</div>
        <div className="text-3xl font-black tabular-nums leading-tight tracking-tight text-foreground">{value}</div>
        <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>
      </div>
    </div>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ pct }: { pct: number }) {
  if (pct >= 100) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
      <CheckCircle2 className="w-3 h-3" /> Tercapai
    </span>
  );
  if (pct >= 70) return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
      Mendekati
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-600 dark:bg-red-950/30 dark:text-red-400">
      Di Bawah KPI
    </span>
  );
}

// ─── Format date helpers ──────────────────────────────────────────────────────

function fmtDate(d: string | null): { short: string; day: string } {
  if (!d) return { short: "—", day: "" };
  try {
    const dt = new Date(d);
    const dd = String(dt.getDate()).padStart(2, "0");
    const mm = String(dt.getMonth() + 1).padStart(2, "0");
    const day = DAYS_ID[dt.getDay()];
    const mon = MONTHS_SHORT[dt.getMonth() + 1];
    return { short: `${dd}/${mm}`, day: `${day}, ${mon} ${dt.getFullYear()}` };
  } catch { return { short: d.slice(5, 10).replace("-", "/"), day: "" }; }
}

// ─── AmRowControlled ──────────────────────────────────────────────────────────

function AmRowControlled({ am, kpiLabels, forceExpand }: {
  am: AmActivity; kpiLabels: Set<string>; forceExpand: boolean | null;
}) {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (forceExpand !== null) setExpanded(forceExpand);
  }, [forceExpand]);

  const kpiCount = useMemo(() =>
    am.activities.filter(a =>
      kpiLabels.size > 0 ? (a.label ? kpiLabels.has(a.label) : false) : a.isKpi
    ).length,
    [am.activities, kpiLabels]
  );

  const pct = am.activities.length === 0 ? 0 : Math.min(Math.round(kpiCount / am.kpiTarget * 100), 100);
  const sisa = Math.max(am.kpiTarget - kpiCount, 0);
  const hasActs = am.activities.length > 0;

  const progressColor = pct >= 100
    ? "from-emerald-500 to-emerald-400"
    : pct >= 70
    ? "from-amber-500 to-amber-400"
    : "from-red-600 to-red-500";

  const progressTextColor = pct >= 100 ? "text-emerald-600 dark:text-emerald-400"
    : pct >= 70 ? "text-amber-600 dark:text-amber-400"
    : "text-red-600 dark:text-red-400";

  return (
    <div className="border-b border-border/50 last:border-b-0">
      {/* Summary row — always clickable */}
      <div
        onClick={() => setExpanded(p => !p)}
        className={cn(
          "grid items-center px-4 py-3 cursor-pointer transition-colors group",
          expanded ? "bg-primary/5 border-b border-primary/10" : "hover:bg-secondary/40"
        )}
        style={{ gridTemplateColumns: "32px 1fr 220px 60px 60px 64px 110px" }}
      >
        {/* Expand icon */}
        <div className={cn(
          "w-6 h-6 rounded-lg border flex items-center justify-center text-xs font-bold shrink-0 transition-all",
          expanded
            ? "bg-primary border-primary text-white"
            : "bg-secondary border-border text-muted-foreground group-hover:border-primary/40 group-hover:text-primary/70"
        )}>
          {expanded ? "−" : "+"}
        </div>

        {/* Nama + divisi */}
        <div className="overflow-hidden pl-1">
          <div className="text-sm font-bold text-foreground truncate">{am.fullname}</div>
          <div className="text-[11px] text-muted-foreground mt-px">
            {am.divisi}
            {!hasActs && <span className="ml-1.5 text-[10px] italic text-muted-foreground/60">· tidak ada data</span>}
            {hasActs && <span className="ml-1.5 text-[10px] text-muted-foreground/60">· {am.activities.length} aktivitas</span>}
          </div>
        </div>

        {/* Progress bar */}
        <div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden mb-1">
            <div className={cn("h-full rounded-full bg-gradient-to-r transition-all duration-700", progressColor)}
              style={{ width: `${pct}%` }} />
          </div>
          <div className="flex justify-between items-center">
            <span className={cn("text-[12px] font-bold font-mono", progressTextColor)}>{pct}%</span>
            <span className="text-[10px] text-muted-foreground font-mono">{kpiCount}/{am.kpiTarget}</span>
          </div>
        </div>

        <div className="text-sm font-bold font-mono text-foreground text-center">{kpiCount}</div>
        <div className="text-sm font-bold font-mono text-muted-foreground text-center">{am.kpiTarget}</div>
        <div className={cn("text-sm font-bold font-mono text-center", sisa === 0 ? "text-muted-foreground/30" : "text-foreground")}>
          {sisa === 0 ? "✓" : sisa}
        </div>
        <div><StatusBadge pct={pct} /></div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-border/30 bg-secondary/20">
          {!hasActs ? (
            <div className="flex items-center gap-3 px-6 py-5 text-sm text-muted-foreground">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
              <span>AM ini tidak memiliki data aktivitas pada periode yang dipilih meski sudah dicari di data mentah.</span>
            </div>
          ) : (
            <>
              {/* Sub-header */}
              <div
                className="grid text-[10px] font-bold uppercase tracking-[0.6px] text-muted-foreground bg-secondary/50 border-b border-border/30"
                style={{ gridTemplateColumns: "28px 88px 1fr 150px 130px 72px", padding: "6px 16px 6px 56px" }}
              >
                <div>#</div><div>Tanggal</div><div>Pelanggan & Catatan</div>
                <div>Tipe Aktivitas</div><div>Kategori</div><div>KPI</div>
              </div>
              {am.activities.map((act, i) => {
                const { short, day } = fmtDate(act.activityEndDate);
                const typeSty = getActivityTypeStyle(act.activityType);
                const labSty = getLabelStyle(act.label);
                const isKpiRow = kpiLabels.size > 0
                  ? (act.label ? kpiLabels.has(act.label) : false)
                  : act.isKpi;
                return (
                  <div key={act.id}
                    className="grid items-start border-b border-border/20 last:border-b-0 hover:bg-secondary/30 transition-colors"
                    style={{ gridTemplateColumns: "28px 88px 1fr 150px 130px 72px", padding: "8px 16px 8px 56px" }}
                  >
                    <div className="text-[10px] text-muted-foreground font-mono pt-0.5">{i + 1}</div>
                    <div>
                      <div className="text-xs font-semibold text-foreground font-mono">{short}</div>
                      <div className="text-[10px] text-muted-foreground mt-px">{day}</div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-foreground">{act.caName || "–"}</div>
                      {act.activityNotes && (
                        <div className="text-[10px] text-muted-foreground mt-0.5 leading-snug line-clamp-2">{act.activityNotes}</div>
                      )}
                    </div>
                    <div>
                      <span className="inline-flex px-2 py-0.5 rounded text-[11px] font-semibold"
                        style={{ background: typeSty.bg, color: typeSty.text }}>
                        {act.activityType || "–"}
                      </span>
                    </div>
                    <div>
                      <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold", labSty.cls)}>
                        {labSty.short}
                      </span>
                    </div>
                    <div>
                      {isKpiRow
                        ? <span className="inline-flex text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded">✓ Ya</span>
                        : <span className="inline-flex text-[11px] font-bold text-muted-foreground/60 bg-secondary px-2 py-0.5 rounded">✗ Tidak</span>
                      }
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ActivityPage() {
  const now = new Date();
  const [year, setYear] = useState(String(now.getFullYear()));
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [divisi, setDivisi] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedAms, setSelectedAms] = useState<Set<string> | null>(null);
  const [selectedLabels, setSelectedLabels] = useState<Set<string> | null>(null);
  const [expandAll, setExpandAll] = useState<boolean | null>(null);

  const queryKey = useMemo(() => {
    const p = new URLSearchParams({ year, divisi });
    if (month !== "all") p.set("month", month);
    return `/api/activity?${p}`;
  }, [year, month, divisi]);

  const { data, isLoading, isError } = useQuery<ActivityData>({
    queryKey: [queryKey],
    queryFn: () => apiFetch<ActivityData>(queryKey),
    staleTime: 60_000,
  });

  const amOptions = useMemo(() =>
    (data?.masterAms ?? [])
      .filter(a => divisi === "all" || a.divisi === divisi)
      .map(a => a.nama)
      .sort((a, b) => a.localeCompare(b)),
    [data?.masterAms, divisi]
  );

  const labelOptions = useMemo(() =>
    (data?.distinctLabels ?? []),
    [data?.distinctLabels]
  );

  useEffect(() => {
    if (data && selectedAms === null) setSelectedAms(new Set(amOptions));
  }, [data, amOptions, selectedAms]);

  useEffect(() => {
    if (data && selectedLabels === null) {
      setSelectedLabels(new Set(
        (data.distinctLabels ?? []).filter(l => !l.toLowerCase().includes("tanpa"))
      ));
    }
  }, [data, selectedLabels]);

  const filteredAms = useMemo(() => {
    if (!data) return [];
    const byAmMap = Object.fromEntries(data.byAm.map(a => [a.fullname, a]));
    const masterFiltered = (data.masterAms ?? [])
      .filter(a => divisi === "all" || a.divisi === divisi)
      .filter(a => selectedAms === null || selectedAms.has(a.nama))
      .filter(a => !search || a.nama.toLowerCase().includes(search.toLowerCase()));

    return masterFiltered.map(ma => {
      const existing = byAmMap[ma.nama];
      if (existing) return existing;
      return { nik: ma.nik, fullname: ma.nama, divisi: ma.divisi, kpiCount: 0, totalCount: 0, kpiTarget: 20, activities: [] };
    });
  }, [data, divisi, selectedAms, search]);

  const kpiLabels = useMemo(() => selectedLabels ?? new Set<string>(), [selectedLabels]);

  const stats = useMemo(() => {
    const totalKpi = filteredAms.reduce((s, a) => {
      return s + a.activities.filter(act =>
        kpiLabels.size > 0 ? (act.label ? kpiLabels.has(act.label) : false) : act.isKpi
      ).length;
    }, 0);
    const reach = filteredAms.filter(a => {
      const cnt = a.activities.filter(act =>
        kpiLabels.size > 0 ? (act.label ? kpiLabels.has(act.label) : false) : act.isKpi
      ).length;
      return cnt >= a.kpiTarget;
    }).length;
    return { totalKpi, reach, below: filteredAms.length - reach };
  }, [filteredAms, kpiLabels]);

  const periodLabel = month === "all"
    ? `Tahun ${year}`
    : `${MONTHS_FULL[parseInt(month)]} ${year}`;

  const selectedAmSet = useMemo(
    () => selectedAms ?? new Set(amOptions),
    [selectedAms, amOptions]
  );
  const selectedLabelSet = useMemo(
    () => selectedLabels ?? new Set(labelOptions),
    [selectedLabels, labelOptions]
  );

  return (
    <div className="space-y-5">

      {/* ─── Filter Bar ─── */}
      <div className="bg-card border border-border rounded-xl shadow-sm p-4">
        <div className="flex items-end gap-3 flex-wrap">
          <PeriodeDropdown
            year={year} month={month}
            onYearChange={y => { setYear(y); setSelectedAms(null); }}
            onMonthChange={m => { setMonth(m); }}
            className="min-w-[170px]"
          />

          <SelectDropdown
            label="Divisi"
            value={divisi}
            onChange={v => { setDivisi(v); setSelectedAms(null); }}
            options={[
              { value: "all", label: "Semua Divisi" },
              { value: "DPS", label: "DPS" },
              { value: "DSS", label: "DSS" },
            ]}
            className="min-w-[140px]"
          />

          <CheckboxDropdown
            label="Nama AM"
            options={amOptions}
            selected={selectedAmSet}
            onChange={setSelectedAms}
            summaryLabel="AM"
            placeholder="Semua AM"
            className="min-w-[160px] flex-1"
          />

          {labelOptions.length > 0 && (
            <CheckboxDropdown
              label="Kategori Aktivitas"
              options={labelOptions}
              selected={selectedLabelSet}
              onChange={setSelectedLabels}
              summaryLabel="kategori"
              placeholder="Semua Kategori"
              kpiBadge
              className="min-w-[180px]"
            />
          )}

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide opacity-0 select-none">Cari</label>
            <div className="h-9 flex items-center gap-2 bg-secondary/50 border border-border rounded-lg px-3 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20 transition-colors min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <input
                type="text" placeholder="Cari nama AM…"
                value={search} onChange={e => setSearch(e.target.value)}
                className="border-none outline-none text-sm text-foreground placeholder:text-muted-foreground/60 bg-transparent flex-1 min-w-0"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ─── Overview Cards ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <OverviewCard
          icon={<Target className="w-5 h-5 text-primary" />}
          label="Total Aktivitas KPI"
          value={isLoading ? "—" : stats.totalKpi}
          sub={<>dari <strong className="text-foreground">{filteredAms.length}</strong> AM · {periodLabel}</>}
          accent="bg-primary/10"
        />
        <OverviewCard
          icon={<TrendingUp className="w-5 h-5 text-emerald-600" />}
          label="AM Capai KPI"
          value={isLoading ? "—" : stats.reach}
          sub={<>target <strong className="text-foreground">≥{filteredAms[0]?.kpiTarget ?? 20} aktivitas</strong> / bulan</>}
          accent="bg-emerald-100 dark:bg-emerald-950/30"
        />
        <OverviewCard
          icon={<AlertTriangle className="w-5 h-5 text-red-500" />}
          label="AM Di Bawah KPI"
          value={isLoading ? "—" : stats.below}
          sub={stats.below === 0 ? "Semua AM mencapai target 🎉" : `${stats.below} AM perlu perhatian lebih`}
          accent="bg-red-50 dark:bg-red-950/30"
        />
      </div>

      {/* ─── KPI Info note ─── */}
      {labelOptions.length > 0 && (
        <div className="flex items-start gap-2 text-xs text-muted-foreground bg-secondary/60 border border-border/60 rounded-xl px-4 py-3">
          <span className="mt-0.5">📌</span>
          <span>
            Progress KPI dihitung dari aktivitas kategori{" "}
            <strong className="text-blue-600 dark:text-blue-400">Dengan Pelanggan</strong> dan{" "}
            <strong className="text-blue-600 dark:text-blue-400">Pelanggan dengan Proyek</strong> saja.
            Kategori <strong>Tanpa Pelanggan</strong> tidak terhitung dalam capaian KPI.
          </span>
        </div>
      )}

      {/* ─── Table Section ─── */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">

        {/* Table toolbar */}
        <div className="px-4 py-3 border-b border-border bg-secondary/20 flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Users className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="text-sm font-bold text-foreground">Monitoring KPI Aktivitas</span>
            <span className="bg-secondary text-muted-foreground text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0">
              {filteredAms.length} AM
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setExpandAll(true)}
              className="h-8 px-3 rounded-lg text-xs font-semibold border border-border bg-secondary hover:border-primary/40 hover:text-primary text-foreground transition-colors flex items-center gap-1.5"
            >
              <Expand className="w-3 h-3" /> Expand Semua
            </button>
            <button
              onClick={() => setExpandAll(false)}
              className="h-8 px-3 rounded-lg text-xs font-semibold border border-border bg-secondary hover:border-primary/40 hover:text-primary text-foreground transition-colors flex items-center gap-1.5"
            >
              <Minimize2 className="w-3 h-3" /> Collapse
            </button>
          </div>
        </div>

        {/* Table header */}
        <div
          className="grid text-xs font-black uppercase tracking-wide text-white"
          style={{ background: "#B91C1C", gridTemplateColumns: "32px 1fr 220px 60px 60px 64px 110px", padding: "10px 16px" }}
        >
          <div />
          <div className="pl-1">Nama AM</div>
          <div>Progress KPI</div>
          <div className="text-center">Aktivitas</div>
          <div className="text-center">Target</div>
          <div className="text-center">Sisa</div>
          <div>Status</div>
        </div>

        {/* Table body */}
        {isLoading ? (
          <div className="divide-y divide-border/50">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="grid items-center px-4 py-3"
                style={{ gridTemplateColumns: "32px 1fr 220px 60px 60px 64px 110px" }}>
                <div className="w-6 h-6 bg-secondary rounded-lg animate-pulse" />
                <div className="pl-1 space-y-1.5">
                  <div className="h-3.5 bg-secondary rounded animate-pulse w-48" />
                  <div className="h-2.5 bg-secondary/60 rounded animate-pulse w-20" />
                </div>
                <div className="space-y-1.5">
                  <div className="h-2 bg-secondary rounded-full animate-pulse" />
                  <div className="h-2.5 bg-secondary/60 rounded animate-pulse w-16" />
                </div>
                {[...Array(4)].map((_, j) => (
                  <div key={j} className="h-4 bg-secondary rounded animate-pulse mx-1" />
                ))}
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
            <AlertTriangle className="w-7 h-7 text-destructive" />
            <p className="text-sm font-medium">Gagal memuat data aktivitas</p>
          </div>
        ) : filteredAms.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
            <Users className="w-10 h-10 opacity-20" />
            <p className="text-sm font-medium">Tidak ada AM untuk filter yang dipilih</p>
          </div>
        ) : (
          filteredAms.map(am => (
            <AmRowControlled
              key={am.nik + am.fullname}
              am={am}
              kpiLabels={kpiLabels}
              forceExpand={expandAll}
            />
          ))
        )}
      </div>
    </div>
  );
}
