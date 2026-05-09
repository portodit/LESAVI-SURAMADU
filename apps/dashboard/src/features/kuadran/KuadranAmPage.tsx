/**
 * KuadranAmPage.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Visualizes AM performance using two quadrant charts:
 *   1. Kuadran AM DPS  — axes: Result (X) × Process (Y)
 *   2. Kuadran AM DSS  — axes: Sustain (X) × Scaling (Y)
 *
 * Quadrant logic (same for both charts):
 *   KW1 — high X & high Y  (both ACH)
 *   KW2 — low  X & high Y  (Y ACH, X not)
 *   KW3 — high X & low Y   (X ACH, Y not)
 *   KW4 — low  X & low Y   (both NOT ACH)
 *
 * Uses static dummy data with Recharts ScatterChart for the plot layer,
 * overlaid with quadrant labels drawn via SVG <text>.
 */

import React, { useState, useCallback } from "react";
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { cn } from "@/shared/lib/utils";
import { TrendingUp, Target, Award, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Types ─────────────────────────────────────────────────────────────────────

/** Represents a single AM data point in the quadrant plane. */
interface AmPoint {
  id: number;
  namaAm: string;
  /** X-axis score [0–100] */
  x: number;
  /** Y-axis score [0–100] */
  y: number;
}

/** Chart configuration (axis labels, point colors, etc.) */
interface QuadrantConfig {
  id: string;
  title: string;
  subtitle: string;
  xLabel: string;
  yLabel: string;
  /** Color tokens for each quadrant background */
  kwColors: {
    kw1: string; // top-right
    kw2: string; // top-left
    kw3: string; // bottom-right
    kw4: string; // bottom-left
  };
  /** Quadrant label texts */
  kwLabels: {
    kw1: string;
    kw2: string;
    kw3: string;
    kw4: string;
  };
  data: AmPoint[];
}

// ─── Helper: Quadrant Resolver ─────────────────────────────────────────────────

/**
 * Returns the quadrant number (1–4) for a given pair of boolean achievement flags.
 * @param xAchieved  true = ACH on X-axis
 * @param yAchieved  true = ACH on Y-axis
 */
export function getQuadrant(
  xAchieved: boolean,
  yAchieved: boolean
): 1 | 2 | 3 | 4 {
  if (xAchieved && yAchieved)   return 1; // KW1 — both achieved
  if (!xAchieved && yAchieved)  return 2; // KW2 — only Y achieved
  if (xAchieved && !yAchieved)  return 3; // KW3 — only X achieved
  return 4;                                // KW4 — none achieved
}

/** Convenience wrapper: score ≥ 100 is considered "achieved". */
function isAchieved(score: number): boolean {
  return score >= 100;
}

// ─── Dummy Data ────────────────────────────────────────────────────────────────

const DPS_DATA: AmPoint[] = [
  { id: 1,  namaAm: "RENI WULANSARI",     x: 105, y: 110 },
  { id: 2,  namaAm: "BUDI SANTOSO",       x: 85,  y: 102 },
  { id: 3,  namaAm: "DEWI RAHAYU",        x: 115, y: 90 },
  { id: 4,  namaAm: "AHMAD FAUZI",        x: 95,  y: 88 },
  { id: 5,  namaAm: "SITI NURHALIZA",     x: 102, y: 108 },
  { id: 6,  namaAm: "HENDRA GUNAWAN",     x: 88,  y: 95 },
  { id: 7,  namaAm: "LISA PERMATA",       x: 120, y: 105 },
  { id: 8,  namaAm: "RAHMAT HIDAYAT",     x: 75,  y: 80 },
  { id: 9,  namaAm: "CITRA WULANDARI",    x: 108, y: 85 },
  { id: 10, namaAm: "FAISAL MUBARAK",     x: 90,  y: 112 },
];

const DSS_DATA: AmPoint[] = [
  { id: 1,  namaAm: "AGUS SETIAWAN",      x: 110, y: 105 },
  { id: 2,  namaAm: "MIRA KUSUMAWATI",    x: 85,  y: 115 },
  { id: 3,  namaAm: "RIZKY FIRMANSYAH",   x: 102, y: 90 },
  { id: 4,  namaAm: "NURUL AINI",         x: 90,  y: 85 },
  { id: 5,  namaAm: "YUSUF RAHMAN",       x: 115, y: 120 },
  { id: 6,  namaAm: "DIAN PRATIWI",       x: 95,  y: 95 },
  { id: 7,  namaAm: "TEGUH PRABOWO",      x: 108, y: 102 },
  { id: 8,  namaAm: "PUTRI HANDAYANI",    x: 88,  y: 105 },
  { id: 9,  namaAm: "WAHYU SANTOSO",      x: 105, y: 88 },
  { id: 10, namaAm: "INDAH LESTARI",      x: 80,  y: 92 },
];

// ─── Chart Configs ──────────────────────────────────────────────────────────────

const CHARTS: QuadrantConfig[] = [
  {
    id:       "dps",
    title:    "Kuadran AM DPS",
    subtitle: "Analisis performa AM divisi DPS berdasarkan dimensi Result × Process",
    xLabel:   "Result",
    yLabel:   "Process",
    kwColors: {
      kw1: "rgba(34,197,94,0.08)",
      kw2: "rgba(234,179,8,0.08)",
      kw3: "rgba(249,115,22,0.08)",
      kw4: "rgba(239,68,68,0.08)",
    },
    kwLabels: {
      kw1: "KW1\nResult ACH\nProcess ACH",
      kw2: "KW2\nResult NOT ACH\nProcess ACH",
      kw3: "KW3\nResult ACH\nProcess NOT ACH",
      kw4: "KW4\nResult NOT ACH\nProcess NOT ACH",
    },
    data: DPS_DATA,
  },
  {
    id:       "dss",
    title:    "Kuadran AM DSS",
    subtitle: "Analisis performa AM divisi DSS berdasarkan dimensi Sustain × Scaling",
    xLabel:   "Sustain",
    yLabel:   "Scaling",
    kwColors: {
      kw1: "rgba(34,197,94,0.08)",
      kw2: "rgba(234,179,8,0.08)",
      kw3: "rgba(249,115,22,0.08)",
      kw4: "rgba(239,68,68,0.08)",
    },
    kwLabels: {
      kw1: "KW1\nSustain ACH\nScaling ACH",
      kw2: "KW2\nSustain NOT ACH\nScaling ACH",
      kw3: "KW3\nSustain ACH\nScaling NOT ACH",
      kw4: "KW4\nSustain NOT ACH\nScaling NOT ACH",
    },
    data: DSS_DATA,
  },
];

// ─── Quadrant Color Mapping for scatter points ──────────────────────────────────

function getPointColor(x: number, y: number): string {
  const xA = isAchieved(x);
  const yA = isAchieved(y);
  const kw = getQuadrant(xA, yA);
  switch (kw) {
    case 1: return "#22c55e"; // green
    case 2: return "#eab308"; // yellow
    case 3: return "#f97316"; // orange
    case 4: return "#ef4444"; // red
  }
}

// ─── Subcomponents ──────────────────────────────────────────────────────────────

/** Quadrant background SVG overlay rendered as a custom layer inside the chart */
function QuadrantBackgrounds({
  cx, cy, width, height, kwColors,
}: {
  cx: number; cy: number; width: number; height: number;
  kwColors: QuadrantConfig["kwColors"];
}) {
  const left   = cx;
  const top    = cy;
  const midX   = left  + width / 2;
  const midY   = top   + height / 2;
  const right  = left  + width;
  const bottom = top   + height;

  return (
    <g>
      {/* KW1 — top-right */}
      <rect x={midX}  y={top}  width={right - midX} height={midY - top}  fill={kwColors.kw1} />
      {/* KW2 — top-left */}
      <rect x={left}  y={top}  width={midX - left}  height={midY - top}  fill={kwColors.kw2} />
      {/* KW3 — bottom-right */}
      <rect x={midX}  y={midY} width={right - midX} height={bottom - midY} fill={kwColors.kw3} />
      {/* KW4 — bottom-left */}
      <rect x={left}  y={midY} width={midX - left}  height={bottom - midY} fill={kwColors.kw4} />
    </g>
  );
}

/** Quadrant label text nodes (each multi-line label rendered as stacked SVG <text>s) */
function QuadrantLabels({
  cx, cy, width, height, kwLabels,
}: {
  cx: number; cy: number; width: number; height: number;
  kwLabels: QuadrantConfig["kwLabels"];
}) {
  const left   = cx;
  const top    = cy;
  const midX   = left  + width / 2;
  const midY   = top   + height / 2;
  const right  = left  + width;
  const bottom = top   + height;

  const positions = {
    kw1: { x: (midX + right) / 2,  y: (top + midY) / 2   },
    kw2: { x: (left + midX) / 2,   y: (top + midY) / 2   },
    kw3: { x: (midX + right) / 2,  y: (midY + bottom) / 2 },
    kw4: { x: (left + midX) / 2,   y: (midY + bottom) / 2 },
  };

  const kwColors: Record<string, string> = {
    kw1: "#15803d",
    kw2: "#a16207",
    kw3: "#c2410c",
    kw4: "#b91c1c",
  };

  function renderLabel(key: keyof typeof positions, lines: string[]) {
    const pos = positions[key];
    const lineH = 12;
    const startY = pos.y - ((lines.length - 1) * lineH) / 2;
    return lines.map((line, i) => (
      <text
        key={i}
        x={pos.x}
        y={startY + i * lineH}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={i === 0 ? 11 : 9}
        fontWeight={i === 0 ? "800" : "500"}
        fill={kwColors[key]}
        opacity={0.75}
        fontFamily="Montserrat, Inter, sans-serif"
      >
        {line}
      </text>
    ));
  }

  return (
    <g>
      {(["kw1", "kw2", "kw3", "kw4"] as const).map(key =>
        renderLabel(key, kwLabels[key].split("\n"))
      )}
    </g>
  );
}

/** Renders a single animated scatter dot with colour determined by quadrant */
function CustomDot(props: any) {
  const { cx, cy, payload } = props;
  if (cx == null || cy == null) return null;
  const color = getPointColor(payload.x, payload.y);
  return (
    <g>
      {/* Outer glow ring */}
      <circle cx={cx} cy={cy} r={10} fill={color} opacity={0.15} />
      {/* Main dot */}
      <circle
        cx={cx} cy={cy} r={7}
        fill={color}
        stroke="white"
        strokeWidth={2}
        style={{ filter: `drop-shadow(0 0 4px ${color}80)` }}
      />
    </g>
  );
}

/** Custom tooltip shown on hover */
const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const { namaAm, x, y } = payload[0].payload as AmPoint & { x: number; y: number };
  const kw = getQuadrant(isAchieved(x), isAchieved(y));
  const kwBadge: Record<number, { bg: string; text: string; label: string }> = {
    1: { bg: "bg-green-100 dark:bg-green-900/40",  text: "text-green-700 dark:text-green-400", label: "KW1 — Both ACH" },
    2: { bg: "bg-yellow-100 dark:bg-yellow-900/40", text: "text-yellow-700 dark:text-yellow-400", label: "KW2 — Y only ACH" },
    3: { bg: "bg-orange-100 dark:bg-orange-900/40", text: "text-orange-700 dark:text-orange-400", label: "KW3 — X only ACH" },
    4: { bg: "bg-red-100 dark:bg-red-900/40",      text: "text-red-700 dark:text-red-400",    label: "KW4 — None ACH" },
  };
  const badge = kwBadge[kw];
  return (
    <div className="bg-card border border-border rounded-xl shadow-xl px-4 py-3 text-xs min-w-[190px]">
      <p className="font-bold text-foreground text-sm mb-1.5 leading-tight">{namaAm}</p>
      <div className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold mb-2", badge.bg, badge.text)}>
        {badge.label}
      </div>
      <div className="space-y-1">
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Skor X</span>
          <span className="font-semibold text-foreground">{x}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Skor Y</span>
          <span className="font-semibold text-foreground">{y}</span>
        </div>
      </div>
    </div>
  );
};

