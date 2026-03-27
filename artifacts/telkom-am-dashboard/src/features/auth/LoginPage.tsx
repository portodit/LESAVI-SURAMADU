import React, { useState } from "react";
import { useAuth } from "@/shared/hooks/use-auth";
import { useLocation } from "wouter";
import { Loader2, Eye, EyeOff, Lock, User } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { login, user, isLoading: isAuthLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  React.useEffect(() => {
    if (user && !isAuthLoading) {
      setLocation("/dashboard");
    }
  }, [user, isAuthLoading, setLocation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      await login({ email, password });
    } catch {
      setError("Email atau password salah. Silakan coba lagi.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isAuthLoading) return null;

  return (
    <div className="min-h-screen w-full flex font-sans">
      {/* ── Left panel — form ───────────────────────────────────── */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 sm:px-14 lg:px-16 py-12 bg-white">
        {/* Logo */}
        <div className="mb-10">
          <div className="flex items-center gap-3.5">
            <img
              src={`${import.meta.env.BASE_URL}logo-tr3.png`}
              alt="Logo TR3"
              className="h-12 object-contain"
            />
            <div className="leading-tight">
              <p className="text-base font-bold text-gray-800 tracking-wide uppercase">LESA VI · WITEL SURAMADU</p>
              <p className="text-[11px] font-semibold tracking-[0.15em] text-[#cc0000] uppercase">AM Performance Dashboard</p>
            </div>
          </div>
        </div>

        {/* Heading */}
        <div className="mb-7">
          <h1 className="text-3xl font-display font-bold text-gray-900 mb-2">Masuk ke Dashboard</h1>
          <p className="text-sm text-gray-500">Selamat datang kembali. Masukkan kredensial Anda untuk melanjutkan.</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5 max-w-sm">

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
              {error}
            </div>
          )}

          {/* Email */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Email</label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@telkom.co.id"
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-[#cc0000] focus:ring-4 focus:ring-red-50 transition-all"
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-11 py-3 rounded-xl bg-gray-50 border border-gray-200 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-[#cc0000] focus:ring-4 focus:ring-red-50 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl text-sm font-bold text-white bg-[#cc0000] hover:bg-[#b50000] active:scale-[0.98] shadow-lg shadow-red-200 focus:outline-none focus:ring-4 focus:ring-red-100 transition-all disabled:opacity-60 disabled:cursor-not-allowed mt-2"
          >
            {isLoading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Masuk...</>
            ) : (
              "Masuk ke Dashboard"
            )}
          </button>
        </form>

        {/* Footer */}
        <p className="mt-10 text-xs text-gray-400">
          &copy; {new Date().getFullYear()} Telkom Indonesia · TREG 3 Suramadu · LESA VI
        </p>
      </div>

      {/* ── Right panel — image + overlay + copy ───────────────── */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden flex-col justify-between">
        <img
          src={`${import.meta.env.BASE_URL}telkom-building.webp`}
          alt="Telkom Building"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#8B0000]/80 via-[#cc0000]/60 to-[#1a0000]/90" />

        {/* Top badge */}
        <div className="relative z-10 p-8">
          <span className="text-xs font-bold text-white/80 tracking-[0.2em] uppercase bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full border border-white/20">
            TELKOM INDONESIA · TREG 3
          </span>
        </div>

        {/* Center copy */}
        <div className="relative z-10 px-10 pb-12">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-0.5 bg-red-300"/>
            <span className="text-xs font-bold text-red-200 tracking-[0.15em] uppercase">WITEL SURAMADU · LESA VI</span>
          </div>
          <h2 className="text-4xl font-display font-black text-white leading-tight mb-4">
            Pantau Performa.<br/>Raih Target.
          </h2>
          <p className="text-sm text-white/70 leading-relaxed mb-8 max-w-sm">
            Dashboard terpadu untuk monitoring Account Manager — revenue, funneling, activity, dan reminder otomatis via Telegram.
          </p>
          <div className="flex items-end gap-8">
            <div>
              <p className="text-2xl font-black text-white">30+</p>
              <p className="text-xs text-white/60 mt-0.5">Account Manager</p>
            </div>
            <div>
              <p className="text-2xl font-black text-white">4</p>
              <p className="text-xs text-white/60 mt-0.5">Divisi Aktif</p>
            </div>
            <div>
              <p className="text-2xl font-black text-white">✓</p>
              <p className="text-xs text-white/60 mt-0.5">Update Real-time</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
