import { Router, type IRouter } from "express";
import { db, appSettingsTable } from "@workspace/db";
import { requireAuth } from "../../shared/auth";

const router: IRouter = Router();

router.get("/settings", requireAuth, async (req, res): Promise<void> => {
  let [settings] = await db.select().from(appSettingsTable);
  if (!settings) {
    [settings] = await db.insert(appSettingsTable).values({
      autoSendOnImport: true,
      kpiActivityDefault: 30,
    }).returning();
  }
  res.json({
    telegramBotToken: settings.telegramBotToken ? "***" + settings.telegramBotToken.slice(-6) : null,
    sharepointPerformanceUrl: settings.sharepointPerformanceUrl,
    sharepointFunnelUrl: settings.sharepointFunnelUrl,
    sharepointActivityUrl: settings.sharepointActivityUrl,
    autoSendOnImport: settings.autoSendOnImport,
    kpiActivityDefault: settings.kpiActivityDefault,
  });
});

router.patch("/settings", requireAuth, async (req, res): Promise<void> => {
  const { telegramBotToken, sharepointPerformanceUrl, sharepointFunnelUrl, sharepointActivityUrl, autoSendOnImport, kpiActivityDefault } = req.body;

  const [existing] = await db.select().from(appSettingsTable);
  const updates: Partial<typeof appSettingsTable.$inferInsert> = {};

  if (telegramBotToken !== undefined && !telegramBotToken.startsWith("***")) updates.telegramBotToken = telegramBotToken;
  if (sharepointPerformanceUrl !== undefined) updates.sharepointPerformanceUrl = sharepointPerformanceUrl;
  if (sharepointFunnelUrl !== undefined) updates.sharepointFunnelUrl = sharepointFunnelUrl;
  if (sharepointActivityUrl !== undefined) updates.sharepointActivityUrl = sharepointActivityUrl;
  if (autoSendOnImport !== undefined) updates.autoSendOnImport = autoSendOnImport;
  if (kpiActivityDefault !== undefined) updates.kpiActivityDefault = kpiActivityDefault;

  let settings;
  if (existing) {
    [settings] = await db.update(appSettingsTable).set(updates).returning();
  } else {
    [settings] = await db.insert(appSettingsTable).values({
      autoSendOnImport: autoSendOnImport ?? true,
      kpiActivityDefault: kpiActivityDefault ?? 30,
      ...updates,
    }).returning();
  }

  res.json({
    telegramBotToken: settings.telegramBotToken ? "***" + settings.telegramBotToken.slice(-6) : null,
    sharepointPerformanceUrl: settings.sharepointPerformanceUrl,
    sharepointFunnelUrl: settings.sharepointFunnelUrl,
    sharepointActivityUrl: settings.sharepointActivityUrl,
    autoSendOnImport: settings.autoSendOnImport,
    kpiActivityDefault: settings.kpiActivityDefault,
  });
});

export default router;
