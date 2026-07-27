# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

หมอนำทาง (Mor Num Thang): a Thai elderly-care companion app. A caregiver ("ลูก") tracks a parent's ("ม้า")
weight/vitals, meds, allergies, appointments, daily observations, and health-coverage rights, and generates a
doctor-ready summary. UI is **Thai**, built for large touch targets and low-literacy users. Users enter through
**LINE** (LIFF); the original static prototype in `mornumthang2/uploads/` is still the design reference of record.

## Current state

Slices 0–7 of `PLAN.md` are built and the app is wired for Vercel + Supabase (see `vercel.json` crons).
Several features shipped that were never in PLAN.md — treat the code, not the plan, as the source of truth:

- **LINE login + LIFF** entry, rich-menu deep links, invite codes (`/join/<code>`) so relatives can co-care
- **Multi-patient** — one caregiver ↔ many ผู้รับการดูแล (m-n), plus a "โปรไฟล์ตัวเอง" record
- **Deterministic risk engine** (`lib/risk.ts`) — NEWS2 vitals + Class A/B symptoms + geriatric soft signs
- **Health-rights knowledge base** — สิทธิ/บริการ/สถานพยาบาล seeded from a spreadsheet, eligibility in code
- **Daily care calendar** (`CareTask` + `DailyCheck`) and **LINE reminder crons**
- **Photo scans** — drug labels and appointment slips read by a vision model

Anything listed as out of scope in PLAN.md §6 that isn't named above is still out of scope.

## Non-negotiable rules (from AGENTS.md / PLAN.md)

1. **Server-side AI only.** Endpoints/keys live in env. Never call the model or expose keys from a client component.
2. **The LLM never gates medical safety.** Allergy conflicts, risk banding, rights eligibility, and date math are
   deterministic code. The model summarizes, categorizes, and reads photos; it does not diagnose or prescribe.
3. **Every AI output shows the medical disclaimer** (`AI_DISCLAIMER` in `lib/ai.ts` — "ปรึกษาแพทย์…").
4. **Thai UI strings, hardcoded.** Match the prototype's gentle, reassuring tone. No i18n framework yet.
5. **Ponytail (be lazy).** Stdlib/native > dependency. Shortest working diff. Mark deliberate shortcuts with a
   `// ponytail:` comment.
6. **Reuse before building.** Searchable select → `components/combobox.tsx` (via `ComboField` /
   `MultiComboField`), never `<input list>` / `<datalist>`. Pick-list data → the seeded reference tables
   (`HealthRight`, `Facility`, `Service`, `RecommendationRule`, `Drug`), never hardcoded arrays.
   Grep `components/` and `prisma/schema.prisma` first.

## Stack

Next.js 16 (App Router, TS) · Tailwind v4 + shadcn/ui · Prisma 7 + **PostgreSQL (Supabase)** ·
AI over OpenAI-compatible endpoints, server-side only · deployed on Vercel.

**shadcn here wraps `@base-ui/react`, not Radix** — check `components/ui/*.tsx` before applying any
library-specific fix.

### Prisma 7 notes (differ from older tutorials)

- Datasource `url` lives in `prisma.config.ts`, not the schema. The runtime client needs the **pg driver
  adapter**: `lib/db.ts` exports `pgAdapter()`, used by both `lib/db.ts` and `prisma/seed.ts`.
- Generated client is at `app/generated/prisma/` (git-ignored; run `npx prisma generate` after cloning).
- **Dev and prod share one Supabase DB.** Author migrations with `migrate dev --create-only`, then
  `migrate deploy` — so the shared data isn't reset. `npx prisma db seed` is idempotent (upserts +
  `skipDuplicates`).

### AI — two independent lanes (`lib/ai.ts`)

Each lane picks a preset (baseURL + key + model as a set, so one provider's URL never gets another's model),
overridable per-value by env. Thinking is disabled on both — reasoning eats the budget and truncates short
Thai output.

| Lane | Default preset | Used for |
|---|---|---|
| TEXT (`AI_PROVIDER`) | `thaillm` / `typhoon-s-thaillm-8b-instruct` | doctor summary, health signals, care guide, rights advice, narrative organizing |
| VISION (`VISION_PROVIDER`) | `zai` / `glm-4.5v` | drug-label + appointment-slip photo scans |

An `nvidia` preset (`google/diffusiongemma-26b-a4b-it`) also exists and can be selected by env.

**The TEXT model is only 8B — assume it misbehaves and guard the output in code.** Existing guards:
`statedSigns()` drops danger signs the model invented that aren't literally in the caregiver's text;
`stripDenyRightsLines()` filters a stock hallucinated line mid-stream; `buildIsoDate()` does the พ.ศ.→ค.ศ.
math the model got wrong; every JSON parse is defensive with a fallback. Use placeholders (not real values)
in prompt format examples — a concrete example becomes the model's default answer (see MISTAKES.md).

