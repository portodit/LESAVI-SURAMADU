import React, { useMemo, useState, useEffect } from "react";
import { formatRupiah, getStatusColor, cn } from "@/lib/utils";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

const MONTHS_LABEL = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];

function periodeLabel(ym: string) {
  const [y, m] = ym.split("-");
  return `${MONTHS_LABEL[parseInt(m) - 1]} ${y}`;
}

function shortSnap(createdAt: string) {
  return format(new Date(createdAt), "d MMM yyyy", { locale: idLocale });
}

function formatPercent(v: number | null | undefined) {
  if (v == null || isNaN(v)) return "–%";
  return `${(v * 100).toFixed(1).replace(".", ",")}%`;
}

export default function EmbedPerforma() {
  const [imports, setImports] = useState<any[]>([]);
  const [snapshotId, setSnapshotId] = useState<number | null>(null);
  const [perfs, setPerfs] = useState<any[]>([]);
  const [filterPeriodes, setFilterPeriodes] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/api/public/import-history`)
      .then(r => r.json())
      .then((data: any[]) => {
        setImports(data);
        if (data.length > 0) setSnapshotId(data[0].id);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!snapshotId) { setPerfs([]); return; }
    setLoading(true);
    fetch(`${API_BASE}/api/public/performance?importId=${snapshotId}`)
      .then(r => r.json())
      .then((data: any[]) => {
        setPerfs(data);
        const ps = [...new Set(data.map((p: any) => `${p.tahun}-${String(p.bulan).padStart(2, "0")}`))] as string[];
        ps.sort().reverse();
        if (ps.length > 0) setFilterPeriodes(new Set([ps[0]]));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [snapshotId]);

  const availablePeriodes = useMemo(() => {
    return [...new Set(perfs.map((p: any) => `${p.tahun}-${String(p.bulan).padStart(2, "0")}`))]
      .sort().reverse();
  }, [perfs]);

  const filtered = useMemo(() => {
    let rows = perfs;
    if (filterPeriodes.size > 0) {
      rows = rows.filter((p: any) => {
        const key = `${p.tahun}-${String(p.bulan).padStart(2, "0")}`;
        return filterPeriodes.has(key);
      });
    }
    return rows;
  }, [perfs, filterPeriodes]);

  const tableData = useMemo(() => {
    const map = new Map<string, any>();
    for (const p of filtered) {
      const key = p.nik;
      if (!map.has(key)) {
        map.set(key, { nik: p.nik, namaAm: p.namaAm, divisi: p.divisi,
          cmTarget: 0, cmReal: 0, ytdTarget: 0, ytdReal: 0, statusWarna: p.statusWarna ?? "merah" });
      }
      const entry = map.get(key)!;
      entry.cmTarget += p.targetRevenue ?? 0;
      entry.cmReal += p.realRevenue ?? 0;
      entry.ytdTarget += p.targetRevenue ?? 0;
      entry.ytdReal += p.realRevenue ?? 0;
    }
    return [...map.values()]
      .map(e => ({
        ...e,
        cmAch: e.cmTarget > 0 ? e.cmReal / e.cmTarget : 0,
        ytdAch: e.ytdTarget > 0 ? e.ytdReal / e.ytdTarget : 0,
      }))
      .sort((a, b) => b.cmAch - a.cmAch)
      .map((e, i) => ({ ...e, rank: i + 1 }));
  }, [filtered]);

  function togglePeriode(p: string) {
    setFilterPeriodes(prev => {
      const next = new Set(prev);
      if (next.has(p)) { if (next.size > 1) next.delete(p); }
      else next.add(p);
      return next;
    });
  }

  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      {/* Header */}
      <div className="bg-card border-b border-border px-5 py-3 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-sm font-bold text-foreground">Visualisasi Performa AM</h1>
          <p className="text-[10px] text-muted-foreground">Witel Suramadu · PT Telkom Indonesia</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={snapshotId ?? ""}
            disabled={!imports.length}
            onChange={e => { setSnapshotId(Number(e.target.value)); setFilterPeriodes(new Set()); }}
            className="h-7 px-2 bg-secondary/50 border border-border rounded-lg text-xs focus:outline-none min-w-[100px]"
          >
            {imports.length === 0 && <option value="">Belum ada data</option>}
            {imports.map(imp => <option key={imp.id} value={imp.id}>{shortSnap(imp.createdAt)}</option>)}
          </select>
          {availablePeriodes.map(p => (
            <button
              key={p}
              onClick={() => togglePeriode(p)}
              className={cn(
                "h-7 px-2.5 rounded-lg text-[11px] font-semibold border transition-colors",
                filterPeriodes.has(p)
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-secondary/50 text-muted-foreground border-border hover:border-primary/50"
              )}
            >
              {periodeLabel(p)}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">Memuat data...</div>
        ) : tableData.length === 0 ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">Belum ada data performa</div>
        ) : (
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-secondary/40 text-muted-foreground font-semibold uppercase tracking-wide text-[10px] sticky top-0">
                <th className="px-4 py-2.5 text-center">Rank</th>
                <th className="px-4 py-2.5">Nama AM</th>
                <th className="px-3 py-2.5 text-center">Divisi</th>
                <th className="px-4 py-2.5 text-right">Target CM</th>
                <th className="px-4 py-2.5 text-right">Real CM</th>
                <th className="px-3 py-2.5 text-right">CM %</th>
                <th className="px-3 py-2.5 text-right">YTD %</th>
                <th className="px-3 py-2.5 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {tableData.map(row => (
                <tr key={row.nik} className="hover:bg-secondary/20 transition-colors">
                  <td className="px-4 py-2.5 text-center font-bold text-muted-foreground">{row.rank}</td>
                  <td className="px-4 py-2.5 font-medium text-foreground">
                    <span className="truncate max-w-[160px] block" title={row.namaAm}>{row.namaAm}</span>
                  </td>
                  <td className="px-3 py-2.5 text-center text-muted-foreground">{row.divisi}</td>
                  <td className="px-4 py-2.5 text-right text-muted-foreground tabular-nums">{formatRupiah(row.cmTarget)}</td>
                  <td className="px-4 py-2.5 text-right font-medium tabular-nums">{formatRupiah(row.cmReal)}</td>
                  <td className={cn("px-3 py-2.5 text-right font-bold tabular-nums",
                    row.cmAch >= 1 ? "text-green-600" : row.cmAch >= 0.8 ? "text-orange-500" : "text-red-600")}>
                    {formatPercent(row.cmAch)}
                  </td>
                  <td className={cn("px-3 py-2.5 text-right font-bold tabular-nums",
                    row.ytdAch >= 1 ? "text-green-600" : row.ytdAch >= 0.8 ? "text-blue-600" : "text-muted-foreground")}>
                    {formatPercent(row.ytdAch)}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold border", getStatusColor(row.statusWarna))}>
                      {row.statusWarna?.toUpperCase() ?? "–"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="px-5 py-2 text-[10px] text-muted-foreground/50 text-right">
        Telkom AM Dashboard · Data diperbarui otomatis
      </div>
    </div>
  );
}
