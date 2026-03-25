import { db, appSettingsTable, accountManagersTable, performanceDataTable, salesFunnelTable, salesActivityTable, telegramLogsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { logger } from "./logger";

function formatRupiah(val: number): string {
  if (val >= 1_000_000_000) return `Rp ${(val / 1_000_000_000).toFixed(2)} T`;
  if (val >= 1_000_000) return `Rp ${(val / 1_000_000).toFixed(2)} M`;
  return `Rp ${val.toLocaleString("id-ID")}`;
}

export async function buildTelegramMessage(
  nik: string,
  period: string,
  options: { includePerformance: boolean; includeFunnel: boolean; includeActivity: boolean }
): Promise<string> {
  const [year, month] = period.split("-").map(Number);
  const monthNames = ["", "Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

  const [am] = await db.select().from(accountManagersTable).where(eq(accountManagersTable.nik, nik));
  if (!am) return "";

  let msg = `🏢 *RLEGS Witel Suramadu*\n`;
  msg += `📅 Laporan ${monthNames[month]} ${year}\n\n`;
  msg += `Halo, *${am.nama}*! 👋\n`;
  msg += `Divisi: ${am.divisi}\n\n`;

  if (options.includePerformance) {
    const perfs = await db.select().from(performanceDataTable)
      .where(and(eq(performanceDataTable.nik, nik), eq(performanceDataTable.tahun, year), eq(performanceDataTable.bulan, month)));

    if (perfs.length > 0) {
      const p = perfs[0];
      const statusEmoji = p.statusWarna === "hijau" ? "🟢" : p.statusWarna === "oranye" ? "🟡" : "🔴";
      msg += `📊 *PERFORMA REVENUE*\n`;
      msg += `Real    : ${formatRupiah(p.realRevenue)}\n`;
      msg += `Target  : ${formatRupiah(p.targetRevenue)}\n`;
      msg += `Ach     : ${p.achRate.toFixed(1)}%  ${statusEmoji}\n`;
      msg += `Rank    : #${p.rankAch}\n\n`;
    }
  }

  if (options.includeFunnel) {
    const lops = await db.select().from(salesFunnelTable)
      .where(and(eq(salesFunnelTable.nikAm, nik)));

    const activeLops = lops.filter(l => !["Won", "Lost"].includes(l.statusF || ""));
    const totalNilai = activeLops.reduce((s, l) => s + (l.nilaiProyek || 0), 0);

    msg += `📋 *SALES FUNNEL*\n`;
    msg += `LOP Aktif : ${activeLops.length} proyek\n`;
    msg += `Total Nilai: ${formatRupiah(totalNilai)}\n\n`;
  }

  if (options.includeActivity) {
    const [yearStr, monthStr] = period.split("-");
    const acts = await db.select().from(salesActivityTable)
      .where(eq(salesActivityTable.nik, nik));

    const monthActs = acts.filter(a => {
      if (!a.activityEndDate) return false;
      return a.activityEndDate.startsWith(period);
    });

    msg += `📌 *SALES ACTIVITY*\n`;
    msg += `Activity bulan ini: ${monthActs.length} / ${am.kpiActivity} KPI\n`;
    msg += monthActs.length >= am.kpiActivity ? `Status: ✅ KPI Tercapai!\n\n` : `Status: ⚠️ Belum tercapai, butuh ${am.kpiActivity - monthActs.length} lagi\n\n`;
  }

  msg += `📎 Detail: Hubungi Admin RLEGS`;
  return msg;
}

export async function sendToTelegram(botToken: string, chatId: string, message: string): Promise<void> {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: "Markdown" }),
  });

  if (!response.ok) {
    const data = await response.json() as { description?: string };
    throw new Error(data.description || "Telegram API error");
  }
}

export async function sendReminderToAllAMs(
  period: string,
  options: { includePerformance: boolean; includeFunnel: boolean; includeActivity: boolean },
  targetNiks?: string[]
): Promise<{ sent: number; failed: number; skipped: number; details: { nik: string; namaAm: string; status: string; error?: string }[] }> {
  const [settings] = await db.select().from(appSettingsTable);
  if (!settings?.telegramBotToken) {
    return { sent: 0, failed: 0, skipped: 0, details: [] };
  }

  let ams = await db.select().from(accountManagersTable);
  if (targetNiks && targetNiks.length > 0) {
    ams = ams.filter(a => targetNiks.includes(a.nik));
  }

  let sent = 0, failed = 0, skipped = 0;
  const details: { nik: string; namaAm: string; status: string; error?: string }[] = [];

  for (const am of ams) {
    if (!am.telegramChatId) {
      skipped++;
      details.push({ nik: am.nik, namaAm: am.nama, status: "skipped" });
      continue;
    }

    try {
      const message = await buildTelegramMessage(am.nik, period, options);
      if (!message) {
        skipped++;
        details.push({ nik: am.nik, namaAm: am.nama, status: "skipped" });
        continue;
      }

      await sendToTelegram(settings.telegramBotToken!, am.telegramChatId, message);
      sent++;
      details.push({ nik: am.nik, namaAm: am.nama, status: "sent" });

      await db.insert(telegramLogsTable).values({
        nik: am.nik, namaAm: am.nama, telegramChatId: am.telegramChatId,
        status: "sent", period, messageType: "reminder",
      });
    } catch (error) {
      failed++;
      const errMsg = error instanceof Error ? error.message : "Unknown error";
      details.push({ nik: am.nik, namaAm: am.nama, status: "failed", error: errMsg });

      await db.insert(telegramLogsTable).values({
        nik: am.nik, namaAm: am.nama, telegramChatId: am.telegramChatId || null,
        status: "failed", period, messageType: "reminder", error: errMsg,
      });

      logger.error({ nik: am.nik, error: errMsg }, "Failed to send Telegram message");
    }
  }

  return { sent, failed, skipped, details };
}