// ─── Stat Badge Row ─────────────────────────────────────────────────────────────

function QuadrantStats({ data }: { data: AmPoint[] }) {
  const counts = { kw1: 0, kw2: 0, kw3: 0, kw4: 0 };
  for (const p of data) {
    const kw = getQuadrant(isAchieved(p.x), isAchieved(p.y));
    counts[`kw${kw}` as keyof typeof counts]++;
  }
  const stats = [
    { label: "KW1", count: counts.kw1, bg: "bg-green-50 dark:bg-green-950/30",  border: "border-green-200 dark:border-green-800",  text: "text-green-700 dark:text-green-400",  icon: <Award className="w-3.5 h-3.5" /> },
    { label: "KW2", count: counts.kw2, bg: "bg-yellow-50 dark:bg-yellow-950/30", border: "border-yellow-200 dark:border-yellow-800", text: "text-yellow-700 dark:text-yellow-400", icon: <TrendingUp className="w-3.5 h-3.5" /> },
    { label: "KW3", count: counts.kw3, bg: "bg-orange-50 dark:bg-orange-950/30", border: "border-orange-200 dark:border-orange-800", text: "text-orange-700 dark:text-orange-400", icon: <Target className="w-3.5 h-3.5" /> },
    { label: "KW4", count: counts.kw4, bg: "bg-red-50 dark:bg-red-950/30",      border: "border-red-200 dark:border-red-800",     text: "text-red-700 dark:text-red-400",     icon: <AlertCircle className="w-3.5 h-3.5" /> },
  ];
  return (
    <div className="grid grid-cols-4 gap-2">
      {stats.map(s => (
        <div key={s.label} className={cn("rounded-xl border px-3 py-2 flex items-center gap-2", s.bg, s.border)}>
          <span className={s.text}>{s.icon}</span>
          <div>
            <p className={cn("text-[10px] font-black uppercase tracking-wide leading-none", s.text)}>{s.label}</p>
            <p className={cn("text-xl font-black leading-tight tabular-nums", s.text)}>{s.count}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Legend Row ─────────────────────────────────────────────────────────────────

function Legend() {
  const items = [
    { color: "bg-green-500",  label: "KW1 — Keduanya ACH" },
    { color: "bg-yellow-500", label: "KW2 — Hanya Y ACH" },
    { color: "bg-orange-500", label: "KW3 — Hanya X ACH" },
    { color: "bg-red-500",    label: "KW4 — Tidak Ada ACH" },
  ];
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-1.5">
      {items.map(item => (
        <div key={item.label} className="flex items-center gap-1.5">
          <span className={cn("w-2.5 h-2.5 rounded-full shrink-0", item.color)} />
          <span className="text-[11px] text-muted-foreground font-medium">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── QuadrantChart Component ────────────────────────────────────────────────────

/**
 * Reusable quadrant chart.
 * Uses Recharts ScatterChart with custom SVG overlays for backgrounds & labels.
 */
function QuadrantChart({ config }: { config: QuadrantConfig }) {
  const [activePoint, setActivePoint] = useState<AmPoint | null>(null);
  const [chartDims, setChartDims] = useState({ cx: 0, cy: 0, width: 0, height: 0 });

  /** Capture the actual plot area dimensions from Recharts via CustomizedXAxisTick trick */
  const ChartCustomLayer = useCallback((props: any) => {
    // Props injected by Recharts: xAxisMap, yAxisMap, offset
    const { xAxisMap, yAxisMap, offset } = props;
    if (!xAxisMap || !yAxisMap) return null;
    const xAxis = Object.values(xAxisMap as Record<string, any>)[0];
    const yAxis = Object.values(yAxisMap as Record<string, any>)[0];
    if (!xAxis || !yAxis) return null;

    const cx     = (xAxis as any).x || offset?.left  || 0;
    const cy     = (yAxis as any).y || offset?.top    || 0;
    const width  = (xAxis as any).width  || 0;
    const height = (yAxis as any).height || 0;

    // Sync state (avoid loop by comparing)
    if (chartDims.cx !== cx || chartDims.cy !== cy ||
        chartDims.width !== width || chartDims.height !== height) {
      setChartDims({ cx, cy, width, height });
    }

    return (
      <>
        <QuadrantBackgrounds
          cx={cx} cy={cy} width={width} height={height}
          kwColors={config.kwColors}
        />
        <QuadrantLabels
          cx={cx} cy={cy} width={width} height={height}
          kwLabels={config.kwLabels}
        />
        {/* Centre divider lines */}
        <line
          x1={cx + width / 2} y1={cy}          x2={cx + width / 2} y2={cy + height}
          stroke="hsl(var(--border))" strokeWidth={1.5} strokeDasharray="5,3"
        />
        <line
          x1={cx}             y1={cy + height / 2} x2={cx + width}   y2={cy + height / 2}
          stroke="hsl(var(--border))" strokeWidth={1.5} strokeDasharray="5,3"
        />
      </>
    );
  }, [config, chartDims]);

  return (
    <div className="w-full" style={{ height: 380 }}>
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 20, right: 30, bottom: 40, left: 20 }}>
          {/* Custom layer rendered BELOW the dots */}
          <ChartCustomLayer />

          <CartesianGrid
            strokeDasharray="3 3"
            stroke="hsl(var(--border))"
            opacity={0.3}
          />

          <XAxis
            type="number"
            dataKey="x"
            domain={[0, 150]}
            tickCount={7}
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))", fontFamily: "Inter, sans-serif" }}
            label={{
              value: config.xLabel,
              position: "insideBottom",
              offset: -12,
              fontSize: 12,
              fontWeight: 700,
              fill: "hsl(var(--foreground))",
              fontFamily: "Montserrat, Inter, sans-serif",
            }}
            axisLine={{ stroke: "hsl(var(--border))" }}
            tickLine={{ stroke: "hsl(var(--border))" }}
          />

          <YAxis
            type="number"
            dataKey="y"
            domain={[0, 150]}
            tickCount={7}
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))", fontFamily: "Inter, sans-serif" }}
            label={{
              value: config.yLabel,
              angle: -90,
              position: "insideLeft",
              offset: 12,
              fontSize: 12,
              fontWeight: 700,
              fill: "hsl(var(--foreground))",
              fontFamily: "Montserrat, Inter, sans-serif",
            }}
            axisLine={{ stroke: "hsl(var(--border))" }}
            tickLine={{ stroke: "hsl(var(--border))" }}
          />

          {/* ACH threshold reference lines */}
          <ReferenceLine
            x={100}
            stroke="hsl(var(--primary))"
            strokeDasharray="4 3"
            strokeWidth={1.5}
            label={{
              value: "ACH",
              position: "top",
              fontSize: 9,
              fontWeight: 700,
              fill: "hsl(var(--primary))",
            }}
          />
          <ReferenceLine
            y={100}
            stroke="hsl(var(--primary))"
            strokeDasharray="4 3"
            strokeWidth={1.5}
            label={{
              value: "ACH",
              position: "right",
              fontSize: 9,
              fontWeight: 700,
              fill: "hsl(var(--primary))",
            }}
          />

          <Tooltip
            content={<CustomTooltip />}
            cursor={{ stroke: "hsl(var(--primary))", strokeWidth: 1, strokeDasharray: "3 2" }}
          />

          <Scatter
            data={config.data}
            shape={<CustomDot />}
            onMouseEnter={(p: any) => setActivePoint(p)}
            onMouseLeave={() => setActivePoint(null)}
          />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Card wrapper for each chart ────────────────────────────────────────────────

function ChartCard({ config, index }: { config: QuadrantConfig; index: number }) {
  const divisiColor = config.id === "dps"
    ? { badge: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800" }
    : { badge: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/30 dark:text-violet-400 dark:border-violet-800" };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.12, ease: [0.4, 0, 0.2, 1] }}
      className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden"
    >
      {/* Card header */}
      <div className="px-5 py-4 border-b border-border bg-secondary/20">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <span className={cn(
                "text-[11px] font-black px-2 py-0.5 rounded-full border uppercase tracking-wider",
                divisiColor.badge
              )}>
                {config.id.toUpperCase()}
              </span>
              <h2 className="text-base font-display font-bold text-foreground">{config.title}</h2>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{config.subtitle}</p>
          </div>
        </div>

        {/* Stat row */}
        <div className="mt-3">
          <QuadrantStats data={config.data} />
        </div>
      </div>

      {/* Chart */}
      <div className="px-4 pt-5 pb-2">
        <QuadrantChart config={config} />
      </div>

      {/* Legend */}
      <div className="px-5 pb-4 pt-1">
        <Legend />
      </div>

      {/* Axis description */}
      <div className="px-5 pb-4">
        <div className="flex gap-6 text-[11px]">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <span className="w-4 h-px bg-muted-foreground/40 shrink-0" />
            <span><strong className="text-foreground">Garis ACH</strong> = skor ≥ 100</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <span>Hover titik untuk detail AM</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── AM Data Table ──────────────────────────────────────────────────────────────

function AmTable({ config }: { config: QuadrantConfig }) {
  const [expanded, setExpanded] = useState(false);

  const rows = config.data.map(p => ({
    ...p,
    kw: getQuadrant(isAchieved(p.x), isAchieved(p.y)),
  }));

  const kwStyle = {
    1: { bg: "bg-green-50 dark:bg-green-950/30",  text: "text-green-700 dark:text-green-400",  border: "border-green-200 dark:border-green-800" },
    2: { bg: "bg-yellow-50 dark:bg-yellow-950/30", text: "text-yellow-700 dark:text-yellow-400", border: "border-yellow-200 dark:border-yellow-800" },
    3: { bg: "bg-orange-50 dark:bg-orange-950/30", text: "text-orange-700 dark:text-orange-400", border: "border-orange-200 dark:border-orange-800" },
    4: { bg: "bg-red-50 dark:bg-red-950/30",      text: "text-red-700 dark:text-red-400",     border: "border-red-200 dark:border-red-800" },
  } as const;

  const PREVIEW = 4;
  const visible = expanded ? rows : rows.slice(0, PREVIEW);

  return (
    <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-border bg-secondary/20 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tabel AM</p>
          <p className="text-sm font-bold text-foreground">{config.title}</p>
        </div>
        <span className="text-xs text-muted-foreground">{rows.length} AM</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border bg-secondary/30">
              <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">#</th>
              <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Nama AM</th>
              <th className="px-4 py-2.5 text-center font-semibold text-muted-foreground">Skor {config.xLabel}</th>
              <th className="px-4 py-2.5 text-center font-semibold text-muted-foreground">Skor {config.yLabel}</th>
              <th className="px-4 py-2.5 text-center font-semibold text-muted-foreground">Kuadran</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((row, i) => {
              const style = kwStyle[row.kw as 1 | 2 | 3 | 4];
              return (
                <tr key={row.id} className="border-b border-border/50 hover:bg-secondary/20 transition-colors">
                  <td className="px-4 py-2.5 text-muted-foreground">{i + 1}</td>
                  <td className="px-4 py-2.5 font-semibold text-foreground">{row.namaAm}</td>
                  <td className="px-4 py-2.5 text-center tabular-nums">
                    <span className={cn(
                      "inline-block px-2 py-0.5 rounded-md text-[11px] font-bold",
                      isAchieved(row.x)
                        ? "bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400"
                        : "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400"
                    )}>
                      {row.x}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-center tabular-nums">
                    <span className={cn(
                      "inline-block px-2 py-0.5 rounded-md text-[11px] font-bold",
                      isAchieved(row.y)
                        ? "bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400"
                        : "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400"
                    )}>
                      {row.y}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <span className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black border uppercase tracking-wide",
                      style.bg, style.text, style.border
                    )}>
                      KW{row.kw}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {rows.length > PREVIEW && (
        <button
          onClick={() => setExpanded(v => !v)}
          className="w-full py-2 text-xs font-semibold text-primary hover:text-primary/80 hover:bg-primary/5 transition-colors border-t border-border"
        >
          {expanded ? "↑ Sembunyikan" : `↓ Lihat semua ${rows.length} AM`}
        </button>
      )}
    </div>
  );
}

// ─── Page Header ────────────────────────────────────────────────────────────────

function PageHeader() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="flex items-start justify-between gap-4"
    >
      <div>
        <h2 className="text-xl font-display font-bold text-foreground">Kuadran AM</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Visualisasi posisi Account Manager dalam matriks kuadran performa — DPS &amp; DSS
        </p>
      </div>
      <div className="shrink-0 flex items-center gap-2">
        <span className="text-[10px] font-bold text-muted-foreground bg-secondary border border-border px-2.5 py-1 rounded-full uppercase tracking-wide">
          Data Dummy
        </span>
      </div>
    </motion.div>
  );
}

// ─── Main Page Export ───────────────────────────────────────────────────────────

export default function KuadranAmPage() {
  return (
    <div className="space-y-6">
      <PageHeader />

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {CHARTS.map((cfg, i) => (
          <ChartCard key={cfg.id} config={cfg} index={i} />
        ))}
      </div>

      {/* Data Tables */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {CHARTS.map((cfg, i) => (
          <motion.div
            key={cfg.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 + i * 0.1 }}
          >
            <AmTable config={cfg} />
          </motion.div>
        ))}
      </div>
    </div>
  );
}
