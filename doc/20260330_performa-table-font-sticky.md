# PerformaPage + PresentationPage Slide 0 — Font/Weight & Sticky Headers

**Date:** 2026-03-30  
**Files changed:**
- `artifacts/telkom-am-dashboard/src/features/performance/PerformaPage.tsx`
- `artifacts/telkom-am-dashboard/src/features/performance/PresentationPage.tsx`

---

## Objective

Match the AM Performance table font/weight style to the Sales Funnel table, and add sticky AM summary row + sticky customer sub-header when a row is expanded.

---

## Font / Weight Changes (both files)

| Column | Before | After |
|---|---|---|
| Nama AM | `font-medium` | `font-black uppercase tracking-wide` |
| Divisi badge | (normal) | `font-normal normal-case` (restores lowercase for the sub-label) |
| Target CM | `text-foreground tabular-nums` | `font-bold text-foreground tabular-nums` |
| Real CM | `font-medium text-foreground tabular-nums` | `font-black text-foreground tabular-nums` |
| CM % | `font-bold` | `font-black` |
| YTD % | `font-bold` | `font-black` |
| Customer count | `text-muted-foreground font-semibold` | `font-black text-foreground` |
| Rank | `font-bold` | `font-black` |

---

## Sticky Behaviour

### New refs/states added

**PerformaPage:**
- `perfTableHeaderH` — height of the red column-header div (sticky at top = `perfSectionHeaderH`)
- `perfAmRowRef` / `perfAmRowH` — height of the first AM summary row

**PresentationPage (slide 0):**
- `perfPresentTableHeaderH` — height of the red column-header div
- `perfPresentAmRowRef` / `perfPresentAmRowH` — height of the first AM summary row

### AM row sticky (when expanded)
```
position: sticky
top: sectionHeaderH + tableHeaderH
zIndex: 10
boxShadow: 0 2px 6px rgba(0,0,0,0.08)
background: hsl(var(--card))  ← applied per-cell to override transparent
```

### Customer sub-header sticky
```
position: sticky
top: sectionHeaderH + tableHeaderH + amRowH
zIndex: 9
background: bg-rose-100  ← solid color, fully opaque
```

### overflow-x-auto removed from body div
Removing `overflow-x-auto` from the body `<div>` allows `position: sticky` inside to propagate up to the outer `flex-1 overflow-y-auto` scroll container.

### overflow-hidden → overflow-clip on customer wrapper
`overflow: clip` clips visually (honoring border-radius) without creating a scroll container, letting `position: sticky` on the customer sub-header row propagate upward.

---

## Stack-up (PerformaPage)

| Layer | sticky top |
|---|---|
| Section toolbar (search + expand all) | `0` |
| Red column header row | `perfSectionHeaderH` |
| AM summary row (when expanded) | `perfSectionHeaderH + perfTableHeaderH` |
| Customer sub-header | `perfSectionHeaderH + perfTableHeaderH + perfAmRowH` |
