# MISTAKES.md — running ledger

Append one entry per mistake made while working in this repo. **Newest first.**
Read this before starting work — the point is to not repeat what's below.

Entry format: date · what I did wrong · why it was wrong · the lesson/fix.

---

## 2026-07-10 — Chased exotic theories before inspecting the live page
A "scroll broken on mobile, can't scroll down" report was blamed on service-worker cache, then a
Base-UI/Radix popover scroll-lock leak — all before looking at the actual DOM/CSS. The real cause was
mundane: a native `<input type="time">` inside `grid-template-columns: 1fr 1fr` overflowed horizontally
on iOS, because grid tracks default to `min-width: auto` and the native control refuses to shrink.
**Lesson:** reproduce and measure the live DOM/CSS *first*, theorize second. Fix here was
`minmax(0, 1fr)` + `min-width: 0` on grid items.

## 2026-07-10 — Assumed Radix; this project uses Base UI
Added a "safety net" clearing Radix scroll-lock artifacts (`data-scroll-locked`, `pointer-events` on
`<body>`) on route change. But shadcn here wraps `@base-ui/react`, and Base UI Popover defaults to
`modal=false`, which never locks body scroll — so the patch was dead code, later reverted.
**Lesson:** check the actual import (`components/ui/*.tsx`) before applying a library-specific fix.

## 2026-07-10 — Left a native `<datalist>` that iOS Safari won't render
The new-appointment hospital field used `<input list="hospitals">` + `<datalist>`, which shows no
dropdown on iOS Safari — the user saw "no dropdown to select." Replaced with the shared `Combobox`.
**Lesson:** use `components/combobox.tsx` (has a `label` prop) for any picker; never `<input list>`.
Don't wrap a `Combobox` in `<label>` (its trigger is a `<button>`) — pass `label=` instead.
