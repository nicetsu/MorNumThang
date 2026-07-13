# MISTAKES.md — running ledger

Append one entry per mistake made while working in this repo. **Newest first.**
Read this before starting work — the point is to not repeat what's below.

Entry format: date · what I did wrong · why it was wrong · the lesson/fix.

---

## 2026-07-14 — Generalized an OCR speed fix from one lucky test image, shipped an accuracy regression
Swapped PaddleOCR's detection model from `PP-OCRv5_server_det` to `PP-OCRv5_mobile_det` for ~6x
speed after it read one drug-label test image correctly. On the very next image (an appointment
slip, same layout style) it returned pure garbage (`"ALELNLBMCEY"...`) — and Qwen, given garbage
OCR text, confidently hallucinated a plausible-sounding hospital name and department instead of
returning empty fields, because the prompt only said "ห้ามเดา" without covering the garbled-input
case explicitly. **Lesson:** one successful test does not validate a model swap, especially a
det/rec model, for a medical app — test with 2-3 varied real-world-shaped inputs before trusting
speed numbers. Also: always add an explicit "unreadable/garbage input → return empty, don't invent"
clause to extraction prompts, not just "don't guess" — LLMs will still confidently fill in
plausible values from garbage otherwise. **Fix:** reverted to `server_det` (`ocr-service/main.py`),
tightened both `lib/ai.ts` extraction prompts (`LABEL_SYSTEM`, `APPOINTMENT_SYSTEM`). Separately
also found the LLM did Buddhist-era year math wrong (2569-543 → 2016, not 2026) — moved that
subtraction into deterministic TS code (`buildIsoDate` in `lib/ai.ts`) instead of asking the model
to compute it, per the standing rule that safety/factual logic must be deterministic, not LLM-driven.

## 2026-07-13 — PaddleOCR 3.7 + paddlepaddle 3.3.1 crashes with mkldnn on (Windows CPU)
`PaddleOCR(lang="th").predict(img)` threw `NotImplementedError: ConvertPirAttribute2RuntimeAttribute
not support [pir::ArrayAttribute<pir::DoubleAttribute>]` on the `th_PP-OCRv5_mobile_rec` model — a bug
in this paddlepaddle build's new PIR executor + oneDNN path on CPU, not a code error.
**Fix:** construct with `device="cpu", enable_mkldnn=False` (and `os.environ["FLAGS_use_mkldnn"]="0"`
set *before* importing paddle/paddleocr — see `ocr-service/main.py`). No GPU here, so disabling mkldnn
cost no real perf. **Lesson:** if a fresh PaddleOCR install throws a PIR/oneDNN error on first predict,
try disabling mkldnn before assuming the model or image input is wrong.

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
