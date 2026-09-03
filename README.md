# PPR AI — Problem Radar

**From Complaints to Action.**
*Detect. Prioritize. Resolve. Prevent.*

An AI-powered public problem intelligence and complaint management platform for
Pakistani local government. It doesn't just collect citizen complaints — it
understands them, routes them, prioritizes them, tracks them against SLAs,
clusters duplicates into real-world "Master Problems," escalates delays up a
government chain of command, and surfaces emerging risk patterns to
leadership before they become crises.

```
Complaint → Understanding → Classification → Routing → Priority → SLA →
Resolution → Escalation → Geographic Clustering → Problem Detection →
Risk Prediction → Preventive Action
```

---

## 1. What was built

A complete, runnable full-stack application:

- **Citizen app** (mobile-first): splash → notice → language (EN/UR, full RTL) →
  login/signup → dashboard → multi-step complaint wizard (text, voice via Web
  Speech API, photo, video, mandatory map-based location, impact level) → live
  AI-analysis animation → registered complaint with receipt → complaint
  tracking with a status timeline → "Problems Near Me" map → safety alerts +
  notifications → profile.
- **Department Officer / Supervisor dashboard**: KPI command center, filterable
  complaint table, complaint detail with AI analysis, evidence, map, actions
  (accept / start work / request info / resolve with AI-assisted resolution
  verification), duplicate-detection banner, Master Problems view.
- **DC (District Command Center)**: district map with priority-colored
  markers, department performance table, SLA compliance, escalation feed,
  emergency alert composer, "Ask PPR AI."
- **CMO (Province Overview)**: cross-district map with red/orange/yellow/green
  district health, "Ask PPR AI," Predictive Problem Radar (emerging-risk
  signal detection), emergency alerts.
- **CM (Executive Overview)**: no complaint table — just an AI-generated
  executive brief, KPI cards, the risk radar, and "Ask PPR AI."
- **Admin console**: user directory and SLA-rule configuration.
- **AI service layer** (`src/lib/ai`): classification/routing/priority,
  duplicate-complaint clustering into Master Problems, predictive risk
  radar, AI-assisted resolution-evidence verification, and "Ask PPR AI" — a
  natural-language query engine that **only ever answers from real data**
  already in the database (it explicitly says so when it can't answer,
  rather than inventing a statistic).
- **Full backend**: authentication, role-based authorization enforced on
  every API route, SLA/escalation engine (Officer → Supervisor → DC → CMO →
  CM), notifications, emergency alerts, safe zones, audit logging.
- **Seed data that tells a story**: the "Area X" scenario (Model Town Sector
  4, Sialkot) — 17 clustered road-damage/flood-risk complaints with rising
  daily frequency, one Master Problem, an SLA breach with a live escalation
  chain already recorded, and an emergency flood-risk alert already issued —
  plus ~45 additional varied complaints across 7 Pakistani cities so every
  dashboard looks populated immediately after login.

## 2. Tech stack — and one honest deviation from the brief

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, Lucide
  icons, Leaflet/OpenStreetMap for maps (no Google Maps key required).
- **Backend**: Next.js Route Handlers (API routes) — no separate server.
- **Database**: **SQLite via Node's built-in `node:sqlite` module**, not
  Prisma/Postgres as originally requested. Reason: this project was built in
  a sandboxed environment whose network egress does not allow downloading
  Prisma's query-engine binary, so Prisma could not be verified as working.
  Rather than hand you unverified code, the data layer was rebuilt on
  `node:sqlite` (zero external dependencies, ships with Node 22+), which
  meant every feature described in this README could actually be run, seeded,
  and tested end-to-end before delivery. **A hand-written SQL schema
  (`scripts/schema.sql`) mirrors the relational design from the original
  spec** (users, districts, departments, complaints, complaint status
  history, master problems, escalations, notifications, emergency alerts,
  safe zones, feedback, audit logs, SLA rules) and is straightforward to port
  to Postgres/Supabase — see §8 below.
- **AI**: a deterministic, offline "Demo AI Analysis" engine is the default
  (keyword/heuristic-based classification, priority scoring, confidence
  scoring, duplicate detection, risk-trend detection) so the demo **never
  breaks** due to a missing API key or network issue. If `OPENAI_API_KEY` is
  set, complaint classification calls a real LLM instead and silently falls
  back to the deterministic engine on any error. The UI always labels which
  mode produced an analysis ("Demo AI Analysis" badge).
