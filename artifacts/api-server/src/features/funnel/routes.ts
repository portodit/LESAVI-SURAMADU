import { Router, type IRouter } from "express";
import { db, salesFunnelTable, salesFunnelTargetTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../../shared/auth";

const router: IRouter = Router();

router.get("/funnel", requireAuth, async (req, res): Promise<void> => {
  const { year, month, divisi, status, nama_am } = req.query;

  let lops = await db.select().from(salesFunnelTable);

  if (divisi) lops = lops.filter(l => l.divisi === String(divisi));
  if (status) lops = lops.filter(l => l.statusF === String(status));
  if (nama_am) lops = lops.filter(l => l.namaAm?.toLowerCase().includes(String(nama_am).toLowerCase()));
  if (year && month) {
    lops = lops.filter(l => l.reportDate?.startsWith(`${year}-${String(month).padStart(2, "0")}`));
  }

  const totalLop = lops.length;
  const totalNilai = lops.reduce((s, l) => s + (l.nilaiProyek || 0), 0);

  const statusGroups = Object.entries(
    lops.reduce((acc: any, l) => {
      const s = l.statusF || "Unknown";
      if (!acc[s]) acc[s] = { status: s, count: 0, totalNilai: 0 };
      acc[s].count++;
      acc[s].totalNilai += l.nilaiProyek || 0;
      return acc;
    }, {})
  ).map(([, v]) => v);

  const amGroups = Object.entries(
    lops.reduce((acc: any, l) => {
      const key = l.nikAm || l.namaAm || "Unknown";
      if (!acc[key]) acc[key] = { namaAm: l.namaAm || "", nik: l.nikAm || "", divisi: l.divisi || "", totalLop: 0, totalNilai: 0, shortage: 0, statusMap: {} };
      acc[key].totalLop++;
      acc[key].totalNilai += l.nilaiProyek || 0;
      const s = l.statusF || "Unknown";
      if (!acc[key].statusMap[s]) acc[key].statusMap[s] = { status: s, count: 0, totalNilai: 0 };
      acc[key].statusMap[s].count++;
      acc[key].statusMap[s].totalNilai += l.nilaiProyek || 0;
      return acc;
    }, {})
  ).map(([, v]: any) => ({ namaAm: v.namaAm, nik: v.nik, divisi: v.divisi, totalLop: v.totalLop, totalNilai: v.totalNilai, shortage: 0, byStatus: Object.values(v.statusMap) }));

  const targets = await db.select().from(salesFunnelTargetTable);
  const latestTarget = targets[targets.length - 1];
  const targetFullHo = latestTarget?.targetFullHo || 0;
  const shortage = targetFullHo - totalNilai;

  res.json({
    totalLop, totalNilai, targetFullHo,
    realFullHo: totalNilai,
    shortage,
    cutoffDate: lops[0]?.reportDate || null,
    byStatus: statusGroups,
    byAm: amGroups,
    lops: lops.map(l => ({ ...l, createdAt: l.createdAt.toISOString() })),
  });
});

router.get("/funnel/:nik", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.nik) ? req.params.nik[0] : req.params.nik;
  const lops = await db.select().from(salesFunnelTable).where(eq(salesFunnelTable.nikAm, raw));

  const totalLop = lops.length;
  const totalNilai = lops.reduce((s, l) => s + (l.nilaiProyek || 0), 0);
  const namaAm = lops[0]?.namaAm || "";
  const divisi = lops[0]?.divisi || "";

  res.json({
    nik: raw, namaAm, divisi, totalLop, totalNilai, shortage: 0,
    lops: lops.map(l => ({
      lopid: l.lopid, judulProyek: l.judulProyek, pelanggan: l.pelanggan,
      nilaiProyek: l.nilaiProyek, divisi: l.divisi, statusF: l.statusF,
      statusProyek: l.statusProyek, kategoriKontrak: l.kategoriKontrak,
      estimateBulan: l.estimateBulan, namaAm: l.namaAm, reportDate: l.reportDate || "",
    })),
  });
});

export default router;
