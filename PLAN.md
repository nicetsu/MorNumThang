# หมอนำทาง (Mor Num Thang) — Next.js Fullstack Rebuild Plan

> **Status: slices 0–8 are built and the app is live; this is now a historical document.** The app has outgrown the plan
> (LINE login, multi-patient, a deterministic risk engine, a health-rights knowledge base, a daily care
> calendar, photo scans). **The code is the source of truth** — see CLAUDE.md for what actually exists,
> and §7 below for what shipped beyond this plan. Kept for the reasoning behind each slice.

Rebuild the existing static prototype (`mornumthang2/uploads/`: `index.html`, `app.js`, `styles.css`) as a Next.js
fullstack app with Tailwind + shadcn/ui, backed by a database, with AI features over an OpenAI-compatible endpoint.

The app helps a caregiver ("ลูก") track an elderly parent's ("ม้า") health: weight, meds, allergies, appointments,
doctor-visit notes, and generate a doctor-ready summary. UI is Thai, large-touch, low-literacy-friendly.

---

## 1. Scope from the prototype

Screens/features already in the prototype that must carry over:

| Feature | What it does |
|---|---|
| Home / book | Landing, patient identity card, tab nav |
| Weight log | Record weight + note, view all logs |
| Medications | Pick from med list, schedule, allergy warnings |
| Allergies | Add/remove allergy chips, block conflicting meds |
| Appointments | Create appointment, appointment list, reminders |
| Visit notes | After a visit: symptom, meds received, next appointment |
| Health signals | Highlight recurring issues (e.g. eating problems) |
| Urgent / emergency | Calm-down flow, emergency + contact cards |
| Doctor summary | **AI**: compile logs into a summary for the doctor |
| LINE share | Share appointment card / summary to LINE |
| Care guide | Editable care instructions per patient |
| Profile / identity | Name, diseases, edit history |

**New in the rebuild:** persistence (DB, not localStorage), multi-device, and 3 AI-assisted flows (below).

---

## 2. Tech stack (lazy defaults)

- **Next.js (App Router)** — one app, route handlers + **Server Actions** for mutations. No separate API server.
- **Tailwind + shadcn/ui** — `card`, `button`, `input`, `textarea`, `dialog`, `tabs`, `badge`, `toast (sonner)`,
  `alert`. Add components on demand (`npx shadcn@latest add ...`), not upfront.
- **Prisma + SQLite** to start (one file, zero infra). Swap the datasource to Postgres later without code changes.
  - _✅ done, and the swap happened: now **Postgres on Supabase**, one DB shared by dev and prod. The Prisma
    query code was indeed unchanged — only the datasource + driver adapter (`pgAdapter()` in `lib/db.ts`)._
- **AI** via an OpenAI-compatible endpoint, **server-side only**, through one helper + one route handler.
  - _✅ done, but as **two lanes** rather than one model: TEXT (`thaillm`/typhoon-8b) for Thai text and
    VISION (`zai`/glm-4.5v) for photo scans. One model good at both didn't materialize. Thinking disabled
    on both. A `nvidia`/diffusiongemma preset is still selectable by env._
- **Auth:** skip for v1 (single caregiver, single device). Add when a second user actually exists. _ponytail._
  - _Superseded: a second user became real. Now **LINE login (LIFF)** + invite codes, still cookie-based
    (`uid`/`pid`) with no server sessions — see `lib/patient.ts`, `middleware.ts`._
- **i18n:** Thai only, hardcoded strings. No i18n framework until a second language is real. _ponytail._
  - _✅ still true._

---

## 3. Data model (Prisma)

**Superseded — read `prisma/schema.prisma`.** The five models sketched here (`Patient`, `WeightLog`,
`Medication`, `Allergy`, `Appointment`, `VisitNote`) all exist with the fields below plus more, and the
schema has since grown to 16 models in three groups:

