# AGENTS.md — Binding Rules for Any Coding Agent

**Project:** Chorify — Household Operating System (Ethiopia-first, local-first)
**Stack:** Next.js 15 (App Router) + REST under `/api/v1` · Express worker (pg-boss) · PostgreSQL + Drizzle (server) · @chorify/local-db SQLite-WASM/OPFS (device store) · TanStack Query + axios + Redux Toolkit (auth slice) · Tailwind v4 · pnpm monorepo
**Full specification:** [`plan.md`](./plan.md) — the single source of truth for every product and technical decision. This file is the *rulebook*; plan.md is the *spec*. Read both before touching anything. If this file and plan.md ever conflict, plan.md wins and this file must be updated.

---

## 0. Prime directives

1. **API-only.** No direct DB access from `apps/web` UI code. No React Server Components data fetching. No server actions. Every read/write goes through `/api/v1` via axios + TanStack Query — a Flutter mobile app will consume the identical API.
2. **Modularity over cleverness.** Domain modules and feature folders are self-contained, independently removable, and integrate only through public barrels.
3. **Small commits.** One concern per commit, ≤ ~300 changed lines target, conventional messages (`feat(chores): …`, `fix(db): …`). Refactors ride alone. Commit at every green checkpoint — never accumulate multi-feature diffs. Generated artifacts (migrations, icons) commit separately.
4. **Never reintroduce removed concepts:** rewards/points/stars · leaderboards or any member ranking · loans/debt · resident/dependent classification · reject/refusal workflow · Parent/Grandparent/Adult-Child role names · silent-merge imports · cookie auth · gender-stereotyped defaults · recovery/backup codes (Google + verified-OTP only) · composite prefixed usernames (code and username are separate fields) · standalone email-field signup. Full list: plan.md §10.
5. **When unsure about PRODUCT behavior**, check plan.md §1 (decision history) and §6 (locked semantics) first; if genuinely undecided, stop and ask — never invent business rules.

---

## 1. Repository layout

```
apps/
  web/        Next.js: UI + ALL business REST under app/api/v1 (thin controllers)
  worker/     Express + pg-boss: cronjobs/queue ONLY (+ /health, /admin/* guarded by WORKER_ADMIN_TOKEN)
  trigger/    Trigger.dev tasks: external keep-alive heartbeat pinging worker /health (D100); own package.json, config dirs ./src/trigger, runs via `pnpm --filter @chorify/trigger dev:trigger` (local) or `deploy:trigger`
packages/
  core/       Pure domain: zod contracts, services, rules, errors, permissions, schedule, calendar, txt, notify
  local-db/   Device-side SQLite (WASM/OPFS): table mirrors, pending_ops queue, sync engine
  db/         Drizzle pg models (per-domain files), client, withTransaction, migrations, seed.ts
```

Dev: `pnpm dev` runs web :3000 + worker :4001 concurrently. Env: `DATABASE_URL` (both apps), `WORKER_ADMIN_TOKEN` (worker). Zod-validated at boot, fail-fast. Cron cadences sit on boundary minutes (generate-occurrences every 4h, hourly sweeps — D99); `apps/trigger` heartbeats `/health` at :50 before each boundary so the Render free worker is awake for its ticks (D100).

## 2. Backend module anatomy (`packages/core/src/modules/<domain>/`)

Domains: auth, households, people, roles, responsibilities, occurrences, routines, rooms, assets, supplies, shopping, notifications, activity, sync, portability.

Each module contains EXACTLY:
| File | Contents |
|---|---|
| `<domain>.model.ts` | drizzle model re-export/type |
| `<domain>.schema.ts` | zod wire contracts — THE source of truth shared with Flutter |
| `<domain>.rules.ts` | pure domain logic (no I/O) |
| `<domain>.service.ts` | class methods; executor-injected (`db \| tx`); multi-write ops wrapped in `withTransaction` |
| `<domain>.helpers.ts` | pure small utils |
| `<domain>.types.ts` | inferred/explicit TS types |
| `index.ts` | PUBLIC barrel — the only legal import path for other modules |

