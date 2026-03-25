import { db, accountManagersTable, appSettingsTable, telegramBotUsersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { sendToTelegram, answerCallbackQuery, greetingByTime, buildTelegramMessages } from "./telegram";
import { logger } from "./logger";

let lastUpdateId = 0;
let pollerTimer: ReturnType<typeof setTimeout> | null = null;

// In-memory store of all users who have ever interacted with the bot.
// Persists for the lifetime of the server process.
export interface BotUser {
  chatId: string;
  firstName: string;
  lastName: string;
  username: string;
  lastMessage: string;
  lastSeen: string; // ISO date string
}
const botUsersMap = new Map<string, BotUser>();

export function getBotUsers(): BotUser[] {
  return [...botUsersMap.values()].sort(
    (a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime()
  );
}

async function upsertBotUser(user: BotUser) {
  botUsersMap.set(user.chatId, user);
  try {
    await db.insert(telegramBotUsersTable).values({
      chatId: user.chatId,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      lastMessage: user.lastMessage,
      lastSeen: new Date(user.lastSeen),
    }).onConflictDoUpdate({
      target: telegramBotUsersTable.chatId,
      set: {
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        lastMessage: user.lastMessage,
        lastSeen: new Date(user.lastSeen),
      },
    });
  } catch (err) {
    logger.debug({ err }, "Failed to persist bot user to DB (non-fatal)");
  }
}

// Inline keyboard for post-link and /start messages
const MAIN_KEYBOARD = {
  inline_keyboard: [
    [
      { text: "📋 Funneling", callback_data: "/funneling" },
      { text: "📅 Activity",  callback_data: "/activity"  },
    ],
    [
      { text: "📊 Performansi", callback_data: "/performansi" },
    ],
  ],
};

function buildWelcomeMessage(firstName: string, divisi: string): string {
  const greeting = greetingByTime();
  return (
    `Halo kak *${firstName}*, ${greeting} 👋\n\n` +
    `Selamat datang di\n` +
    `*BOT LESA VI — Witel Suramadu TREG 3* 🏢\n\n` +
    `Melalui bot ini kakak akan diinformasikan\n` +
    `dan diingatkan secara rutin terkait:\n\n` +
    `📋 *1\\. Sales Funneling*\n` +
    `Status & pergerakan LOP yang kakak handle —\n` +
    `termasuk LOP yang belum ada pergerakan status\\.\n\n` +
    `📅 *2\\. Sales Activity*\n` +
    `Reminder KPI activity kakak — hanya aktivitas\n` +
    `*Dengan Pelanggan* yang terhitung KPI ya kak\\.\n\n` +
    `📊 *3\\. Performansi Revenue*\n` +
    `Rekap capaian Revenue, Sustain, Scaling,\n` +
    `dan NGTMA setiap periodenya\\.\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `⚠️ Mohon jangan di\\-_silent_ apalagi dihapus\n` +
    `ya kak — bot ini hadir untuk mendukung\n` +
    `produktivitas dan pencapaian target kakak\\. 🎯\n\n` +
    `Semangat kak, mari kita maksimalkan\\! 💪\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `Ketuk tombol di bawah untuk mengakses data:`
  );
}

function buildWelcomeMessageLinked(firstName: string, divisi: string): string {
  const greeting = greetingByTime();
  return (
    `✅ *Berhasil terhubung\\!*\n\n` +
    `Halo kak *${firstName}*, ${greeting} 👋\n` +
    `Divisi: ${divisi}\n\n` +
    `Selamat datang di\n` +
    `*BOT LESA VI — Witel Suramadu TREG 3* 🏢\n\n` +
    `Melalui bot ini kakak akan diinformasikan\n` +
    `dan diingatkan secara rutin terkait:\n\n` +
    `📋 *1\\. Sales Funneling*\n` +
    `Status & pergerakan LOP yang kakak handle —\n` +
    `termasuk LOP yang belum ada pergerakan status\\.\n\n` +
    `📅 *2\\. Sales Activity*\n` +
    `Reminder KPI activity kakak — hanya aktivitas\n` +
    `*Dengan Pelanggan* yang terhitung KPI ya kak\\.\n\n` +
    `📊 *3\\. Performansi Revenue*\n` +
    `Rekap capaian Revenue, Sustain, Scaling,\n` +
    `dan NGTMA setiap periodenya\\.\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `⚠️ Mohon jangan di\\-_silent_ apalagi dihapus\n` +
    `ya kak — bot ini hadir untuk mendukung\n` +
    `produktivitas dan pencapaian target kakak\\. 🎯\n\n` +
    `Semangat kak, mari kita maksimalkan\\! 💪\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `Ketuk tombol di bawah untuk mengakses data:`
  );
}

// Get current YYYY-MM period
function currentPeriod(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export async function pollOnce() {
  try {
    const [settings] = await db.select().from(appSettingsTable);
    if (!settings?.telegramBotToken) return;

    const token = settings.telegramBotToken;
    const offset = lastUpdateId > 0 ? lastUpdateId + 1 : 0;
    const url = `https://api.telegram.org/bot${token}/getUpdates?limit=50&offset=${offset}&timeout=0`;

    const resp = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!resp.ok) return;

    const data = await resp.json() as { ok: boolean; result: any[] };
    if (!data.ok || !data.result.length) return;

    for (const update of data.result) {
      if (update.update_id > lastUpdateId) lastUpdateId = update.update_id;

      // ── Handle callback_query (inline keyboard button clicks) ──────────────
      if (update.callback_query) {
        const cb = update.callback_query;
        const cbChatId = String(cb.message?.chat?.id || cb.from?.id || "");
        const cbData = (cb.data || "").trim();
        const cbId = cb.id;

        await answerCallbackQuery(token, cbId);

        if (!cbChatId) continue;

        // Find AM linked to this chat ID
        const [linkedAm] = await db.select().from(accountManagersTable)
          .where(eq(accountManagersTable.telegramChatId, cbChatId));

        if (!linkedAm) {
          await sendToTelegram(token, cbChatId,
            `❌ Akun kamu belum terhubung\\. Minta admin untuk generate link verifikasi\\.`
          ).catch(() => {});
          continue;
        }

        const period = currentPeriod();
        const firstName = linkedAm.nama.split(" ")[0];

        if (cbData === "/funneling") {
          const msgs = await buildTelegramMessages(linkedAm.nik, period, { includePerformance: false, includeFunnel: true, includeActivity: false });
          for (const m of msgs) await sendToTelegram(token, cbChatId, m).catch(() => {});
          if (!msgs.length) await sendToTelegram(token, cbChatId, `📋 Belum ada data funneling kak *${firstName}*\\.`).catch(() => {});
        } else if (cbData === "/activity") {
          const msgs = await buildTelegramMessages(linkedAm.nik, period, { includePerformance: false, includeFunnel: false, includeActivity: true });
          for (const m of msgs) await sendToTelegram(token, cbChatId, m).catch(() => {});
          if (!msgs.length) await sendToTelegram(token, cbChatId, `📅 Belum ada data activity kak *${firstName}*\\.`).catch(() => {});
        } else if (cbData === "/performansi") {
          const msgs = await buildTelegramMessages(linkedAm.nik, period, { includePerformance: true, includeFunnel: false, includeActivity: false });
          for (const m of msgs) await sendToTelegram(token, cbChatId, m).catch(() => {});
          if (!msgs.length) await sendToTelegram(token, cbChatId, `📊 Belum ada data performansi kak *${firstName}*\\.`).catch(() => {});
        }
        continue;
      }

      // ── Handle regular messages ────────────────────────────────────────────
      const msg = update.message;
      if (!msg) continue;

      const chatId = String(msg.chat.id);
      const firstName = msg.from?.first_name || msg.chat?.first_name || "";
      const lastName = msg.from?.last_name || msg.chat?.last_name || "";
      const username = msg.from?.username || "";
      const text = (msg.text || "").trim();

      await upsertBotUser({
        chatId,
        firstName,
        lastName,
        username,
        lastMessage: text.slice(0, 80),
        lastSeen: new Date().toISOString(),
      });

      const isVerifCode = (s: string) => /^\d{6}$/.test(s) || /^ES-LESA-VI-\d+$/i.test(s);

      const tryLinkByCode = async (code: string, source: string) => {
        const now = new Date();
        const [am] = await db.select().from(accountManagersTable)
          .where(eq(accountManagersTable.telegramCode, code));
        if (!am) {
          await sendToTelegram(token, chatId, `❌ Link/kode tidak valid atau sudah kadaluarsa\\.\n\nMinta admin untuk generate link baru\\.`).catch(() => {});
          return false;
        }
        if (!am.telegramCodeExpiry || am.telegramCodeExpiry <= now) {
          await sendToTelegram(token, chatId, `⏰ Link sudah kadaluarsa\\.\n\nMinta admin untuk generate link baru\\.`).catch(() => {});
          return false;
        }
        await db.update(accountManagersTable)
          .set({ telegramChatId: chatId, telegramCode: null, telegramCodeExpiry: null })
          .where(eq(accountManagersTable.id, am.id));
        await upsertBotUser({ ...botUsersMap.get(chatId)!, lastMessage: `✅ Linked via ${source}` });
        const amFirstName = am.nama.split(" ")[0];
        await sendToTelegram(
          token, chatId,
          buildWelcomeMessageLinked(amFirstName, am.divisi),
          MAIN_KEYBOARD
        ).catch(() => {});
        logger.info({ amId: am.id, nama: am.nama, chatId, source }, "AM auto-linked");
        return true;
      };

      if (text.startsWith("/start")) {
        const deepLinkCode = text.slice(6).trim();
        if (isVerifCode(deepLinkCode)) {
          await tryLinkByCode(deepLinkCode, "magic link");
          continue;
        }
        // Check if already linked
        const [linkedAm] = await db.select().from(accountManagersTable)
          .where(eq(accountManagersTable.telegramChatId, chatId));
        if (linkedAm) {
          const amFirstName = linkedAm.nama.split(" ")[0];
          await sendToTelegram(
            token, chatId,
            buildWelcomeMessage(amFirstName, linkedAm.divisi),
            MAIN_KEYBOARD
          ).catch(() => {});
        } else {
          // Not linked yet
          await sendToTelegram(token, chatId,
            `👋 Halo *${firstName}\\!* Ini adalah Bot LESA VI AM Reminder Witel Suramadu\\.\n\n` +
            `🆔 *Chat ID kamu:* \`${chatId}\`\n` +
            `_Bagikan ID ini ke admin jika ingin dihubungkan secara manual\\_\n\n` +
            `Jika kamu memiliki link verifikasi dari admin, cukup klik link tersebut untuk terhubung otomatis\\.\n\n` +
            `Jika belum punya link, hubungi admin LESA VI\\.`
          ).catch(() => {});
        }
        continue;
      }

      if (text === "/myid") {
        await sendToTelegram(token, chatId,
          `🆔 *Chat ID kamu:* \`${chatId}\`\n\nBagikan ID ini ke admin LESA VI untuk menghubungkan akun kamu ke sistem\\.`
        ).catch(() => {});
        continue;
      }

      // Handle text shortcuts for data requests
      if (["/funneling", "/activity", "/performansi"].includes(text)) {
        const [linkedAm] = await db.select().from(accountManagersTable)
          .where(eq(accountManagersTable.telegramChatId, chatId));
        if (!linkedAm) {
          await sendToTelegram(token, chatId, `❌ Akun kamu belum terhubung\\. Minta admin untuk generate link verifikasi\\.`).catch(() => {});
          continue;
        }
        const period = currentPeriod();
        const amFirstName = linkedAm.nama.split(" ")[0];
        const opts = {
          includePerformance: text === "/performansi",
          includeFunnel: text === "/funneling",
          includeActivity: text === "/activity",
        };
        const msgs = await buildTelegramMessages(linkedAm.nik, period, opts);
        for (const m of msgs) await sendToTelegram(token, chatId, m).catch(() => {});
        if (!msgs.length) await sendToTelegram(token, chatId, `📊 Belum ada data untuk periode ini kak *${amFirstName}*\\.`).catch(() => {});
        continue;
      }

      if (isVerifCode(text)) {
        await tryLinkByCode(text, "manual code");
      }
    }
  } catch (err) {
    logger.debug({ err }, "Telegram poller error (non-fatal)");
  }
}

async function deleteWebhookIfAny(token: string) {
  try {
    const resp = await fetch(`https://api.telegram.org/bot${token}/deleteWebhook?drop_pending_updates=false`);
    const data = await resp.json() as { ok: boolean };
    if (data.ok) logger.info("Telegram webhook deleted — using getUpdates polling");
  } catch {
    // non-fatal
  }
}

export function startTelegramPoller(intervalMs = 15000) {
  const run = async () => {
    await pollOnce();
    pollerTimer = setTimeout(run, intervalMs);
  };

  db.select().from(appSettingsTable).then(([settings]) => {
    if (settings?.telegramBotToken) {
      deleteWebhookIfAny(settings.telegramBotToken).then(() => {
        logger.info({ intervalMs }, "Telegram background poller started");
        pollerTimer = setTimeout(run, 3000);
      });
    } else {
      logger.info({ intervalMs }, "Telegram background poller started (no token yet)");
      pollerTimer = setTimeout(run, 5000);
    }
  }).catch(() => {
    pollerTimer = setTimeout(run, 5000);
  });
}

export function stopTelegramPoller() {
  if (pollerTimer) { clearTimeout(pollerTimer); pollerTimer = null; }
}
