import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/shared/hooks/use-toast";
import { Settings, Bot, CheckCircle2, XCircle, Eye, EyeOff, Save, Loader2, ExternalLink, Zap } from "lucide-react";
import { cn } from "@/shared/lib/utils";

const API = import.meta.env.BASE_URL?.replace(/\/$/, "") + "/api";

async function apiFetch(path: string, opts?: RequestInit) {
  const res = await fetch(API + path, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...opts?.headers },
    ...opts,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as any;
    throw err;
  }
  return res.json();
}

export default function PengaturanPage() {
  const { toast } = useToast();
  const [showToken, setShowToken] = useState(false);
  const [tokenInput, setTokenInput] = useState("");
  const [autoSend, setAutoSend] = useState(true);
  const [kpiDefault, setKpiDefault] = useState(30);

  const { data: settings, refetch: refetchSettings } = useQuery<any>({
    queryKey: ["settings"],
    queryFn: () => apiFetch("/settings"),
  });

  const { data: botStatus, refetch: refetchStatus, isLoading: checkingBot } = useQuery<any>({
    queryKey: ["bot-status"],
    queryFn: () => apiFetch("/telegram/bot-status"),
    refetchInterval: false,
  });

  useEffect(() => {
    if (settings) {
      setAutoSend(settings.autoSendOnImport ?? true);
      setKpiDefault(settings.kpiActivityDefault ?? 30);
      if (settings.telegramBotToken) {
        setTokenInput(settings.telegramBotToken);
      }
    }
  }, [settings]);

  const saveMut = useMutation({
    mutationFn: (body: object) => apiFetch("/settings", { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: () => {
      toast({ title: "Pengaturan disimpan" });
      refetchSettings();
      refetchStatus();
    },
    onError: (e: any) => toast({ title: "Gagal menyimpan", description: e.error, variant: "destructive" }),
  });

  const handleSave = () => {
    const body: any = {
      autoSendOnImport: autoSend,
      kpiActivityDefault: kpiDefault,
    };
    if (tokenInput && !tokenInput.startsWith("***")) {
      body.telegramBotToken = tokenInput;
    }
    saveMut.mutate(body);
  };

  const isTokenMasked = settings?.telegramBotToken && tokenInput === settings?.telegramBotToken && tokenInput.startsWith("***");

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center shrink-0">
          <Settings className="w-5 h-5 text-muted-foreground" />
        </div>
        <div>
          <h1 className="text-xl font-display font-bold text-foreground">Pengaturan</h1>
          <p className="text-sm text-muted-foreground">Konfigurasi integrasi bot dan parameter sistem</p>
        </div>
      </div>

      {/* Telegram Bot Token */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-3 mb-5">
          <Bot className="w-5 h-5 text-blue-500" />
          <h2 className="font-display font-bold text-base">Integrasi Telegram Bot</h2>
          {botStatus?.connected ? (
            <span className="ml-auto inline-flex items-center gap-1.5 text-xs font-bold text-green-700 bg-green-100 px-2.5 py-1 rounded-full">
              <CheckCircle2 className="w-3.5 h-3.5" /> Terhubung
            </span>
          ) : (
            <span className="ml-auto inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-secondary px-2.5 py-1 rounded-full">
              <XCircle className="w-3.5 h-3.5" /> Belum terhubung
            </span>
          )}
        </div>

        {botStatus?.connected && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm font-bold text-green-800">@{botStatus.botUsername}</p>
            <p className="text-xs text-green-700 mt-0.5">{botStatus.botName} · Siap mengirim pesan ke AM</p>
            <a
              href={`https://t.me/${botStatus.botUsername}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-green-700 font-semibold mt-1.5 hover:underline"
            >
              <ExternalLink className="w-3 h-3" /> Buka di Telegram
            </a>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">
              Bot Token (dari BotFather)
            </label>
            <div className="relative">
              <input
                type={showToken ? "text" : "password"}
                value={tokenInput}
                onChange={e => setTokenInput(e.target.value)}
                placeholder="1234567890:AAFxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                className="w-full px-4 py-2.5 pr-10 bg-secondary/50 border border-border rounded-lg text-sm font-mono focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {isTokenMasked && (
              <p className="text-xs text-muted-foreground mt-1">Token tersimpan (disamarkan). Masukkan token baru untuk mengganti.</p>
            )}
          </div>

          <div className="bg-secondary/40 rounded-lg p-3 text-xs text-muted-foreground space-y-1.5">
            <p className="font-semibold text-foreground">Cara mendapatkan token:</p>
            <ol className="list-decimal list-inside space-y-0.5 pl-1">
              <li>Buka Telegram, cari <span className="font-mono bg-secondary px-1 rounded">@BotFather</span></li>
              <li>Ketik <span className="font-mono bg-secondary px-1 rounded">/newbot</span> dan ikuti instruksi</li>
              <li>Salin token yang diberikan BotFather ke sini</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Auto-send settings */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center gap-3 mb-5">
          <Zap className="w-5 h-5 text-amber-500" />
          <h2 className="font-display font-bold text-base">Pengiriman Otomatis</h2>
        </div>

        <div className="space-y-4">
          <label className="flex items-center justify-between gap-4 cursor-pointer">
            <div>
              <p className="text-sm font-semibold text-foreground">Kirim reminder saat import data</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Bot akan otomatis mengirim pesan ke semua AM setelah data berhasil diimport
              </p>
            </div>
            <div
              onClick={() => setAutoSend(!autoSend)}
              className={cn(
                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0",
                autoSend ? "bg-primary" : "bg-secondary border border-border"
              )}
            >
              <span className={cn(
                "inline-block h-4 w-4 rounded-full bg-white shadow transition-transform",
                autoSend ? "translate-x-6" : "translate-x-1"
              )} />
            </div>
          </label>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">
              KPI Kunjungan Default per AM (per bulan)
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                value={kpiDefault}
                onChange={e => setKpiDefault(Number(e.target.value))}
                min={1}
                max={100}
                className="w-24 px-3 py-2 bg-secondary/50 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
              />
              <span className="text-sm text-muted-foreground">kunjungan/bulan</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Digunakan sebagai target KPI sales activity jika tidak diset per-AM</p>
          </div>
        </div>
      </div>

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={saveMut.isPending}
        className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/25 hover:shadow-primary/40 active:scale-[0.99] transition-all disabled:opacity-50"
      >
        {saveMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        {saveMut.isPending ? "Menyimpan..." : "Simpan Pengaturan"}
      </button>

      {/* Bot username info */}
      {botStatus?.connected && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-blue-700 mb-2">Cara AM menghubungkan akun ke bot:</p>
          <ol className="text-xs text-blue-700 space-y-1 list-decimal list-inside">
            <li>Admin buka tab "Koneksi AM" di halaman Bot Telegram</li>
            <li>Klik "Generate Kode" untuk AM yang ingin dihubungkan</li>
            <li>Bagikan kode 6 digit ke AM yang bersangkutan</li>
            <li>AM buka Telegram → cari <span className="font-mono bg-blue-100 px-1 rounded">@{botStatus.botUsername}</span> → klik Start</li>
            <li>AM kirimkan kode 6 digit ke bot</li>
            <li>Akun otomatis terhubung!</li>
          </ol>
        </div>
      )}
    </div>
  );
}
