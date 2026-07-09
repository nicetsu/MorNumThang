# หมอนำทาง (Mor Num Thang) — Next.js Fullstack Rebuild Plan

Rebuild the existing static prototype (`mornumthang2/uploads/`: `index.html`, `app.js`, `styles.css`) as a Next.js
fullstack app with Tailwind + shadcn/ui, backed by a database, with AI features powered by a medical LLM
(**gemma-med 1.5** or similar) served over an OpenAI-compatible endpoint.

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
  - _ponytail: SQLite until multi-user/hosting forces Postgres — Prisma makes the swap a one-line change._
- **AI: gemma-med 1.5** via an OpenAI-compatible endpoint (Ollama locally, or a hosted inference server).
  Accessed **server-side only** through one helper + one route handler. Use the AI SDK (`ai` + `@ai-sdk/openai`
  pointed at the custom `baseURL`) so streaming and structured output are free.
- **Auth:** skip for v1 (single caregiver, single device). Add when a second user actually exists. _ponytail._
- **i18n:** Thai only, hardcoded strings. No i18n framework until a second language is real. _ponytail._

---

## 3. Data model (Prisma)

```prisma
model Patient {
  id           String   @id @default(cuid())
  name         String
  diseases     String?          // free text, "·"-separated in UI
  careGuide    String?          // editable care instructions
  createdAt    DateTime @default(now())
  weights      WeightLog[]
  meds         Medication[]
  allergies    Allergy[]
  appointments Appointment[]
  visits       VisitNote[]
}

model WeightLog    { id String @id @default(cuid()) patientId String kg Float note String? at DateTime @default(now()) patient Patient @relation(fields:[patientId], references:[id]) }
model Medication   { id String @id @default(cuid()) patientId String name String schedule String? patient Patient @relation(fields:[patientId], references:[id]) }
model Allergy      { id String @id @default(cuid()) patientId String name String patient Patient @relation(fields:[patientId], references:[id]) }
model Appointment  { id String @id @default(cuid()) patientId String at DateTime note String? done Boolean @default(false) patient Patient @relation(fields:[patientId], references:[id]) }
model VisitNote    { id String @id @default(cuid()) patientId String symptom String? medsReceived String? nextAppointment String? at DateTime @default(now()) patient Patient @relation(fields:[patientId], references:[id]) }
```

## 4. AI features (where gemma-med 1.5 plugs in)

All AI runs **server-side** through `lib/ai.ts` → one route handler `app/api/ai/route.ts`. Three uses:

1. **Doctor summary** — feed recent weights, meds, allergies, visit notes → structured Thai summary for the doctor.
2. **Health signals** — scan recent logs/notes → surface recurring concerns ("ช่วงนี้เรื่องการกินมาบ่อย").
3. **Care-guide suggestions** — given diseases + meds, suggest care-guide bullet points (caregiver edits before save).

**Safety (non-negotiable, do not simplify away):**
- System prompt states: assistant summarizes/organizes only, **does not diagnose or prescribe**.
- Every AI output renders with a visible disclaimer + "ปรึกษาแพทย์" note.
- All model calls server-side; endpoint URL + key in env, never shipped to client.
- Allergy/med conflict check stays **deterministic** (code, not the LLM) — the model never gates medication safety.

`.env`: `AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL=gemma-med-1.5`.

---

## 5. Task slices (ship in order, each independently testable)

### Slice 0 — Scaffold  ★ foundation
- [ ] `create-next-app` (App Router, TS, Tailwind).
- [ ] `shadcn init`, add: button, card, input, textarea, tabs, dialog, badge, sonner, alert.
- [ ] Prisma init + SQLite, define models above, `prisma migrate dev`, seed one patient.
- [ ] Port design tokens (colors/spacing/fonts) from `styles.css` into `tailwind.config` + `globals.css`.
- **Done when:** app boots, shows seeded patient name.

### Slice 1 — Shell & navigation
- [ ] App layout, tab bar, patient identity card, toast provider.
- [ ] Route/screen structure mirroring prototype (home, logs, meds, appointments, summary, guide, profile).
- **Done when:** all screens reachable, empty states render.

### Slice 2 — Weight logging
- [ ] Weight form (Server Action) + "all logs" list, sorted, with note.
- **Done when:** add a weight → persists → shows in list after reload.

### Slice 3 — Medications + allergies
- [ ] Allergy chips add/remove (Server Action).
- [ ] Medication add with **deterministic allergy conflict warning**.
- **Done when:** adding a med that conflicts with an allergy is blocked/warned in code.
- **Test:** `isAllergic()` unit check — conflicting name flagged, safe name passes.

### Slice 4 — Appointments + visit notes
- [ ] Create/list/complete appointments.
- [ ] Post-visit note form (symptom, meds received, next appointment).
- **Done when:** appointment lifecycle works; visit note persists.

### Slice 5 — AI: doctor summary  ★ gemma-med integration
- [ ] `lib/ai.ts` (OpenAI-compatible client → gemma-med) + `app/api/ai/route.ts` (streaming).
- [ ] "สรุปให้หมอ" screen: gather patient data → stream summary → show with disclaimer.
- **Done when:** summary streams from the model and reflects real logged data.
- **Test:** helper returns text for a mock patient; disclaimer always present in output component.

### Slice 6 — AI: health signals + care-guide suggestions
- [ ] Health-signal surfacing on home.
- [ ] Care-guide editor with AI "suggest" (caregiver edits before save).
- **Done when:** signals appear from real data; suggestions are editable, not auto-saved.

### Slice 7 — Sharing + polish
- [ ] LINE / native share of summary + appointment card (Web Share API; deterministic text fallback).
- [ ] Emergency/urgent flow, contact cards, accessibility pass (touch targets, contrast, Thai font).
- **Done when:** share works on mobile; a11y basics verified.

### Slice 8 — Deploy
- [ ] Swap SQLite→Postgres if hosting needs it, env for AI endpoint, deploy (Vercel + external gemma-med host).
- **Done when:** live URL, AI endpoint reachable server-side.

---

## 6. Out of scope for v1 (add when real)
Auth / multi-user · multi-patient · i18n · offline/PWA · push notifications · analytics.
Each is a clean add-on; none blocks v1. _ponytail: build these when a user actually needs them, not before._