- Drizzle table definitions live in `packages/db/src/models/<domain>.model.ts` (drizzle-kit points at the folder).
- Route handlers mirror domains: `app/api/v1/<module>/…` = parse → requirePermission → service → serialize. Zero logic in controllers.
- Shared kernels, importable by anyone: `core/errors` (`AppError{code,httpStatus}` mapping 1:1 to API error codes), `core/permissions`, `core/ports` (Clock, IdGenerator, RandomSource, PasswordHasher, BlocklistChecker — DIP seams), `core/db`.
- **No stray utils/types/helpers anywhere else. Ever.**

## 3. Frontend anatomy (`apps/web/src/features/<feature>/`)

Features: chores, household, routines, home, supplies, shopping, activity, notifications, settings, print, auth, onboarding.

```
<feature>.types.ts  <feature>.schemas.ts  <feature>.helpers.ts  <feature>.endpoints.ts
api/<feature>.queries.ts    # useApiQuery-based hooks
api/<feature>.mutations.ts  # useApiMutation-based hooks (sync-aware: all mutations queue via pending_ops)
components/*                # feature-private
index.ts                    # public barrel
```

- `app/` = routing shells only.
- Cross-feature reuse goes through `components/ui/*` primitives (Button, Card, Sheet, Selector, Dropdown, Accordion, Input+validation binding, Table/Card, Toast…) configured purely by props/values.
- Generic wrappers `useApiQuery(config)` / `useApiMutation(config)` take endpoint-registry entries from `<feature>.endpoints.ts`; URLs are never hardcoded in components.
- Permission gating: `usePermission(permKey)` + `<Can I="…" a="…">` reading the permissionMap from RTK (display-only; server re-authorizes everything).

## 4. Boundaries & tooling (mechanically enforced)

- Cross-module/feature imports ONLY via barrels. ESLint: typescript-eslint strict type-checked + `eslint-plugin-boundaries` element-types (shared-kernel/module/controller/feature/ui-primitive/app) + react-hooks. Prettier + tailwindcss plugin (printWidth 100, single quotes).
- Workspace packages consume each other as TS source: `@chorify/core`, `@chorify/db` (path aliases; no dist builds).
- Tests: vitest, `packages/core` unit suite (`pnpm test`) — keep green; add tests for new pure domain logic (schedule expansion, permission resolution, grace windows, txt roundtrip).

## 5. Data layer laws

