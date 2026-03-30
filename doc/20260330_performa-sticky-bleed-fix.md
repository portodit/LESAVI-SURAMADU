# PerformaPage Sticky Bleed Fix — 2026-03-30

## Problem
"AM Performance Report" section header (`sticky top-0 z-20 bg-card`) was being bled through by table body rows (e.g. CAESSAR BIO ANGGINA) when the user scrolled the Performansi page.

## Root Cause
The scroll container in `layout.tsx` had `p-4 md:p-6` padding applied uniformly on all sides, **including the top**. CSS sticky `top: 0` positions the element relative to the scroll container's **padding edge** — meaning the section header would stick 16px (mobile) or 24px (desktop) *below* the scroll container's border-top. Since the topbar ends exactly at the scroll container's border-top, this created a visible gap of 16–24px between the topbar and the sticky header. Rows that scrolled up into this gap were visible above the "stuck" header, creating the bleed effect.

## Fix
**`artifacts/telkom-am-dashboard/src/shared/layout.tsx`**

Moved the top padding from the scroll container into the `motion.div` content wrapper:
- Scroll container: `p-4 md:p-6` → `px-4 md:px-6 pb-4 md:pb-6` (no top padding)
- motion.div: `max-w-[1400px] mx-auto` → `max-w-[1400px] mx-auto pt-4 md:pt-6`

**Result:** `sticky top-0` now anchors exactly at the scroll container's border-top = right below the topbar, zero gap. No content can sneak between the topbar and a sticky section header on any page.

## Impact
- Fixes PerformaPage "AM Performance Report" section header bleed
- Also closes the same latent gap for all other pages' sticky headers (FunnelPage toolbar, ActivityPage header, etc.)
- No visual layout change — content still has the same 16/24px top spacing via motion.div padding
