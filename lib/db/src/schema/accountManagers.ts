import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const accountManagersTable = pgTable("account_managers", {
  id: serial("id").primaryKey(),
  nik: text("nik").notNull().unique(),
  nama: text("nama").notNull(),
  slug: text("slug").notNull().unique(),
  divisi: text("divisi").notNull(),
  segmen: text("segmen"),
  witel: text("witel").notNull().default("SURAMADU"),
  telegramChatId: text("telegram_chat_id"),
  telegramCode: text("telegram_code"),
  telegramCodeExpiry: timestamp("telegram_code_expiry", { withTimezone: true }),
  kpiActivity: integer("kpi_activity").notNull().default(30),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAccountManagerSchema = createInsertSchema(accountManagersTable).omit({ id: true, createdAt: true });
export type InsertAccountManager = z.infer<typeof insertAccountManagerSchema>;
export type AccountManager = typeof accountManagersTable.$inferSelect;
