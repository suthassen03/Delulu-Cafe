# Delulu Cafe — Smart Inventory

**Less waste. Better control. Smarter purchasing.**
A Phase 1 build of the Delulu Cafe Smart Inventory & Waste Management System, by RoyalTech.

```bash
npm install
# set DATABASE_URL in .env to a Postgres connection string (Vercel Postgres,
# Supabase, Neon, or a local Postgres — this project needs a real Postgres
# database; SQLite does not work on serverless hosts like Vercel)
npm run db:push     # creates the schema in that database
npm run db:seed     # seeds Delulu Cafe demo data
npm run dev          # http://localhost:3000
```

Log in with any of the seeded accounts (password for all: `password123`):

| Email | Role | Location access |
|---|---|---|
| `owner@delulucafe.lk` | Owner | Colombo, Kandy, Jaffna |
| `manager@delulucafe.lk` | Manager | Colombo |
| `employee@delulucafe.lk` | Employee | Colombo |
| `manager.kandy@delulucafe.lk` | Manager | Kandy |
| `manager.jaffna@delulucafe.lk` | Manager | Jaffna |

---

## What is real, and what is scaffolded

Being precise about this matters more than the feature list.

| Area | Status |
|---|---|
| Multi-tenant data model, ledger-based inventory (never overwrites a balance) | **Real.** Every purchase, sale, waste record, and stock count posts to `InventoryTransaction` and updates `Ingredient.currentStock` atomically. |
| Recipe engine — ingredient consumption from sales | **Real.** Selling a product explodes its recipe (with unit conversion + prep-waste %) into per-ingredient ledger entries, live. |
| Role-based access (Owner/Manager/Employee) | **Real**, enforced server-side in `src/lib/session.ts` — not just hidden nav. Verified: an Employee hitting `/purchases` directly is redirected to `/dashboard`. |
| Multi-location support | **Real.** 3 seeded locations (Colombo, Kandy, Jaffna); combined "All Locations" view aggregates correctly; per-location stock, sales, and alerts. |
| Stock counts, variance, estimated loss | **Real,** worked example from the spec verified exactly (§11). |
| Purchasing — POs, receiving, purchase recommendations | **Real.** Recommendations are computed from actual 14-day usage + supplier lead time, not hardcoded. |
| Waste registration & analytics | **Real** — today/week/month cost, % of purchases, most-wasted ingredient, all computed from ledger data. |
| Alerts (low/critical stock, runout forecast, consumption increase, unusual waste) | **Real**, rule-based, recomputed on each Alerts/Dashboard load; deduplicated via a DB unique constraint (no duplicate-alert race). |
| Reports (8 report types, date-range filterable) | **Real**, all computed live from the same service layer as the dashboard. |
| AI Assistant | **Real**, intent-matched against ~8 question types, answers built only from live queries — never invents a number. Ships fully working with **no API key**. If `ANTHROPIC_API_KEY` is set, answers are additionally rephrased naturally by Claude (still constrained to the same computed data). |
| Daily AI summary | **Real**, computed from today's sales, open alerts, biggest usage jump, and today's waste cost. |
| i18n — English / Norwegian / Tamil | **Real**, full UI chrome coverage in all three languages (`messages/*.json`), no hardcoded strings in components. Machine-assisted translations for NO/TA — have a native speaker review before production use. |
| Audit log | **Real** for the actions wired so far (stock adjustments, purchase receipt, stock count completion, seed). Not yet on every mutation — see Known gaps. |
| Authentication | **Real** — NextAuth Credentials provider, bcrypt-hashed passwords, JWT sessions. |
| Database | **Postgres** (works on Vercel Postgres, Supabase, Neon, or any Postgres host). |
| POS/webhook integrations, CSV sales import | **Not implemented** (Phase 2, per spec §38). `Sale.source` already models `POS`/`API`/`CSV` for when this is built. |
| Real camera barcode/QR scanning | **Not implemented.** `Ingredient.sku` exists for lookup; camera scanning is Phase 2. |
| Push / WhatsApp notifications | **Not implemented.** The `Notification` model supports `PUSH`/`WHATSAPP`/`EMAIL` channels; only in-app alert display is wired up. |
| Day-of-week / seasonal demand forecasting | **Not implemented.** Forecasting is a simple trailing-average model (`src/lib/inventory/forecast.ts`), documented as a Phase 3 upgrade. |