- Reads: Drizzle **relational query builder** on the injected executor (`executor.query.people.findMany({with:{role:true}})`); joins/sql only for aggregates; rows pass through `<domain>.schema.ts`.parse() at the boundary (parse, don't cast).
- Writes: transactional via `withTransaction`; unique `(ruleId, dueDate)` upsert keeps occurrence generation idempotent.
- Rule edits regenerate forward only (pending ∧ dueDate ≥ today); terminal occurrences immutable — completing/skipping non-pending → `409 ALREADY_DONE` (first-write-wins).

## 6. Auth & session (Bearer-only — no cookies)

- Signup modes: offline-local (device DB, zero credentials) · Continue-with-Google (verified email = contact; password optional) · phone-collect + password (≥6 chars + common-password denylist). No standalone email-field signup.
- Login = household code + username + password (code/username case-insensitive) or the Google button. One uniform generic error for unknown code/username/password. Postgres-backed rate limiter.
- argon2 hashes; sessions store sha256(token) only; login returns `{token, user, activePerson, household, permissionMap}`.
- axios request interceptor injects `Authorization: Bearer` + optional `X-View-As-Person-Id`; response interceptor unwraps `{data}/{error:{code,…}}`, maps codes per plan §5.8, purges session on 401.
- Identity state lives ONLY in the RTK authSlice {token,user,activePerson,household,permissionMap}, redux-persist → localStorage (Flutter: secure storage later). Server/device data lives ONLY in the local DB + TanStack Query cache.
- Profile switch / view-as exit / logout ⇒ session update + `queryClient.clear()` + reset slice. Device passcode layer (gate vs encryption split) sits on top — plan §4.12/D63.
- Owner-targeted account creation requires a phone number (R2); promoting a contactless person to owner is blocked; initial creator exempt. Recovery = Google button until SMS ships, then OTP for verified numbers only. View-as strictly read-only (`403 VIEW_AS_READONLY`). LAST_OWNER invariant intact (`409 LAST_OWNER`).

## 7. Local-first sync contract (supersedes the outbox)

- `packages/local-db` (SQLite-WASM/OPFS) is the system of record for unsynced households and the write-through store for synced ones: every mutation applies locally FIRST, queues in `pending_ops` (client uuid = idempotency key), then pushes FIFO to `/sync/push`.
- Pull via `/sync/pull?since=cursor` after push acks, reconnect, tab focus, and a 30s foreground tick; bootstrap via `/sync/bootstrap` (empty device or >90-day staleness).
- Conflicts are pure row-level Last-Write-Wins by server arrival order (resurrection allowed); losing/rejected ops produce persisted coalesced notifications; self-conflicts silent.
- `household_changes` audiences stay symbolic (members/roles/all), evaluated live at pull plus permission-domain filtering — restricted domains never reach unauthorized devices.
- Online-required ONLY: Google OAuth, registration/login, later OTP. Everything else must work offline. Stale-offline banner thresholds per plan §4.12 (warn ≥48h/25 ops, strong ≥14d/80).
- Busy/disabled discipline unchanged: pending spinners block double-fires; forms zod-validate before fire; SyncStatus chip reflects pending-op count + last sync age.

## 8. UX laws (violating these breaks the product's soul)

- Warm family aesthetic, never corporate: theme tokens in plan §5.2, Fraunces/Nunito/Noto Sans Ethiopic, emoji avatars, watermark layers, motion kit per §5.3 (check-off spring+confetti+undo, swipe-complete fallback, staggered lists).
- Today-first; universal `+`; one-tap completion with Undo toast; conversational confirmations ("Laundry completed."); empty states teach + "you can change this later".
- Person pages show finished/missed counts + breakdowns — NEVER comparative ranking.
- All copy via i18n keys (`t()`); EN + full AM parity required — an English string without its Amharic entry is a bug (typed Dict makes missing keys a compile error). Server events persist `{type,params}` keys, never prose.
- Dates via Intl locale map; Ethiopian calendar via core converter; money via dictionary label ("{amount} birr"/"{amount} ብር").

## 9. Error envelope (fixed)

`{data}` | `{error:{code,message,missingPermission?,params?}}` — codes and their exact UX behaviors frozen in plan §5.8 (UNAUTHENTICATED, PASSWORD_REQUIRED, WRONG_PASSWORD, FORBIDDEN, VIEW_AS_READONLY, NOT_FOUND, CONFLICT, LAST_OWNER, IN_USE, IMPORT_CONFLICT, IMPORT_TOO_NEW, ALREADY_DONE, VALIDATION_ERROR, RATE_LIMITED).

## 10. Before you start any task

1. `pnpm i && pnpm db:migrate && pnpm db:seed` → demo login `hana / hana1234` (seeded Bekele family fixture).
2. Locate the relevant module/feature folder; extend its anatomy files — never create parallel structures.
3. Plan your diff: which barrel exports change? which contracts change (update zod FIRST — it is the mobile contract)?
4. Implement small; test pure logic in core; `pnpm test` + typecheck green; commit per §0.3 discipline.
5. Update plan.md when a decision changes reality — decisions log (Appendix A) gets a new row, never silent drift.