## Where the safety logic lives

Everything that decides anything is a pure function with a `.test.mts` beside it:

| Module | Decides |
|---|---|
| `lib/allergy.ts` | `isAllergic()` — token-based med↔allergy conflict, biased to over-flag |
| `lib/risk.ts` | NEWS2 vitals score, Class A/B symptom bands, geriatric soft signs, weight-loss trend, persistence |
| `lib/severity.ts` | severity 0–10 → band/colour, `scoreLevel()`, the `LEVEL` badge copy |
| `lib/rights.ts` | สิทธิ eligibility from `RecommendationRule` rows; `"maybe"` = unparsed, never a guess |
| `lib/free-meds.ts` | the 32-อาการ free-medicine benefit + which สิทธิ grants it |
| `lib/infer.ts` | suspected-disease hints from symptom text (something to ask the doctor, not a diagnosis) |

**doctor-score** (home + `/signals`) = `Math.max` of: worst-recent observation severity · NEWS2 on vitals
≤48h · red-flag/soft-sign escalation · weight-loss trend · persistent soft signs. Bias to caution — every
track can only raise the level, never lower it. See `docs/record-system-flow.md` and `docs/risk-score-plan.md`.

## App structure

```
app/            routes + Server Actions (co-located actions.ts)
  api/ai        streaming AI: kind = summary | signals | care | rights
  api/meds/scan · api/appointments/scan    vision photo scans
  api/auth/line · api/cron/reminders       LINE login callback · daily push (vercel.json crons)
components/     app components + ui/ (shadcn over Base UI)
lib/            ai.ts · db.ts · patient.ts (cookies/scoping) · line.ts · the safety modules above
prisma/         schema.prisma, migrations, seed.ts, rights-data.json
scripts/        risk-eval.mts, severity-eval.mts (prompt evals), import_rights.py
mornumthang2/   the original static prototype — design reference
```

**Screens:** three bottom-nav tabs — บันทึก (`/`, `/logs`, `/signals`, `/calendar`, `/summary`, `/urgent`),
รักษา (`/meds`, `/appointments`, `/guide`), โปรไฟล์ (`/profile`, `/rights`). Entry and switching live outside
the tabs: `/enter`, `/patients`, `/join/[code]`.

**Auth is two cookies, no real sessions yet** (`lib/patient.ts`): `uid` = the logged-in ผู้ดูแล (`User.id`),
`pid` = the active ผู้รับการดูแล. `middleware.ts` bounces anyone without `uid` to `/enter`. Every read goes
through `getActivePatient()`, which scopes by caregiver so a stray `pid` cookie can't read someone else's
data — **use it rather than querying `patient` by id directly.**

**Design tokens** (ported from the prototype's `styles.css`, now in `app/globals.css`): `--teal #1F6E63`,
`--amber #F2A93B`, `--clay #D96C4F`, `--ivory #FAF6EF`; Sarabun font; 430px max-width app shell.
Preserve Thai copy verbatim when porting anything else from the prototype.

## Commands

```bash
npm run dev                              # dev server
npx prisma migrate dev --create-only     # author a migration (shared DB — don't reset)
npx prisma migrate deploy                # apply it
npx prisma db seed                       # idempotent seed (demo users + rights reference data)
npx prisma studio                        # inspect data
npx shadcn@latest add X                  # add a UI component (only when needed)
```

Tests are plain `node:assert` files run directly — there is no test runner and no `npm test`:

```bash
node --experimental-strip-types lib/risk.test.mts
```

Passing: `lib/{risk,severity,allergy,rights,meds}.test.mts`, `app/logs/weight.test.mts`. They're excluded
from `tsconfig.json`, so `next build` won't catch a broken one — run them yourself after touching any
safety module.

**`lib/ai.test.mts` currently doesn't run** (`ERR_MODULE_NOT_FOUND`): it imports `lib/ai.ts`, which uses
an extensionless `./risk` import and the `@/lib/meds` alias — neither resolves under bare node. This is why
`lib/risk.ts` is deliberately kept import-free. Fixing it means either extension-ful relative imports in
`lib/ai.ts` (needs `allowImportingTsExtensions` in tsconfig) or a loader that understands the alias.

## Docs to read before working

- `AGENTS.md` — golden rules + stack. **Binding**, especially the AI-safety rules.
- `PLAN.md` — the original build plan. Historical: slices 0–7 are done and the app outgrew the plan.
- `MISTAKES.md` — running ledger of past mistakes. **Read it before working, and append a new entry every
  time you make a mistake** (wrong assumption, shipped bug, wasted effort on a bad theory).
- `docs/risk-score-plan.md`, `docs/record-system-flow.md` — the risk engine's evidence + the record data flow.

## Definition of done (per slice)

Persists across reload · deterministic safety checks covered by one runnable test · AI output carries a
disclaimer · no secrets in the client bundle · matches the prototype's Thai copy and gentle tone.