---

## Architecture

```
prisma/schema.prisma          data model — see comments for the ledger design
prisma/seed.ts                 demo data generator (deterministic PRNG)
src/lib/inventory/             the calculation engine — pure, unit-tested functions
  units.ts                       g/kg, ml/L, pcs/pack/box conversion
  ledger.ts                      postTransaction() — the one write path for stock movement
  recipe.ts                      recipe explosion + ingredient costing
  forecast.ts                    average daily usage, days-remaining, % change
  alerts.ts                      rule-based alert evaluation
  purchasing.ts                  purchase quantity recommendation
  profitability.ts / variance.ts food-cost and stock-count variance math
src/lib/services/               DB-facing services built on the engine above
src/lib/ai/                     AI assistant intent matching + daily summary
src/i18n/                       LocaleProvider, messages, language switcher
src/app/(app)/                  the authenticated app (one folder per feature)
src/components/                 shared UI + per-feature client components
tests/                          Vitest suite for the calculation engine (27 tests)
```

**Layering rule:** pages fetch data server-side via `src/lib/services/*`, which are the
only callers of Prisma directly (besides server actions). The pure calculation functions
in `src/lib/inventory/*` never touch the database — that's what makes them unit-testable
and reusable across the dashboard, reports, alerts, and AI assistant without drift.

### Deploying to Vercel

1. Import the GitHub repo as a Vercel project.
2. Add a Postgres database to the project (Vercel Storage tab → Create Database →
   Postgres — this sets `DATABASE_URL` automatically) or point `DATABASE_URL` at your
   own Supabase/Neon instance.
3. Set `NEXTAUTH_SECRET` (a random string) and `NEXTAUTH_URL` (your deployment URL) as
   environment variables.
4. Redeploy, then run `npm run db:push && npm run db:seed` once against that
   `DATABASE_URL` (locally, with it temporarily in your `.env`) to create the schema and
   demo data.

Enums are modeled as validated strings rather than native Postgres enums (see
`src/lib/enums.ts` for the canonical value lists) — a deliberate choice that keeps this
schema portable to SQLite too, for anyone who wants a zero-setup local prototype.

---

## Verification

```bash
npm run test   # 27 tests covering unit conversion, recipe explosion, forecasting,
               # alert rules, stock-count variance, purchase recommendations, and
               # profitability — each with a worked example taken from the spec
```

Manually verified end-to-end in this build: a sale correctly decrements ingredient stock
through the recipe engine and ledger; receiving a purchase increases it; a stock count
correctly computes variance and reconciles the ledger; waste registration updates
analytics; role-based access is enforced server-side (not just hidden nav); the AI
assistant answers real questions from real data; all three languages render with no
leaked keys; and the layout works down to a ~375px mobile viewport (sidebar collapses to
a drawer, modals stay usable) for the employee-facing stock-count/waste flows.

---

## Known gaps

Honest list, in priority order for a production build:

1. **Audit log coverage.** Wired for the highest-value mutations (stock adjustments,
   purchase receipt, stock count completion, ingredient creation); not yet on every
   single mutation (e.g. recipe edits, user creation).
2. **AI assistant is English-only** for question parsing (intent matching is keyword-based
   against English phrasing), regardless of the UI's display language.
3. **Forecasting is a simple moving average** — no day-of-week or seasonal weighting yet.
4. **No real POS/barcode/push-notification integrations** — Phase 2 per the spec's own
   priority ordering (§38). The data model (`SaleSource`, `Ingredient.sku`,
   `NotificationChannel`) is already shaped for them.
5. **Norwegian and Tamil translations are AI-assisted**, not reviewed by a native speaker.
6. **Single business per deployment.** The schema supports multi-tenant `Business` rows,
   but there's no tenant switcher UI — this build seeds and serves exactly one business.