- **People & care:** `User`, `Patient` (m-n caregivers, invite code, self-profile), `WeightLog` (+ vitals:
  systolic/diastolic/pulse/temp/spo2), `Medication` (+ dose/perDay/whenTime/remaining), `Allergy`,
  `Appointment`, `VisitNote`, `Observation` (the AI-categorized narrative record: category · text ·
  severity · signs)
- **Daily calendar:** `CareTask`, `DailyCheck`
- **Reference/lookup (seeded, no patient relation):** `Drug`, `HealthRight`, `Service`, `Agency`,
  `Facility`, `RecommendationRule`, `RequiredDoc`

## 4. AI features

All AI runs **server-side** through `lib/ai.ts` → `app/api/ai/route.ts` (streaming) and the two scan routes.
The three planned uses all shipped, plus three more:

1. **Doctor summary** — recent weights, meds, allergies, observations, visit notes → Thai summary for the doctor.
2. **Health signals** — scan recent logs/notes → surface recurring concerns ("ช่วงนี้เรื่องการกินมาบ่อย").
3. **Care-guide suggestions** — given diseases + meds, suggest care-guide bullets (caregiver edits before save).
4. **Narrative organizing** (`organizeNarrative`) — a free-text story → categorized observations with a
   severity and canonical sign tags, shown for review before anything is saved.
5. **Rights advice** — one sentence on how to use their สิทธิ for the current symptom. Eligibility and
   direction are decided in code; the model only phrases it.
6. **Photo scans** — drug labels (`structureDrugLabel`) and appointment slips (`structureAppointmentSlip`)
   read by the VISION lane into structured fields the caregiver confirms.

**Safety (non-negotiable, do not simplify away):**
- System prompt states: assistant summarizes/organizes only, **does not diagnose or prescribe**.
- Every AI output renders with a visible disclaimer + "ปรึกษาแพทย์" note.
- All model calls server-side; endpoint URL + key in env, never shipped to client.
- Allergy/med conflict check stays **deterministic** (code, not the LLM) — the model never gates medication safety.
  _This grew well past allergies: risk banding, rights eligibility, and พ.ศ.→ค.ศ. date math are all
  deterministic too, and the model's extracted danger signs are filtered against the caregiver's literal
  text (`statedSigns`). See CLAUDE.md "Where the safety logic lives"._

`.env`: see `.env.example` — two lanes (`AI_PROVIDER`/`THAILLM_API_KEY`, `VISION_PROVIDER`/`ZAI_API_KEY`).

---

## 5. Task slices (ship in order, each independently testable)

### Slice 0 — Scaffold  ★ foundation — ✅ done
- [x] `create-next-app` (App Router, TS, Tailwind).
- [x] `shadcn init`, add components on demand (Base UI under the hood, not Radix).
- [x] Prisma init, define models, migrate, seed. _(SQLite at first; now Postgres/Supabase.)_
- [x] Port design tokens (colors/spacing/fonts) from `styles.css` into `globals.css`. _(Tailwind v4 — CSS
      vars in `globals.css`, no `tailwind.config`.)_

### Slice 1 — Shell & navigation — ✅ done
- [x] App layout, tab bar, patient identity card, toast provider. → `app/layout.tsx`, `components/app-header.tsx`,
      `components/bottom-nav.tsx`
- [x] Route/screen structure mirroring the prototype. _(Three bottom-nav tabs: บันทึก / รักษา / โปรไฟล์.)_

### Slice 2 — Weight logging — ✅ done
- [x] Weight form (Server Action) + "all logs" list, sorted, with note. → `app/logs/`
- Grew beyond the plan: vitals (ความดัน/ชีพจร/อุณหภูมิ/SpO₂) feed NEWS2 in `lib/risk.ts`.
- **Test:** `app/logs/weight.test.mts`

### Slice 3 — Medications + allergies — ✅ done
- [x] Allergy chips add/remove (Server Action). → `app/meds/add/allergy-form.tsx`
- [x] Medication add with **deterministic allergy conflict warning**. → `lib/allergy.ts`
- Grew beyond the plan: drug-label photo scan, dose/schedule fields, `Drug` catalog pick-list.
- **Test:** `lib/allergy.test.mts`, `lib/meds.test.mts`

