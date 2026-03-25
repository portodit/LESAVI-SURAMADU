import { Router, type IRouter } from "express";
import { db, salesActivityTable, accountManagersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../../shared/auth";

const router: IRouter = Router();

router.get("/activity", requireAuth, async (req, res): Promise<void> => {
  const { year, month, divisi, nama_am, label } = req.query;

  let acts = await db.select().from(salesActivityTable);
  if (divisi) acts = acts.filter(a => a.divisi === String(divisi));
  if (label) acts = acts.filter(a => a.label === String(label));
  if (nama_am) acts = acts.filter(a => a.fullname?.toLowerCase().includes(String(nama_am).toLowerCase()));
  if (year && month) {
    const prefix = `${year}-${String(month).padStart(2, "0")}`;
    acts = acts.filter(a => a.activityEndDate?.startsWith(prefix));
  }

  const ams = await db.select().from(accountManagersTable);
  const amMap = Object.fromEntries(ams.map(a => [a.nik, a]));

  const byAm = Object.entries(
    acts.reduce((acc: any, a) => {
      if (!acc[a.nik]) acc[a.nik] = { nik: a.nik, fullname: a.fullname, divisi: a.divisi || "", count: 0, labelMap: {} };
      acc[a.nik].count++;
      const l = a.label || "Lainnya";
      if (!acc[a.nik].labelMap[l]) acc[a.nik].labelMap[l] = { label: l, count: 0 };
      acc[a.nik].labelMap[l].count++;
      return acc;
    }, {})
  ).map(([, v]: any) => {
    const amData = amMap[v.nik];
    const kpiTarget = amData?.kpiActivity || 30;
    return {
      nik: v.nik, fullname: v.fullname, divisi: v.divisi,
      activityCount: v.count, kpiTarget, kpiAchieved: v.count >= kpiTarget,
      byLabel: Object.values(v.labelMap),
    };
  });

  res.json({
    totalActivity: acts.length,
    byAm,
    activities: acts.map(a => ({ ...a, createdAt: a.createdAt.toISOString() })),
  });
});

router.get("/activity/:nik", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.nik) ? req.params.nik[0] : req.params.nik;
  const { year, month } = req.query;

  let acts = await db.select().from(salesActivityTable).where(eq(salesActivityTable.nik, raw));
  if (year && month) {
    const prefix = `${year}-${String(month).padStart(2, "0")}`;
    acts = acts.filter(a => a.activityEndDate?.startsWith(prefix));
  }

  const [am] = await db.select().from(accountManagersTable).where(eq(accountManagersTable.nik, raw));
  const kpiTarget = am?.kpiActivity || 30;
  const fullname = acts[0]?.fullname || am?.nama || "";
  const divisi = acts[0]?.divisi || am?.divisi || "";

  res.json({
    nik: raw, fullname, divisi, activityCount: acts.length, kpiTarget,
    activities: acts.map(a => ({ ...a, createdAt: a.createdAt.toISOString() })),
  });
});

export default router;
