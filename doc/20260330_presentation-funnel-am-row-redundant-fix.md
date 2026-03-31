# PresentationPage Sales Funnel — Redundant AM Name Row Fix — 2026-03-30

## Problem
In slide 2 of `/presentation` (Detail Funnel per AM table), expanding an AM row showed the AM's name header row **once per phase**. An AM with 5 phases (F1–F5) would show "SAFIRINA FEBRYANTI DSS | TOTAL 9 LOP" 5 times — once above each DAFTAR PROYEK row — instead of just once at the top.

## Root Cause
In `renderAmTablesFS()`, the expanded state renders one `<table>` per phase. Each phase's `<thead>` contained **two rows**:
1. Row 1: AM name + TOTAL LOP (lines 1166–1174)
2. Row 2: DAFTAR PROYEK {phase} label

Since Row 1 was rendered inside every phase's `<thead>` with no `phaseIdx` guard, an AM with N phases produced N copies of the AM name row.

The original design intent: sticky `<thead>` per phase keeps both rows anchored during scroll. But this caused visual redundancy when all phases are visible simultaneously.

## Fix
**`artifacts/telkom-am-dashboard/src/features/performance/PresentationPage.tsx`**

Wrapped Row 1 (AM name row) in a `phaseIdx === 0` guard:
```jsx
{/* BEFORE — shown for every phase */}
<tr ref={amIdx===0&&phaseIdx===0?fsFunnelAmRowRef:undefined} ...>
  ...AM name row...
</tr>

{/* AFTER — only shown for the first phase */}
{phaseIdx===0&&(
  <tr ref={amIdx===0?fsFunnelAmRowRef:undefined} ...>
    ...AM name row...
  </tr>
)}
```

Also added a thin `borderTop: 1px solid hsl(var(--border))` to phase rows with `phaseIdx > 0` to create clean visual separation between phase sections.

## Result
- AM name appears exactly once at the top of each expanded AM block (above F1)
- DAFTAR PROYEK F2, F3, F4, F5 rows appear cleanly without repeating the AM name
- The sticky thead still functions correctly for F1's combined header
- Phase separators (thin border) keep the phases visually distinct
