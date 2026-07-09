# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Current state

**Slice 0 (scaffold) is done.** Next.js 16 (App Router, TS) + Tailwind v4 + shadcn/ui + Prisma 7/SQLite are
wired up; `npm run dev` boots and the home page shows the seeded patient. Building forward from Slice 1 (see
`PLAN.md`). The `mornumthang2/uploads/` prototype remains the design reference.

Prisma 7 notes (differ from older tutorials): datasource `url` lives in code, not the schema — the runtime
client needs the **better-sqlite3 driver adapter** (`lib/db.ts`, `prisma/seed.ts` both construct
`new PrismaClient({ adapter })`). Generated client is at `app/generated/prisma/` (git-ignored; run
`npx prisma generate` after cloning). Seed with `npx prisma db seed`.

- `mornumthang2/uploads/` — the prototype: `index.html`, `app.js`, `styles.css`. Open `index.html`
  directly in a browser to run it. This is the design reference of record for the rebuild.
- `PLAN.md` — the full build plan (data model, AI features, 8 task slices in ship order). **Read it before
  building any feature.**
- `AGENTS.md` — golden rules + target stack/commands. **Its rules are binding**, especially AI safety.

## What this is

หมอนำทาง (Mor Num Thang): a Thai elderly-care companion app. A caregiver ("ลูก") tracks a parent's ("ม้า")
weight, meds, allergies, appointments, and visit notes, and generates a doctor-ready summary. UI is **Thai**,
built for large touch targets and low-literacy users.

## Non-negotiable rules (from AGENTS.md / PLAN.md)

1. **Server-side AI only.** Model endpoint/key live in env (`AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL`). Never
   call the model or expose keys from a client component.
2. **The LLM never gates medical safety.** Allergy/med-conflict checks are deterministic code (see
   `isAllergic()` in the prototype's `app.js`). The model summarizes/organizes; it does not diagnose or prescribe.
3. **Every AI output shows the medical disclaimer** ("ปรึกษาแพทย์…").
4. **Thai UI strings, hardcoded.** Match the prototype's gentle, reassuring tone. No i18n framework yet.
5. **Ponytail (be lazy).** Stdlib/native > dependency. Shortest working diff. No auth, multi-patient, PWA, or
   i18n until real. Mark deliberate shortcuts with a `// ponytail:` comment.

## Prototype architecture (the reference to port)

Single-page, no framework. `app.js` drives everything via the DOM:

- **Screen navigation is index-based.** Each view is `<section class="screen" data-screen="N">`; `showScreen(n)`
  toggles the `.active` class. Indices are non-contiguous (2 = home/book, 5 = doctor summary, 11 = completion,
  etc.) — grep `data-screen=` in `index.html` for the map. `currentScreen` starts at 2.
- **Nested tab systems**, each its own attribute pair + setter: `data-tab`/`setBookTab`,
  `data-summary-tab`/`setSummaryTab`, `data-record-tab`/`setRecordTab`, `data-log-tab`/`setLogTab`. Toggling
  `.active` on both the tab button and its matching `[data-*-panel]`.
- **Declarative navigation** via delegated click handler: `[data-screen-link]` (+ optional `data-tab-target`,
  `data-record-target`, `data-log-target`, `data-event-target` for scroll-to-and-flash).
- **`showCompletion(...)`** is the shared success screen (11); forms call it after submit with a target screen
  to return to.
- **State is in-memory only** (e.g. `allergies` array) — nothing persists. Forms mutate DOM text directly.
  This is exactly what the rebuild replaces with Prisma persistence + Server Actions.

When porting a screen to Next.js, preserve the Thai copy verbatim and the design tokens in `styles.css`
(`:root` CSS vars: `--teal #1F6E63`, `--amber #F2A93B`, `--clay #D96C4F`, `--ivory #FAF6EF`; Sarabun font;
430px max-width app shell).

## Target stack & commands (once scaffolded — see PLAN.md Slice 0)

Next.js App Router + TS · Tailwind + shadcn/ui · Prisma + SQLite (swap to Postgres for prod, no query changes) ·
AI via the `ai` SDK against an OpenAI-compatible `gemma-med 1.5` endpoint, server-side.

```bash
npm run dev                 # dev server
npx prisma migrate dev      # apply schema changes
npx prisma studio           # inspect data
npx shadcn@latest add X     # add a UI component (only when needed)
```

## Definition of done (per slice)

Persists across reload · deterministic safety checks covered by one runnable test · AI output carries a
disclaimer · no secrets in the client bundle · matches the prototype's Thai copy and gentle tone.