### Slice 4 — Appointments + visit notes — ✅ done
- [x] Create/list/complete appointments. → `app/appointments/`
- [x] Post-visit note form (symptom, meds received, next appointment).
- Grew beyond the plan: appointment-slip photo scan; visit-note follow-ups wire into meds/appointments/care guide.

### Slice 5 — AI: doctor summary — ✅ done
- [x] `lib/ai.ts` + `app/api/ai/route.ts` (streaming). _(Two lanes, not one model — see §2.)_
- [x] "สรุปให้หมอ" screen: gather patient data → stream summary → show with disclaimer. → `app/summary/`
- **Test:** `lib/ai.test.mts` exists but currently can't run standalone — see CLAUDE.md "Commands".

### Slice 6 — AI: health signals + care-guide suggestions — ✅ done
- [x] Health-signal surfacing on home. → `components/health-signals.tsx`, `app/signals/`
- [x] Care-guide editor with AI "suggest" (edited before save, never auto-saved). → `app/guide/`

### Slice 7 — Sharing + polish — ✅ done
- [x] Share of summary + appointment card (Web Share API; text fallback). → `components/share-button.tsx`
- [x] Emergency/urgent flow, contact cards. → `app/urgent/`, `components/header-urgent.tsx`
- [ ] Formal accessibility pass — touch targets and Thai font are in place, but contrast/AT verification
      was never done as a deliberate step. _Open._

### Slice 8 — Deploy — ✅ done, live
- [x] SQLite → Postgres (Supabase), env for AI endpoints, Vercel deploy config + crons (`vercel.json`).
- [x] **Live at https://bdi-bkk.vercel.app** — LINE login + LIFF working against the real deployment,
      16 migrations applied to Supabase, cron endpoint verified (auth + query, `preview=1` mode).
- [ ] VISION lane still unfunded, so photo scanning is offline. _Open — see `docs/deployment.md`._
- Environment specifics, the env-var matrix, and three deployment traps already hit are documented in
  **`docs/deployment.md`** rather than here.

---

## 6. Out of scope for v1 (add when real)

| | Status |
|---|---|
| Auth / multi-user | **Built** — LINE login (LIFF) + invite codes; still cookie-based, no server sessions |
| Multi-patient | **Built** — one caregiver ↔ many ผู้รับการดูแล, switch at `/patients` |
| Push notifications | **Built** — LINE push via `/api/cron/reminders` (morning + evening rounds) |
| Offline/PWA | Partial — manifest + service worker registered; no offline data story |
| i18n | Still out of scope (Thai only, hardcoded) |
| Analytics | Still out of scope |

_ponytail: the three that got built did so because a real user needed them — that's the bar for the rest too._

---

## 7. Shipped beyond this plan

- **Deterministic risk engine** (`lib/risk.ts`, `docs/risk-score-plan.md`) — NEWS2 vitals, Class A/B symptom
  bands with danger signs, geriatric soft signs, weight-loss trend, persistence. Feeds the doctor-score,
  which takes `Math.max` across tracks (bias to caution).
- **Narrative record** (`app/logs/narrative-record.tsx`, `docs/record-system-flow.md`) — tell a story, the
  model sorts it into categories + severity + sign tags, the caregiver reviews before it's saved.
- **Health-rights knowledge base** — สิทธิ/บริการ/สถานพยาบาล/กฎการแนะนำ seeded from a spreadsheet
  (`prisma/rights-data.json` via `scripts/import_rights.py`); eligibility decided in `lib/rights.ts`,
  the 32-อาการ free-medicine benefit in `lib/free-meds.ts`. Surfaced at `/rights` and inline on home.
- **Daily care calendar** (`/calendar`, `CareTask` + `DailyCheck`) — meds and recurring care tasks checked off per day.
- **Prompt evals** (`scripts/risk-eval.mts`, `scripts/severity-eval.mts`, `docs/risk-eval-results.md`) —
  run these against the real model when changing an extraction prompt; the 8B model behaves differently
  than the prompt reads.
