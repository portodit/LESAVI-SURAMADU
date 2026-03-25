import { Router, type IRouter } from "express";
import { db, salesFunnelTable, salesFunnelTargetTable, dataImportsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "../../shared/auth";

const router: IRouter = Router();

// ── Snapshots ──────────────────────────────────────────────────────────────────
router.get("/funnel/snapshots", requireAuth, async (req, res): Promise<void> => {
  const imports = await db
    .select()
    .from(dataImportsTable)
    .where(eq(dataImportsTable.type, "funnel"))
    .orderBy(desc(dataImportsTable.createdAt));

  res.json(imports.map(imp => ({
    id: imp.id,
    period: imp.period,
    rowsImported: imp.rowsImported,
    createdAt: imp.createdAt?.toISOString(),
  })));
});

// ── Targets CRUD ───────────────────────────────────────────────────────────────
router.get("/funnel/targets", requireAuth, async (req, res): Promise<void> => {
  const targets = await db.select().from(salesFunnelTargetTable).orderBy(desc(salesFunnelTargetTable.tahun), desc(salesFunnelTargetTable.bulan));
  res.json(targets);
});

router.post("/funnel/targets", requireAuth, async (req, res): Promise<void> => {
  const { divisi, tahun, bulan, targetHo, targetFullHo } = req.body;
  if (!tahun || !bulan) { res.status(400).json({ error: "tahun and bulan are required" }); return; }

  const existing = await db.select().from(salesFunnelTargetTable)
    .where(and(
      eq(salesFunnelTargetTable.tahun, Number(tahun)),
      eq(salesFunnelTargetTable.bulan, Number(bulan)),
      ...(divisi ? [eq(salesFunnelTargetTable.divisi, String(divisi))] : [])
    ));

  if (existing.length > 0) {
    await db.update(salesFunnelTargetTable)
      .set({ targetHo: Number(targetHo) || 0, targetFullHo: Number(targetFullHo) || 0 })
      .where(eq(salesFunnelTargetTable.id, existing[0].id));
    const updated = await db.select().from(salesFunnelTargetTable).where(eq(salesFunnelTargetTable.id, existing[0].id));
    res.json(updated[0]);
  } else {
    const [inserted] = await db.insert(salesFunnelTargetTable).values({
      divisi: divisi ? String(divisi) : null,
      tahun: Number(tahun),
      bulan: Number(bulan),
      targetHo: Number(targetHo) || 0,
      targetFullHo: Number(targetFullHo) || 0,
    }).returning();
    res.json(inserted);
  }
});

router.delete("/funnel/targets/:id", requireAuth, async (req, res): Promise<void> => {
  await db.delete(salesFunnelTargetTable).where(eq(salesFunnelTargetTable.id, Number(req.params.id)));
  res.json({ ok: true });
});

// ── Main Funnel Data ───────────────────────────────────────────────────────────
router.get("/funnel", requireAuth, async (req, res): Promise<void> => {
  const { import_id, divisi, status, nama_am, kategori_kontrak, tahun } = req.query;

  let allLops = await db.select().from(salesFunnelTable);

  if (import_id) allLops = allLops.filter(l => l.importId === Number(import_id));
  // tahun is only for snapshot selection & target lookup — do NOT filter lops by reportDate
  if (divisi) allLops = allLops.filter(l => l.divisi === String(divisi));
  if (status) allLops = allLops.filter(l => l.statusF === String(status));
  if (nama_am) allLops = allLops.filter(l => l.namaAm?.toLowerCase().includes(String(nama_am).toLowerCase()));
  if (kategori_kontrak) allLops = allLops.filter(l => l.kategoriKontrak === String(kategori_kontrak));

  const totalLop = allLops.length;
  const totalNilai = allLops.reduce((s, l) => s + (l.nilaiProyek || 0), 0);
  const amSet = new Set(allLops.map(l => l.nikAm).filter(Boolean));
  const pelangganSet = new Set(allLops.map(l => l.pelanggan).filter(Boolean));

  const statusGroups = Object.entries(
    allLops.reduce((acc: any, l) => {
      const s = l.statusF || "Unknown";
      if (!acc[s]) acc[s] = { status: s, count: 0, totalNilai: 0 };
      acc[s].count++;
      acc[s].totalNilai += l.nilaiProyek || 0;
      return acc;
    }, {})
  ).map(([, v]) => v);

  const amGroups = Object.entries(
    allLops.reduce((acc: any, l) => {
      const key = l.nikAm || l.namaAm || "Unknown";
      if (!acc[key]) acc[key] = {
        namaAm: l.namaAm || "", nik: l.nikAm || "", divisi: l.divisi || "",
        totalLop: 0, totalNilai: 0, shortage: 0, statusMap: {}
      };
      acc[key].totalLop++;
      acc[key].totalNilai += l.nilaiProyek || 0;
      const s = l.statusF || "Unknown";
      if (!acc[key].statusMap[s]) acc[key].statusMap[s] = { status: s, count: 0, totalNilai: 0 };
      acc[key].statusMap[s].count++;
      acc[key].statusMap[s].totalNilai += l.nilaiProyek || 0;
      return acc;
    }, {})
  ).map(([, v]: any) => ({
    namaAm: v.namaAm, nik: v.nik, divisi: v.divisi,
    totalLop: v.totalLop, totalNilai: v.totalNilai, shortage: 0,
    byStatus: Object.values(v.statusMap),
  }));

  // Find matching target: derive year/month from import period if possible
  let targetHoVal = 0, targetFullHoVal = 0;
  const allTargets = await db.select().from(salesFunnelTargetTable)
    .orderBy(desc(salesFunnelTargetTable.tahun), desc(salesFunnelTargetTable.bulan));

  if (allTargets.length > 0) {
    const selectedYear = tahun ? Number(tahun) : null;
    const importPeriod = import_id
      ? (await db.select().from(dataImportsTable).where(eq(dataImportsTable.id, Number(import_id))))[0]?.period
      : null;
    const importYear = importPeriod ? Number(importPeriod.slice(0, 4)) : null;
    const importMonth = importPeriod ? Number(importPeriod.slice(5, 7)) : null;
    const lookupYear = selectedYear || importYear;
    const lookupMonth = importMonth;
    const divisiFilter = divisi ? String(divisi) : null;

    let matched = allTargets;
    if (lookupYear) matched = matched.filter(t => t.tahun === lookupYear);
    if (lookupMonth) matched = matched.filter(t => t.bulan === lookupMonth);

    if (divisiFilter && divisiFilter !== "all") {
      const divMatch = matched.filter(t => t.divisi === divisiFilter);
      if (divMatch.length > 0) {
        targetHoVal = divMatch.reduce((s, t) => s + (t.targetHo || 0), 0);
        targetFullHoVal = divMatch.reduce((s, t) => s + (t.targetFullHo || 0), 0);
      }
    } else {
      // Sum all divisi for that period
      const withDivisi = matched.filter(t => t.divisi);
      if (withDivisi.length > 0) {
        targetHoVal = withDivisi.reduce((s, t) => s + (t.targetHo || 0), 0);
        targetFullHoVal = withDivisi.reduce((s, t) => s + (t.targetFullHo || 0), 0);
      } else if (matched.length > 0) {
        targetHoVal = matched[0].targetHo || 0;
        targetFullHoVal = matched[0].targetFullHo || 0;
      }
    }
  }

  const shortage = targetFullHoVal > 0 ? targetFullHoVal - totalNilai : 0;

  res.json({
    totalLop, totalNilai,
    targetHo: targetHoVal,
    targetFullHo: targetFullHoVal,
    realFullHo: totalNilai,
    shortage,
    amCount: amSet.size,
    pelangganCount: pelangganSet.size,
    byStatus: statusGroups,
    byAm: amGroups,
    lops: allLops.map(l => ({
      id: l.id,
      lopid: l.lopid,
      judulProyek: l.judulProyek,
      pelanggan: l.pelanggan,
      nilaiProyek: l.nilaiProyek,
      divisi: l.divisi,
      segmen: l.segmen,
      statusF: l.statusF,
      proses: l.proses,
      statusProyek: l.statusProyek,
      kategoriKontrak: l.kategoriKontrak,
      estimateBulan: l.estimateBulan,
      namaAm: l.namaAm,
      nikAm: l.nikAm,
      reportDate: l.reportDate,
    })),
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
