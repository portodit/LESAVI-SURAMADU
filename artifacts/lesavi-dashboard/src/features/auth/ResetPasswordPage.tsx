import React, { useState } from "react";
import { useLocation } from "wouter";
import { Loader2, Lock, CheckCircle2, AlertCircle } from "lucide-react";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";

export default function ResetPasswordPage() {
  const [, setLocation] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState({ type: "", message: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setStatus({ type: "error", message: "Konfirmasi password tidak cocok" });
      return;
    }

    setIsLoading(true);
    setStatus({ type: "", message: "" });

    try {
      const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
      const res = await fetch(`${BASE}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mereset password");
      setStatus({ type: "success", message: "Password berhasil diperbarui! Silakan login kembali." });
      setTimeout(() => setLocation("/login"), 3000);
    } catch (err: any) {
      setStatus({ type: "error", message: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-[#cc0000] mx-auto mb-4" />
          <h1 className="text-2xl font-bold">Token Tidak Valid</h1>
          <p className="text-muted-foreground mt-2">Link reset password tidak valid atau sudah kedaluwarsa.</p>
          <Button variant="link" onClick={() => setLocation("/login")} className="mt-4 text-[#cc0000]">Kembali ke Login</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#f9fafb]">
      <div className="w-full max-w-md bg-white p-8 rounded-3xl shadow-xl border border-gray-100">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#cc0000]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-[#cc0000]" />
          </div>
          <h1 className="text-2xl font-bold text-[#101828]">Reset Password</h1>
          <p className="text-sm text-[#6a7282] mt-2">Silakan masukkan password baru Anda.</p>
        </div>

        {status.type === "success" ? (
          <div className="text-center py-4 animate-in fade-in zoom-in duration-300">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <p className="font-semibold text-green-700">{status.message}</p>
            <p className="text-sm text-muted-foreground mt-2">Mengarahkan Anda ke halaman login...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#344054] uppercase tracking-wider ml-1">Password Baru</label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="h-11 rounded-xl" required minLength={8} />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#344054] uppercase tracking-wider ml-1">Konfirmasi Password</label>
              <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" className="h-11 rounded-xl" required />
            </div>

            {status.type === "error" && (
              <div className="bg-red-50 text-[#b42318] text-xs font-medium px-4 py-3 rounded-xl border border-red-100 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" /> {status.message}
              </div>
            )}

            <Button type="submit" disabled={isLoading} className="w-full h-11 bg-[#cc0000] hover:bg-[#a30000] rounded-xl font-bold shadow-lg shadow-[#cc0000]/20">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Reset Password
            </Button>
            
            <Button type="button" variant="ghost" onClick={() => setLocation("/login")} className="w-full text-xs text-muted-foreground hover:text-[#cc0000]">Batal</Button>
          </form>
        )}
      </div>
    </div>
  );
}
