import { Router, type IRouter } from "express";
import { db, performanceDataTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

router.get("/performance", requireAuth, async (req, res): Promise<void> => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  const { year, month, divisi, importId } = req.query;

  const conditions = [];
  if (year) conditions.push(eq(performanceDataTable.tahun, parseInt(String(year))));
  if (month) conditions.push(eq(performanceDataTable.bulan, parseInt(String(month))));
  if (divisi) conditions.push(eq(performanceDataTable.divisi, String(divisi)));
  if (importId) conditions.push(eq(performanceDataTable.importId, parseInt(String(importId))));

  const data = conditions.length > 0
    ? await db.select().from(performanceDataTable).where(and(...conditions))
    : await db.select().from(performanceDataTable);

  res.json(data.map(d => ({ ...d, createdAt: d.createdAt.toISOString() })));
});

router.get("/performance/:nik", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.nik) ? req.params.nik[0] : req.params.nik;
  const { year, month } = req.query;

  const conditions = [eq(performanceDataTable.nik, raw)];
  if (year) conditions.push(eq(performanceDataTable.tahun, parseInt(String(year))));
  if (month) conditions.push(eq(performanceDataTable.bulan, parseInt(String(month))));

  const summaries = await db.select().from(performanceDataTable).where(and(...conditions));
  if (summaries.length === 0) { res.status(404).json({ error: "Data tidak ditemukan" }); return; }

  const first = summaries[0];
  res.json({
    nik: first.nik,
    namaAm: first.namaAm,
    divisi: first.divisi,
    summaries: summaries.map(s => ({ ...s, createdAt: s.createdAt.toISOString() })),
  });
});

export default router;
