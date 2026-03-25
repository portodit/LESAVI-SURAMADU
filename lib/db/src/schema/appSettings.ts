import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const appSettingsTable = pgTable("app_settings", {
  id: serial("id").primaryKey(),
  telegramBotToken: text("telegram_bot_token"),
  sharepointPerformanceUrl: text("sharepoint_performance_url"),
  sharepointFunnelUrl: text("sharepoint_funnel_url"),
  sharepointActivityUrl: text("sharepoint_activity_url"),
  autoSendOnImport: boolean("auto_send_on_import").notNull().default(true),
  kpiActivityDefault: integer("kpi_activity_default").notNull().default(30),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAppSettingsSchema = createInsertSchema(appSettingsTable).omit({ id: true });
export type InsertAppSettings = z.infer<typeof insertAppSettingsSchema>;
export type AppSettings = typeof appSettingsTable.$inferSelect;