- **Auth**: scrypt password hashing + HMAC-signed HTTP-only session cookies
  (no third-party auth dependency, still real hashing/signing, not plaintext).

## 3. Project structure

```
/scripts/schema.sql        Raw SQL schema (SQLite now, Postgres-portable)
/scripts/seed.ts           Demo data + the "Area X" storyline
/src/lib/db/               DB client + repository (all queries live here)
/src/lib/ai/               classify, duplicate, risk, verification, askAi
/src/lib/workflow.ts       submission → routing → SLA/escalation → resolution
/src/lib/auth.ts           password hashing + session cookies
/src/lib/i18n.ts           EN/UR dictionary + RTL
/src/app/api/              all backend routes
/src/app/(citizen pages)   /citizen, /citizen/report, /citizen/complaints, ...
/src/app/officer/          department officer & supervisor dashboard
/src/app/dc/ /cmo/ /cm/    government command dashboards
/src/app/admin/            admin console
/src/components/           shared UI (badges, cards, maps, nav, AI panels)
```

## 4. Environment variables

Copy `.env.example` to `.env` (already done for you in this delivery):

| Variable | Required? | Purpose |
|---|---|---|
| `DATABASE_URL` | Yes (default provided) | SQLite file path, e.g. `file:./dev.db` (kept for compatibility; the actual DB file lives at `data/ppr.db`) |
| `SESSION_SECRET` | Recommended | HMAC secret for signing session cookies — change this for any real deployment |
| `OPENAI_API_KEY` | No | If set, complaint classification uses a live LLM call instead of the offline demo engine |
| `GOOGLE_MAPS_API_KEY` | No | Not currently wired up — the app uses Leaflet/OpenStreetMap, which needs no key. Kept as a placeholder for a future swap |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` | No | Placeholders for a future Supabase/Postgres migration (see §8) |

Never commit real secrets. `SESSION_SECRET` in `.env.example` is a demo
placeholder — replace it before any non-local deployment.

## 5. How to install and run

Requires **Node.js 22+** (for the built-in `node:sqlite` module).

```bash
npm install
npm run db:reset      # creates data/ppr.db and seeds demo data
npm run dev           # http://localhost:3000
```

For a production-style run:

```bash
npm run build
npm run start
```

`npm run db:reset` wipes and reseeds; use `npm run db:seed` to seed without
wiping an existing schema, or `tsx scripts/migrate.ts` to just (re)apply the
schema.

## 6. Demo accounts

All seeded accounts share the password: **`Demo@1234`**

| Role | Email |
|---|---|
| Citizen | `citizen@ppr.ai` |
| Department Officer | `officer@ppr.ai` |
| Department Supervisor | `supervisor@ppr.ai` |
| DC (District Command) | `dc@ppr.ai` |
| CMO | `cmo@ppr.ai` |
| CM | `cm@ppr.ai` |
| Admin | `admin@ppr.ai` |

(16 additional `citizen.demoN@ppr.ai` accounts exist as authors of the
seeded Area X complaint cluster — same password.)

Public self-signup on the landing page always creates a **Citizen** account;
government roles are provisioned via seeding/Admin, matching how a real
deployment would work.

## 7. The demo flow this build supports

1. Open the app → 5-second splash → important notice → choose **اردو** or
   English → log in as `citizen@ppr.ai`.
2. Tap **Report a Problem** → speak or type *"Hamari road par bara gaddha hai
   aur barish ke baad pani jama ho raha hai"* → attach a photo → tap the map
   to set a location in Model Town Sector 4, Sialkot (≈32.4945, 74.5229) →
   choose impact → submit.
3. Watch the AI-analysis checklist animation → see the result: **Road
   Damage · Municipal Corporation · P1 (Critical) · ~85–95% confidence · 12h
   SLA** → note the "N similar complaints detected nearby" banner (it joins
   the pre-seeded 17-complaint Area X cluster) → download the receipt.
4. Log in as `officer@ppr.ai` → see the new complaint (and the whole Area X
   queue) → open it → see the AI analysis, photo, map, and the "17 similar
   complaints... Master Problem" banner.
5. Log in as `dc@ppr.ai` → see the district map with a red/orange hotspot
   over Area X, department performance table, and a recorded escalation
   (Officer → Supervisor → DC — already breached in the seed data; submit a
   few more complaints and wait past the SLA window, or just look at the
   pre-seeded breach, to see this live).
6. Log in as `cmo@ppr.ai` → province map with district health colors → open
   the **Predictive Problem Radar** panel to see the emerging-risk signal
   for Area X → issue an **Emergency Alert** (flood risk, 5km radius).
7. Log back in as `citizen@ppr.ai` → see the flood-risk alert in
   English + Urdu under **Safety Alerts**, plus nearby demo safe zones on
   the map.
8. Log in as `cm@ppr.ai` → see the **AI Executive Brief** (generated from
   real seeded numbers, not scripted text) and ask **"Which district has
   the highest overdue complaint rate?"** — the answer is computed live
   from the database.

## 8. Migrating to PostgreSQL / Supabase for production

The schema in `scripts/schema.sql` uses portable types (`TEXT`, `REAL`,
`INTEGER`) and no SQLite-specific features beyond `datetime('now')`
defaults, so moving to Postgres means:

1. Recreate the same tables in Postgres (or feed `schema.sql` through a
   converter — the column list per table is a direct, one-to-one map).
2. Swap `src/lib/db/client.ts` for a Postgres client (e.g. `pg` or
   Supabase's JS client) and update `src/lib/db/repo.ts`'s query calls from
   the synchronous `node:sqlite` API to async Postgres calls (the function
   signatures in `repo.ts` are the seam — nothing above that layer needs to
   change).
3. If using Supabase, its built-in Auth and Storage can replace the
   hand-rolled session/upload logic in `src/lib/auth.ts` and
   `src/app/api/upload/route.ts`.
4. Point `DATABASE_URL` at the Postgres connection string and set the three
   `SUPABASE_*` variables if using Supabase.

## 9. Known limitations (by design, given hackathon scope)

- **AI is a deterministic keyword engine by default.** It's calibrated to
  handle the demo scenarios well (including mixed English/Roman‑Urdu/Urdu
  text) but isn't a trained ML model. Supplying `OPENAI_API_KEY` upgrades
  classification to a real LLM call with the same safety fallback.
- **File uploads are stored on local disk** (`public/uploads`), which is
  fine for a demo/single-instance deployment but won't survive a serverless
  or multi-instance deployment — swap for S3/Supabase Storage in production.
- **Voice-to-text uses the browser's Web Speech API**, so it only works in
  browsers that support it (Chrome/Edge) and requires an internet
  connection at the OS/browser level (Google's speech service) — there is
  no server-side transcription fallback.
- **The workflow API doesn't hard-block every theoretically-invalid status
  transition** (e.g. an officer can technically resolve a complaint that's
  still `NEEDS_REVIEW` via a direct API call) — the UI only ever exposes the
  sensible buttons for a complaint's current status, but a stricter
  server-side state machine would be a good hardening step before
  production.
- **Emergency alerts broadcast to all citizens** rather than geo-filtering
  by the alert radius — noted directly in the code as a demo simplification.
- **SLA breach/escalation is evaluated lazily** (checked whenever a
  complaint is read) rather than via a background cron job — correct for a
  demo, but a real deployment should also run a scheduled job so escalations
  fire even for complaints nobody has viewed recently.
- **`node:sqlite` is an experimental Node API** (stable enough for this use
  case, but Node prints an experimental-feature warning on startup).

## 10. Recommended deployment steps

1. Migrate to Postgres/Supabase per §8 (SQLite is great for local dev/demo,
   not for a scaled multi-instance deployment).
2. Move file uploads to object storage (S3/Supabase Storage) and swap
   `resolution_evidence`/`media_urls` URLs accordingly.
3. Set a strong, unique `SESSION_SECRET` and put the app behind HTTPS.
4. Add a scheduled job (e.g. a cron-triggered API route or a queue worker)
   to proactively run SLA/escalation checks instead of only lazily on read.
5. Deploy the Next.js app to Vercel, or containerize it (the app has no
   dependency that requires long-running server state beyond the DB
   connection).
6. If enabling live AI, set `OPENAI_API_KEY` as a server-only secret (never
   exposed to the client — it's only read in `src/lib/ai/classify.ts` on
   the server).
