# Math Collective

A competitive mathematics platform for universities. Students solve AI-generated challenges,
compete in live quizzes, check into events by QR code, earn XP and climb leaderboards.

**Live: [math-collective.onrender.com](https://math-collective.onrender.com)** · [uptime](https://stats.uptimerobot.com/lT3HeIUX4q)

React 19 + Vite 7 on the front, Express 5 + Supabase behind it, Socket.IO driving the realtime
quiz engine, Three.js for the homepage. 1,195 tests across 90 files; CI runs lint, typecheck, a
coverage gate, the build, and Playwright end-to-end before anything merges.

<!-- SCREENSHOTS — add these four PNGs to docs/screenshots/, then delete this comment
     and uncomment the block below. Capture from the live site at 1440px wide:
       home.png       the Three.js monument homepage (the whole reason this needs images)
       quiz-live.png  a live quiz mid-round, timer + leaderboard visible
       challenge.png  an AI-generated challenge with the solution editor open
       admin.png      the admin analytics dashboard

| | |
|---|---|
| ![Homepage](docs/screenshots/home.png) | ![Live quiz](docs/screenshots/quiz-live.png) |
| ![Challenge](docs/screenshots/challenge.png) | ![Admin analytics](docs/screenshots/admin.png) |
-->

## How it's built

The interesting problems here were realtime and isolation, not CRUD.

**Realtime quiz.** Socket.IO rooms keyed by session code, server-authoritative scoring with a
time bonus (`timeBonus = ((limit - taken) / limit) * points`), so the client can't fake a fast
answer. Covered by `tests/unit/socket-quiz.test.js`.

**Multi-tenancy.** Every university is a tenant, and getting isolation wrong here leaks one
school's data into another's. I test the invariant directly rather than trusting each route to
remember — see `tenant-scoping-invariant.test.js` and `certificate-tenant-scoping.test.js`.

**AI challenge generation.** Gemini primary, OpenRouter (DeepSeek) as fallback. The model's
output is not trusted: responses are stripped of code fences, the first JSON object is
extracted, and the result is rejected unless it has exactly four options and a `correct_index`
in range. Bad generations get retried, not shown to students.

## Credits

I led development — 189 of 194 commits. The Core Team portal was built by
[@dglalic](https://github.com/dglalic).

---

## Quick Start

```bash
# 1. Install dependencies (legacy-peer-deps needed for the Three.js + zustand overrides)
npm install --legacy-peer-deps

# 2. Configure environment — copy the template and fill in real values
cp .env.example .env.local

# 3. Run both servers — backend on :3000, Vite dev server on :5173
npm run dev

# Individually, if you prefer two terminals:
npm run dev:server     # nodemon backend/server.js
npm run dev:frontend   # vite on :5173 with /api + /socket.io proxied

# Production build + serve
npm run build          # builds frontend -> public/app/
npm start              # node backend/server.js serves API + built SPA
```

Open **http://localhost:5173/app/** in dev, or **http://localhost:3000/** for the built
SPA served by Express.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite 7, Tailwind CSS 3.4, Zustand 5, React Router v7 |
| 3D | Three.js 0.183, @react-three/fiber 9, @react-three/drei 10 |
| Animation | Framer Motion 12, GSAP 3.14 |
| Backend | Express 5, Socket.IO 4.7 |
| Database | Supabase PostgreSQL (multi-tenant with RLS on identity, disabled on data-plane) |
| Auth | Supabase Auth (email/password) + express-session |
| AI | OpenRouter API (DeepSeek model) — question generation, problem-statement tutor, problem-submission drafter |
| Payments | Razorpay (subscriptions) + manual UPI/QR (paid events) |
| Messaging | E2EE (ECDH-P256 + AES-GCM, keys derived from a 12-word recovery phrase) |
| Identity | Deterministic keypair + visual math sigils from a custom 2048-word wordlist |
| Social | Rich profile pages, hovercards, FriendButton state machine, public portfolios at `/u/:handle` |
| Monitoring | UptimeRobot (liveness) + Sentry (errors — optional, feature-gated) |
| Media | Cloudinary (hero video frame extraction via `so_<time>` transforms) |
| Fonts | Space Grotesk, JetBrains Mono, Outfit |

---

## Features

### Catalogue & Discovery
- **Problem-statement repository** — 365+ curated SIH / GSoC / Kaggle / MLH /
  Devfolio / Unstop / open-source problems at `/problems`. Each entry has a full
  description, a 2-3 paragraph "how to start" guide, dataset + resource links,
  and tag-based filters. Auth-gated browse — students only.
- **AI-assisted problem submission** — students paste any catalogue URL → server
  fetches the page (SSRF-guarded) → LLM drafts the catalogue fields → student
  reviews and submits → admin moderates from `/admin/moderation`.
- **Learning roadmaps** — sequenced learning paths at `/roadmaps`. Six featured
  paths shipped (GSoC prep, ICPC fundamentals, ML researcher track, full-stack
  web, GenAI tooling, Olympiad-to-Research). Any student can author + submit a
  community roadmap for moderation.
- **Bookmarks** — universal "save for later" across problems, writeups, and
  roadmaps. Personal feed at `/saved`.

### Engagement Loop
- **Interest beacons** — "🔥 I'm tackling this" toggle on every problem; counts
  + avatar strip make the catalogue feel alive.
- **Writeups + upvotes** — markdown post-mortems anchored to each problem. One
  writeup per (problem, user) — re-submit overwrites. Upvotes order the feed.
- **Per-problem AI study companion** — Socratic Q&A scoped to the current
  problem. Hints, not solutions. Shared 20/hr/user rate limit with the rest of
  the AI surface.
- **Daily Problem of the Day** — auto-rotating pick on `/dashboard` with
  per-student check-in streaks. Milestones (7, 14, 30, 50, 100, 200, 365 days)
  fire achievement notifications.
- **Notifications** — fire on writeup upvotes, new writeups on a problem you're
  interested in, streak milestones, moderation decisions (approved / rejected),
  and roadmap feature promotions.

### Public Portfolio
- **`/u/:handle`** — auth-free, share-anywhere portfolio aggregating writeups,
  projects, achievements, certificates, and completed roadmaps. Opt-in via the
  profile settings card. Designed for "paste on LinkedIn / résumé" use.

### Classic Student Features
- **Challenge Arena** — randomised questions with XP rewards/penalties and streak tracking.
- **Live Quizzes** — Socket.IO-backed real-time quiz sessions with host controls.
- **Leaderboards** — weekly, all-time, and per-event rankings.
- **Rich Profile Pages** — own + peer profiles at `/profile/:userId` with Overview,
  Achievements, Friends, and Activity tabs. Respects per-user privacy settings.
- **Identity Ceremony** — first-time E2EE setup forges a unique math sigil from a
  12-word recovery phrase. Same phrase → same identity across devices.
- **E2EE Messaging** — end-to-end encrypted chat with deterministic keys, restore flow,
  and WhatsApp-style durability across browser / device switches.
- **Friend System** — request / accept / cancel / unfriend with optimistic UI, mutual-
  friends discovery, and hovercards everywhere a name appears.
- **Certificates** — downloadable PDFs for attended events and achievements.
- **Projects** — team collaboration with voting.
- **PANDA Bot** — AI math tutor embedded in every challenge.

### For Teachers / Admins
- **Moderation queue** — `/admin/moderation` for pending community roadmaps + AI-
  drafted problem submissions. Approve / Feature / Reject inline.
- **AI Question Generator** — DeepSeek-powered MCQ generation with preview / regenerate
  / save. Bulk generation for admins.
- **Event Management** — create, edit, toggle registration, view registrations +
  attendance, CSV export, event-health metrics.
- **Paid Events** — manual UPI/QR reconciliation: teacher uploads a QR or types a VPA,
  students submit payment reference, admin verifies against their bank app. Supports
  mark-paid, reject (with reason), re-submit.
- **Data Operations** — clear attempts, reset XP, delete teams/tests, weekly reset.
- **Platform Insights** — active users, registration trends, top events, achievement
  stats, and per-event health.
- **Feature Management** — toggle platform features on/off within a subscription plan.

### Core Team Portal
- **`/core`** — separate portal for Club Asymptotes' organising team. Tasks (claim →
  submit → confirm), anonymous feedback channel, idea board, weekly meetings + RSVPs,
  trend tracking, and a member-only chat. Roster view shows roles + XP + streaks.

### For Super Admins
- **Organisation Management** — create, suspend, activate, delete orgs.
- **Subscription Plans** — Starter / Professional / Enterprise with feature-based gating.
- **Per-Org Feature Flags** — override any feature for any org from a central UI.
- **Impersonation** — log in as any org's admin for support debugging.
- **Audit Logs** — durable record of every admin action across the platform.

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | yes | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | Supabase service role key (server-only) |
| `SESSION_SECRET` | yes | Random 32+ char string — used for express-session signing |
| `FRONTEND_URL` | prod | CORS allow-list origin in production |
| `SESSION_DB_URL` or `REDIS_URL` | prod | Postgres or Redis backing store for sessions |
| `OPENROUTER_API_KEY` | feature | Enables AI question generation, PANDA tutor, per-problem study companion, and AI-assisted problem drafting |
| `CONTACT_EMAIL` / `CONTACT_APP_PASSWORD` | feature | Gmail + app password for contact form + invoice emails |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` / `RAZORPAY_WEBHOOK_SECRET` | feature | Razorpay (for org subscriptions) |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_CONTACT` | feature | Web push notifications. Generate with `node backend/scripts/generateVapidKeys.js` |
| `SENTRY_DSN` | feature | Sentry error reporting (any free-tier DSN works) |
| `PORT` | no | Server port (default 3000) |

Missing a feature-gated var? Feature silently disables at boot with a warning log. Missing
a required var in production → process exits immediately with a clear error (see
`backend/config/env.js`).

---

## User Roles

```
super_admin > admin > teacher > student
```

Higher roles inherit every lower-role permission. Protection is enforced at three layers:
`ProtectedRoute` in the router, role-specific Express middleware on each `/api/*` route,
and database-level Row Level Security policies on the identity-plane tables.

The catalogue / engagement / portfolio surfaces (problem statements, writeups,
bookmarks, roadmaps, portfolios) are deliberately cross-tenant — a SIH problem
is the same problem for a BMSIT student as for any other org's student. The
tenant-scoping invariant test (`tests/unit/tenant-scoping-invariant.test.js`)
allowlists the controllers that bypass the org-scoping proxy with a documented
reason per file.

---

## Architecture

```
Client (React 19 SPA, Vite 7)
  │ HTTPS + WebSocket
  ▼
Express 5 server (:3000)
  ├── REST API (/api/*)
  ├── Socket.IO (quiz engine, chat relays, notifications, presence)
  ├── express-session with Postgres-backed store in production
  ├── Tenant middleware — auto-injects org_id into every Supabase query on the identity plane
  ├── Auth middleware — role-based route guards
  ├── CSRF middleware — double-submit cookie pattern (csrf-csrf)
  ├── Zod validation on every mutating request body
  ├── aiLimiter (20/hr/user) — shared budget across PANDA, study companion, and problem drafter
  ├── Pino structured logging with request-ID tagging (AsyncLocalStorage)
  └── Global error handler → pino + optional Sentry capture
        │
        ▼
  Supabase PostgreSQL
  ├── 35+ tables (students, orgs, challenges, events, messages, problem_statements,
  │             problem_writeups, roadmaps, bookmarks, daily_picks, …)
  ├── Identity-plane tables: RLS enabled, default-deny
  ├── Data-plane catalogue tables: RLS disabled, cross-tenant by design (problem
  │             statements, writeups, roadmaps, bookmarks, portfolios)
  └── Service-role key for backend writes (bypasses RLS by design)
```

---

## Database

All schema lives in `backend/migrations/` as hand-written, idempotent SQL
files, numbered in the order they must run. Each file is self-contained —
`CREATE TABLE IF NOT EXISTS`, `ALTER TABLE … ADD COLUMN IF NOT EXISTS`, etc.
— so re-running them is a safe no-op.

| File | What it establishes |
|------|---------------------|
| `01_base_tables.sql` | Core: `students`, `challenges`, `attempts`, `leaderboard_weekly_winners` |
| `02_extended_columns.sql` | Profile extras — title, avatar, streaks, XP |
| `03_events_site_settings.sql` | `events`, `event_registrations`, `site_settings` |
| `04_notifications_certificates.sql` | `notifications`, `certificate_batches`, `certificates` |
| `05_profile_avatar.sql` | `avatar_config` JSON + auto-colour |
| `06_features_orgs_plans.sql` | `organisations`, `subscription_plans`, `feature_flags` |
| `07_payment_subscriptions.sql` | Razorpay subscriptions + invoices |
| `08_messaging_friendships.sql` | `friendships`, `conversations`, `messages`, `user_public_keys` |
| `09_referral_system.sql` | Referral codes + attribution |
| `10_events_upgrade.sql` | Events v2 — capacity, cover_image, categories |
| `11_notification_types.sql` | Notification category enum + filters |
| `12_qr_checkin.sql` | Event QR check-in table |
| `13_push_subscriptions.sql` | Web-push subscription rows (VAPID) |
| `14_multitenant_org_columns.sql` | `org_id NOT NULL` across tenant tables |
| `16_session_store.sql` | Postgres-backed express-session table |
| `17_rls_policies.sql` | Row-level-security default-deny on identity-plane tables |
| `18_idempotency_keys.sql` | Idempotency for payment webhooks |
| `19_paid_events.sql` | UPI/QR manual payment flow |
| `20_profile_visibility.sql` | Per-user privacy tiers for profile pages |
| `21_disable_rls_dataplane.sql` | RLS off on data-plane tables; tenant scoping moves to the controller layer |
| `22_team_events.sql` | Per-event team-up support |
| `23_event_razorpay.sql` | Razorpay auto-verify flow for paid events |
| `24_project_slides_url.sql` | Slides link on project submissions |
| `25_core_team.sql` | Core-team portal — tasks, feedback, ideas, trends |
| `26_core_meetings.sql` | Core-team meetings + RSVPs |
| `27_core_member_link.sql` | Linking core-team identity to main account |
| `28_core_chat.sql` | Core-team anonymous chat channel |
| `29_perf_indexes.sql` | Hot-query indexes (login, profile, events) |
| `30_students_last_seen_at.sql` | Presence ping column + index |
| `31_problem_statements.sql` | Catalogue table + 8 indexes + auto-updated_at trigger |
| `32_seed_problem_statements.sql` | First 41 hand-curated problems |
| `33_seed_problem_statements_v2.sql` | +125 research-backed entries (4-agent batch) |
| `34_seed_problem_statements_v3.sql` | +199 entries from deeper sources (SIH older years, GSoC archive, FOSSEE, university courses) — total 365 |
| `35_problem_engagement.sql` | `problem_interests`, `problem_writeups`, `writeup_votes` + denorm vote-count trigger |
| `36_daily_problem_streaks.sql` | `daily_picks` + `students.streak_days` / `streak_last_date` |
| `37_roadmaps.sql` | `roadmaps`, `roadmap_steps`, `roadmap_progress` + 6 seeded learning paths |
| `38_public_portfolio.sql` | `students.handle` (UNIQUE, auto-backfilled) + `public_portfolio` opt-in + headline + socials JSON |
| `39_bookmarks.sql` | Polymorphic save-for-later across problems / writeups / roadmaps |
| `40_roadmap_authoring.sql` | `roadmaps.author_id` + `is_featured` + `submission_status` (draft / pending / approved / rejected) |
| `41_problem_submissions.sql` | Pending-queue table for AI-drafted catalogue submissions |

### Applying migrations

Supabase doesn't ship a CLI migration runner by default. Two ways to apply:

1. **Supabase SQL Editor (easiest):** dashboard → **SQL Editor** → paste the
   contents of each file in order, click **Run**. Each file prints a trailing
   `SELECT` that shows row counts so you can sanity-check the apply worked.
2. **psql:** `psql "$SESSION_DB_URL" -f backend/migrations/01_base_tables.sql`
   (and so on).

The order matters — later files reference columns/tables added by earlier ones.

### Row Level Security — two-plane model

The schema is intentionally split into two planes with different RLS policies:

- **Identity plane** (students, conversations, messages, events, notifications,
  certificates, …): RLS enabled, default-deny. Org-scoped. Tenant middleware
  injects `org_id` into every read via `req.db`.
- **Data plane** (problem_statements, problem_writeups, roadmaps, bookmarks,
  daily_picks, portfolios): RLS disabled. Deliberately cross-tenant — a SIH
  problem is the same problem for every org. Controllers use raw `supabase` and
  the `tests/unit/tenant-scoping-invariant.test.js` allowlist documents why
  each cross-tenant controller is safe.

Backend writes bypass RLS via the service-role key; the frontend never talks
to Supabase directly, so no RLS policies need to account for unauthenticated
reads. If you're extending the identity plane:

```sql
ALTER TABLE your_new_table ENABLE ROW LEVEL SECURITY;
CREATE POLICY "default_deny" ON your_new_table FOR ALL USING (false);
```

### Seeding dev data

The catalogue ships with 365 problem statements + 6 learning roadmaps already
seeded across migrations 32-34 and 37 — you'll have content the moment you
apply migrations. For accounts: create an organisation + students via the SQL
editor or the admin UI after logging in for the first time.

---

## Scripts

```bash
npm start              # Production server — node backend/server.js
npm run dev            # concurrently — backend (nodemon) + frontend (vite)
npm run build          # Production frontend build → public/app/
npm run lint           # ESLint check
npm run typecheck      # TypeScript check (JSDoc + checkJs — no compile)
npm test               # Vitest run — 1195 tests
npm run test:coverage  # Vitest with coverage gate (CI)
npm run e2e            # Playwright E2E smoke tests
```

---

## Testing

**1195 tests across 90 files**:

| Layer | What it covers |
|-------|----------------|
| **Unit** | Pure logic — roles, feature flags, crypto primitives, mnemonic/sigil derivation, relationship state helpers, arena scoring, tenant-scoping invariant |
| **Integration** | Express routes via `supertest` — auth, payment, messaging, chat settings, relationship endpoints, profile aggregation, paid events, problem catalogue + engagement |
| **Component (jsdom)** | React components with mocked stores — FriendButton state machine, MessageButton, ProfileTabs, tab content, IdentityGlyph |
| **E2E (Playwright)** | 7 browser-level smoke tests against a production build — health probes, CSRF, SPA shell, security headers |

Coverage thresholds enforced in `vitest.config.js` (55 / 45 / 55 / 55 baseline, actual
numbers consistently 10+ points above). Pre-commit hook runs lint + typecheck +
`test:coverage` so regressions never reach `main`.

---

## CI / CD

GitHub Actions workflow at `.github/workflows/ci.yml`:

1. `npm ci --legacy-peer-deps`
2. `npm run lint`
3. `npm run typecheck`
4. `npm run test:coverage` (fails the job if coverage drops below threshold)
5. `npm run build`
6. `npx playwright install chromium --with-deps`
7. `npm run e2e`

Every push to `main` + every PR runs the full pipeline. Dependabot checks npm deps
weekly. A separate `security.yml` workflow runs pattern-gates + gitleaks on every PR.

---

## Deployment

### Render (recommended — free tier)

1. **New Web Service** → connect your GitHub repo.
2. **Build command:** `npm install --legacy-peer-deps && npm run build`
3. **Start command:** `npm start`
4. Add env vars from the table above.
5. First deploy takes 3–4 minutes. Hit `/api/health` to verify.

UptimeRobot pinging `/api/health` every 5 min keeps the free-tier dyno warm during
active hours.

### Other platforms

Any host that runs a persistent Node process + supports WebSockets works: Fly.io,
Railway, Oracle Cloud free VM. **Vercel does not** — the app needs a persistent Socket.IO
connection which serverless functions can't provide.

---

## Subscription Plans & Feature Flags

| Feature | Starter | Professional | Enterprise |
|---------|---------|--------------|------------|
| Arena + Leaderboard | ✓ | ✓ | ✓ |
| Events + Notifications | ✓ | ✓ | ✓ |
| Problem catalogue + Roadmaps | ✓ | ✓ | ✓ |
| Bookmarks + Public portfolios | ✓ | ✓ | ✓ |
| AI Question Generator | — | ✓ | ✓ |
| Per-problem AI study companion | — | ✓ | ✓ |
| AI-assisted problem submission | — | ✓ | ✓ |
| Certificates | — | ✓ | ✓ |
| Live Quiz | — | ✓ | ✓ |
| Team Projects | — | ✓ | ✓ |
| Achievements | — | ✓ | ✓ |
| QR Check-in | — | ✓ | ✓ |
| E2EE Messaging | — | — | ✓ |
| Referral System | — | — | ✓ |
| Advanced Analytics | — | — | ✓ |
| Custom Branding | — | — | ✓ |
| Data Export | — | — | ✓ |
| API Access | — | — | ✓ |

Super-admins can override any feature for any org from the Feature Flags UI.

---

## Monument Theme System

Every page calls `useMonument('name')` + renders `<MonumentBackground monument="name" />`.
Eight themed biomes (desert, pyramid, glacier, jungle, city, abyss, sky, magma) each set
CSS variables `--page-accent`, `--page-glow`, `--org-primary`, `--org-secondary` so
buttons and cards automatically match the current scene.

---

## License


MIT. See [LICENSE](LICENSE).
