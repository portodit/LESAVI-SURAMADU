import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRupiah(value: number): string {
  if (value >= 1e12) return `Rp ${(value / 1e12).toFixed(2).replace('.', ',')} T`;
  if (value >= 1e9) return `Rp ${(value / 1e9).toFixed(2).replace('.', ',')} M`;
  if (value >= 1e6) return `Rp ${(value / 1e6).toFixed(2).replace('.', ',')} Jt`;
  return `Rp ${value.toLocaleString('id-ID')}`;
}

export function formatPercent(value: number): string {
  // Handle both decimal (0.178) and percentage (17.8) formats
  const pct = value > 1 ? value : value * 100;
  return `${pct.toFixed(2).replace('.', ',')}%`;
}

export function formatRupiahShort(value: number): string {
  if (value >= 1e12) return `Rp${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `Rp${(value / 1e9).toFixed(2)}M`;
  if (value >= 1e6) return `Rp${(value / 1e6).toFixed(2)}Jt`;
  return `Rp${value.toLocaleString('id-ID')}`;
}

export function getAchPct(value: number): number {
  return value > 1 ? value : value * 100;
}

export function getStatusColor(statusWarna: string) {
  const s = statusWarna.toLowerCase();
  if (s === 'hijau' || s === 'green') return 'bg-success/15 text-success border-success/30';
  if (s === 'oranye' || s === 'orange' || s === 'kuning' || s === 'yellow') return 'bg-warning/15 text-warning border-warning/30';
  if (s === 'merah' || s === 'red') return 'bg-destructive/15 text-destructive border-destructive/30';
  return 'bg-muted text-muted-foreground border-border';
}
