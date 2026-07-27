# MISTAKES.md — running ledger

Append one entry per mistake made while working in this repo. **Newest first.**
Read this before starting work — the point is to not repeat what's below.

Entry format: date · what I did wrong · why it was wrong · the lesson/fix.

---

## 2026-07-28 — Let CLAUDE.md/README/PLAN drift ~3 weeks behind the code
Docs still said "Slice 0 (scaffold) is done", "Prisma + SQLite / better-sqlite3 adapter", and
"AI = DiffusionGemma via NVIDIA" — while the app had shipped slices 0–7, moved to Postgres/Supabase,
split AI into typhoon-8b (text) + glm-4.5v (vision), and grown LINE login, multi-patient, a risk engine
and a rights knowledge base. `.env.example` still had `DATABASE_URL="file:./dev.db"`, which would send
anyone following the README straight into a broken setup. Anyone (human or agent) trusting the docs
would have worked from a stack that no longer exists. **Lesson:** the onboarding docs are part of the
change, not a follow-up — when a commit swaps a datasource, a model, or an auth model, update
CLAUDE.md/README/.env.example in the same commit. Also found while verifying: `lib/ai.test.mts` can't
run standalone (`lib/ai.ts` imports `./risk` extensionless + the `@/lib/meds` alias), so it had been
silently non-running — a "test" nobody runs is worse than no test, because the docs claim coverage.

## 2026-07-16 — Concrete few-shot example in a prompt got echoed verbatim by the 8B model
The `organizeNarrative` prompt ended with `เช่น [{"category":"การกิน","text":"กินน้อยลง",...}]`.
End-to-end eval (`scripts/risk-eval.mts`) against `typhoon-s-thaillm-8b-instruct` showed the model
copying **"กินน้อยลง" into almost every response** regardless of input — fabricating a symptom that
wasn't said, which then falsely escalated the risk score (e.g. a benign headache → "ควรสังเกต"). Adding
a "ห้ามแต่งอาการ" rule did NOT fix it (it even dropped real content in one case). **Fix:** make the
example a schema placeholder (`"text":"<สรุปสิ่งที่เล่าจริง>"`), never a real value → the echo vanished
and 6/7 cases were correct. **Lesson:** small models copy few-shot examples literally; a concrete example
value becomes a default answer. Use placeholders in format examples, and *test extraction prompts against
the actual (small) model* — don't assume a prompt that reads well behaves well. See docs/risk-eval-results.md.

## 2026-07-16 — Overwrote `app/meds/list/actions.ts` when adding `markMedTaken`
Created the new server action by writing a fresh `actions.ts` with only `markMedTaken`, wiping
`addMedication`, `addAllergy`, `removeAllergy`, and `MedState` that other pages already imported.
Build failed on Vercel with "Export removeAllergy doesn't exist". **Lesson:** before writing a
*new* file in an existing module path, grep imports and read/git-show the current file — append
the new export, never replace the whole module unless that's explicitly intended.

## 2026-07-16 — Assumed rich-menu `?next=` reaches the app without `liff.init()`
Rich menu URIs were correct (`https://liff.line.me/{id}?next=/logs`), and middleware handled
`?next=` — but LINE's primary redirect lands on the Endpoint URL as `/?liff.state=…`, with the
deep link buried inside. Only after client `liff.init()` is `?next=` (or `/logs`) restored.
Logged-in users never hit `/enter` (where we already init LIFF), so they stayed on home.
**Lesson:** for LIFF deep links, run `liff.init()` on the endpoint entry when `liff.state` is
present; don't auth-redirect away that primary URL before init.

## 2026-07-16 — Reinvented a dropdown with raw `<datalist>` + hardcoded lists instead of the existing `Combobox`
Asked to add dropdowns to the profile edit form, I reached for a native `<input list>` / `<datalist>` and
hardcoded the สิทธิ์ and โรงพยาบาล option arrays inline — while the repo already had `components/combobox.tsx`
(a searchable shadcn `Combobox` used in `med-form.tsx`) and seeded reference tables `HealthRight` (5 สิทธิ์)
and `Facility` (58 สถานพยาบาล) holding exactly that data. Reinvented UI + duplicated data that already lived
in the DB. **Lesson:** before building an input control or hardcoding a pick-list, grep `components/` for an
existing component and `prisma/schema.prisma` for a reference table. Codified as AGENTS.md golden rule 6.

## 2026-07-14 — Used top-level await in a `tsx -e` CommonJS evaluation
The one-line smoke test failed before calling the model because `tsx -e` emitted CommonJS, where top-level
`await` is unsupported. **Lesson:** wrap async eval snippets in an async IIFE (or run an ESM file) so the
test exercises the application code instead of failing in the test harness.

## 2026-07-14 — Coupled independent model benchmarks with `Promise.all`
Ran two NVIDIA model requests in one `Promise.all` and printed only after both completed. Gemma 4 timed out
waiting for response headers after about five minutes, so the process exited before printing the Gemma 3n
result even if that request had succeeded. **Lesson:** benchmark hosted models independently (or use
`Promise.allSettled`) and persist/print each result as it arrives; always set an explicit per-request timeout.

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
