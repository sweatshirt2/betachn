# Chorify — Master Plan & Decision Record

**Project:** Household Operating System + Household-Only Financial Tracker (first market: Ethiopia)
**Working directory:** `/home/bekur/Desktop/vibes/chorify` (empty except this file — no code written yet)
**Document status:** Planning complete; awaiting user's execution command. This file is the single source of truth. It supersedes all prior chat context — a fresh session must be able to continue planning or start implementing from here alone.
**Canonical internal copy:** session-local `local://chorify-mvp-plan.md` (slug `chorify-mvp`). Keep byte-identical when editing.

---

## 0. How a New Session Should Use This Document

1. Read the whole file top-to-bottom before doing anything.
2. Check **§1 Decision History** — every choice below is traceable to an explicit user answer; do not relitigate settled questions unless the user reopens them.
3. Check **§10 Explicitly Rejected / Removed** — never reintroduce these (rewards/points, leaderboards/ranking, loans/debt, resident/dependent classification, refusal workflow, silent-merge imports, etc.).
4. If continuing planning: work the **§13 Open Items / Future Backlog**, update this file, keep the local copy in sync.
5. If implementing: follow **§12 Implementation Order** strictly; prove work with **§11 Verification**. Do not scaffold anything until the user says execute.
6. Known harness issue: the plan-approval device (`xd://propose`) has been failing with "No plan is awaiting approval" (see **Appendix B**) — approvals have been happening via direct user commands in chat instead.
7. Reference convention: **CN §n** refers to section *n* of the original concept note (summarized in §2 below with its numbering preserved).

---

## 1. Decision History — Full Iteration Log (questions asked, answers given, outcomes)

This section preserves the collaboration history verbatim-in-substance. A fresh session must treat these answers as binding user intent.

### Turn 1 — Initial request (user)
Build a Next.js fullstack application with a **minimal Express backend that handles cronjobs and worker queues if necessary**, based on the attached concept note (Household OS + household-only financial tracker, Ethiopian-localized, local-first). Iterate on the idea in depth. UI requirements stated upfront:
- Mobile-first; must also adapt to landscape/wide screens.
- Intuitive household-themed UI — warm family feel, **not corporate**.
- Micro-interactions, animations, background watermark-like themes.
- A mobile app will come later ⇒ **no direct DB queries inside server pages, no React Server Components data fetching, no server actions — all client data via TanStack Query against an API**.

### Turn 2 — Assistant exploration + first scope questions
Found: empty directory, Node v22.12.0, pnpm 10.33.2, Linux. Asked three questions; user answered:

| Question | Options offered | **User's choice** |
|---|---|---|
| v1 module scope | Foundation only / Foundation+Home ops / Foundation+Finance / Everything Ph1–4 | **Foundation + Home operations** |
| Database | SQLite / PostgreSQL | **PostgreSQL** |
| PWA/offline posture | none / installable manifest / offline-first cache | **Installable manifest** |

### Turn 3 — First plan written (`chorify-mvp`)
Full technical plan produced (stack, schema, permissions, jobs, API, frontend). Submission to the approval device failed repeatedly with: *"No plan is awaiting approval — xd://propose only accepts a plan title while plan mode is active."* Three payload formats tried (slug:/title: pair, `Title [slug]`, bare slug) — all rejected identically. Issue reported to `xd://report_issue`; acknowledged ("Noted, thanks!") but never fixed. User said "go on"; more identical failures.

### Turn 4 — User: "cover the gray areas; lock down domain business logic and services"
Assistant locked 14 engineer-decidable rules directly into the plan (now codified in §6): forward-only rule regeneration; occurrence-level temporary reassignment; household-wide claimable chores; completion authorization by permission (not just assignees); single-satisfies for multi-assignee; undo window; timezone day-boundaries; age handling; archive-not-delete with IN_USE guard; supplies state machine; purchase idempotency; localized server events as `{type, params}` keys (never prose — so EN/አማርኛ both render historical entries); centralized notification-recipient resolver; stable rotation anchoring. Schema fixes from spec re-read: subtask assignees (CN §37), `createdByPersonId` on responsibilities/rules (needed for "assigning person alerted", CN §44), occurrence `subtaskStates`.

Then asked 3 genuine product forks. **User's answers (binding):**
1. **Identity on shared devices:** *"can locally change profile, and we should configure accounts as passwordless or with password if shared on the same device — e.g. can switch to children without password if configured; switching back to parents should ask password."* Plus: *"make it work in browsers, with service workers, not just installed as PWA — should also work while in a browser."*
   ⇒ Adopted: per-person credential states (passwordless quick-switch profiles vs credentialed accounts), password-gated profile switching; service-worker offline shell upgraded from manifest-only.
2. **Amharic:** **Full AM dictionary** across all screens (not partial, not EN-only).
3. **Deployment:** **Dev scripts only** (no Docker/compose deliverable).

### Turn 5 — User: "review every design decision; surface gray areas; write plan.md in this directory"
Assistant reviewed all rulings, locked 17 more by stated default (user invited objections; none came):
downtime backfill; multiple assignment-rules per responsibility; pending-only mutations; skip gated by `complete`; assign-again prefill; overdue-vs-missed distinction; Today sort order; routines carry no scheduling power; subtasks auto-complete on occurrence completion; self-service password change; person-delete cascades account+sessions; login rate limit 5/min; import version ≤ current major; import owner-seat identity mapping; calendar preference moved to device-level (CN §86/§79); money label via dictionary; `responsibilities.icon` column.

Four genuine forks were asked. **User's answers:**
- View-as mode → **Read-only preview** (recommended option accepted).
- Reminder delivery → **One digest notification per person** (accepted recommendation).
- Outage backfill → user challenged the premise (see next entry).
- Missed display → user supplied their own richer rule (see next entry).

### Turn 6 — Scenario explanations exchanged (important reasoning record)
User asked: *"how could this happen? there is no self-hosted usage on the online service; on the offline mode, if a user once loads the page no connection will be needed or it should work — would this still be an issue?"*
⇒ **Architectural clarification adopted:** Hosting is **ours, always-on** (web + worker + Postgres on our infrastructure) — users never self-host, so client offline states cannot create occurrence-generation gaps; generation is server-side. The 3-day-gap scenario only applies to our own infrastructure downtime ⇒ generator backfill retained **purely as downtime insurance**, invisible in normal operation.
⇒ **Offline contract upgraded** per user's expectation ("once loaded, works without connection"): persisted query cache (IndexedDB) serves reads; **writes queue in an IndexedDB outbox and auto-replay on reconnect** — replacing the earlier weaker "cached shell, mutations disabled" draft. §59's promise becomes literal.

User's missed-display ruling (adopted verbatim as policy): *"missed is shown for one more day if daily, one more week if weekly, one more day if one-time, then goes back to history. History can be filtered by member, action, chore etc. Analytics exist per member — finished chores and detailed breakdowns."* ⇒ cadence-based grace-window table (§6), filterable history, per-member analytics. Combined with the standing invariant: **no cross-member ranking** (CN §69–70).

Assistant also discovered a design flaw during this exchange and fixed it in-plan: because chore granularity is whole days (CN §39) and the sweeper runs hourly, a permanent red "Overdue" section on Today would sit empty ~23h/day ⇒ Today redesigned as **Today cards + subdued Missed strip (grace window) + Attention + Coming up**.

### Turn 7 — User confirmations + new feature request
1. Offline access understanding confirmed.
2. Per-person page: show finished chores, missed chores, how many missed, how many finished, "rewards given" etc. — **per-person facts, never ranking criteria**.
3. New feature: **printable options for chores and weekly schedules per member** — "so they can pin a paper on the refrigerator."

Asked two forks; user then **interjected with priority: "let's remove rewards"** (supersedes everything on that thread) and answered printables:
- **Rewards: REMOVED entirely.** No rewards, no points, no star economy. Person page shows finished count and missed count (week/month) + trend sparkline + breakdown by responsibility/routine — plain contribution facts only. (Rewards had never entered the schema; nothing to unwind.)
- **Printables:** allow **anyone with the permission** (not just owner) to print **weekly chores per member or for all members**, with optional time labels, and — user's emphasis — *"make sure we have sensible defaults so they don't have to configure everything, just customize if they want to; the goal is to move out of their way if not needed."*

⇒ Printables locked (full spec in §5.6): permission-gated `/print` preview, zero-config defaults, single Customize expander (week, members, bucket-labels, checkboxes), dedicated print stylesheet.

### Turn 8 — Diff-integrity question (user)
User asked why the browser-walkthrough verification line appeared "removed". Verified on disk: nothing lost — line existed intact; the `-255` gutter was the old copy inside a replace-diff. Old→new mapping recorded: offline check upgraded (disabled-mutations → outbox replay scenario), view-as gained "any write attempt blocked", `/print` checks added; everything else verbatim.

### Turn 9 — Current directive (this document)
*"Write the plan fully inside plan.md… every implementation decision and business decision… including the questions we asked each other and the responses… detailed enough to make any new session pick it up and keep planning or implement with no context loss… no code or starting the project yet."*

### Turn 10 — Technical & infra conventions directive (user)
User set binding engineering laws for all future code: modular backend folders per domain (db models, service classes, zod validation layers, domain rules, exceptions); frontend `features/` folders owning components, validation schemas, tanstack query/mutation api, types; `app/` remains routing-only; **no direct DB access / server actions anywhere — everything via API** because a Flutter mobile app comes later; reusable axios + generic useQuery/useMutation wrappers with URLs pre-registered; axios interceptors handle auth; **Redux Toolkit** holds token/auth/profile basics persisted to local (later secure) storage; reusable permission helpers; scoped Express; local Postgres; **transaction-wrapped mutations** for atomicity; modules must be independently updatable/removable yet integrable; **no stray types/helpers/utils outside their own module files** (`.types.ts`/`.helpers.ts`/`.schema.ts`/`.service.ts`/`.rules.ts` convention). Four sub-decisions settled by Q&A: **Bearer-token-only transport (no cookies)** for mobile readiness · Redux = **auth/session slice only** · boundaries **enforced by ESLint**, not just convention · **clear all TanStack caches** on profile switch / view-as exit. Axios replaces ky in the stack.
### Turn 11 — Five technical threads locked (Q&A)
Assistant proposed, user decided: **completion conflicts = first-write-wins** (`409 ALREADY_DONE`, history stays truthful) · **error-code set expanded + UX map frozen** (adds VALIDATION_ERROR 422, RATE_LIMITED 429, ALREADY_DONE 409) · **workspace TS strategy = internal TS-source packages** (`@chorify/core`, `@chorify/db` consumed as source; Next transpiles; worker under tsx) · **Drizzle reads = relational-first** (typed `relations()` everywhere; joins/sql only for aggregates; zod-parse at service boundary) · **offline outbox = allowlist** after a worked-example deep-dive: six self-contained idempotent mutation types queue offline, everything else disables-with-hint. User amendments on the allowlist: **cap raised to ~100** (soft warning at 80, oldest-evicted with visible notice), plus two laws — **loading/disabled button discipline** everywhere and an explicit **idempotency stack** (client-intent uuid header + local dedupe + convergent server semantics).

---

## 2. Product Definition — Complete Requirements Digest (from the original concept note)

> This section preserves the product requirements that drive every decision below. Numbering references the concept note (**CN §n**). Nothing here may be silently narrowed.

### 2.1 Core concept
- One sentence (CN §1): *a local-first household operating system that helps people organize responsibilities, family coordination, shopping, home maintenance, and household finances, while optionally connecting the entire household across devices.*
- Progression: Local → Connected → Collaborative → Adaptive/Intelligent.
- Feel: a **quiet household assistant** — reduces mental load. Answers: What needs to happen? Who should do it? What has happened? What needs buying/paying? What's coming? What needs attention?
- Central philosophy (CN §2): the household owns its data; works completely without internet; free tier needs no cloud; household exportable as portable `.txt`; paid tier adds synchronization — never artificially cripples the free tier. **Free = private/local household. Paid = connected household.**

### 2.2 The household is the root entity (CN §3)
Everything belongs to a HOUSEHOLD: People; Family roles/relationships; Ownership; Permissions; Responsibilities; Assignments; Routines; Tasks/occurrences; Home (Rooms, Assets, Maintenance); Resources (Supplies, Shopping, Purchases); Finances (Income, Expenses, Accounts, Bills/commitments, Budgets, Savings/goals); Calendar/events; Activity/history; Devices; Notifications. A household may contain one person or many; household ≠ family structure.

### 2.3 People & identity (CN §§4–32)
- Person ≠ account (CN §4). PERSON = household identity + optional account + 0..n devices. A child exists without an account today and can become a connected user later **without losing household identity** (CN §28, §76).
- One person may belong to **multiple households** in connected mode (CN §6) — future-phase concern; v1 is single-household-per-install (recorded assumption, §9).
- **No resident/non-resident/dependent classification** (CN §7) — default: people in the household are family/household members; extended relationships and custom definitions supported.
- **Family relationships** (CN §8): Father, Mother, Son, Daughter, Brother, Sister, Cousin, Aunt, Uncle, Grandfather, Grandmother, In-law, Other family, Custom — user-typed free text matters ("Older cousin", "Auntie").
- **Family roles** (CN §9–18) — presets exactly: Father, Mother, Grandfather, Grandmother, Guardian, Adult, Teenager, Responsible Child, Child, Supervised Child, Family Member, Custom. There is **no** Parent/Grandparent/Adult-Child role (explicitly removed). Father/Mother/Grandfather/Guardian are first-class visible roles. Guardian is an ordinary built-in role with sensible defaults — no special "guardian system". **Every role is customizable**, including built-ins. Every role has **Reset to default**: built-ins restore factory defaults; custom roles restore the **create-time snapshot** of their permissions (CN §17). Role descriptions optional; creating a role = name → save (frictionless, CN §15).
- Roles are **permission presets** (CN §19): assigning a role grants its permissions unless person-specific overrides exist. **Ownership authority is separate from displayed identity** (CN §20–22): any role can be configured as the **owner-permission role**; everyone holding that role gains owner permissions (e.g., Hana and Sara both "Guardian", both owners). Owner never has to display "Owner"; UI may say "Hana has full household access."
- **Permission precedence (CN §23, invariant 11): person-specific override > role configuration.** Configuration experience: "What can this role do?" then "What is different for this person?"
- **Permission domains (CN §24):** Household/membership (view people, add, invite, remove, manage roles, manage ownership, configure permissions); Responsibilities (view, create, assign, reassign, manage routines, complete, view completion history); Finances (view finances, view/create/edit expenses, view/manage accounts, view/manage budgets, manage savings/goals); Home (view assets, manage assets, manage maintenance); Resources (manage supplies, manage shopping, manage purchases).
- Permission UX stays simple (CN §26, §50–51): friendly role preset first; advanced matrix hidden behind Customize; explain permissions with real examples ("Can assign chores — can assign 'Take out the trash' to another family member").
- **Age** (CN §29): simple "How old are they?" onboarding; birthDate long-term so age progresses naturally. **Sex** limited to Male/Female (CN §30). Age/sex **never determine permissions** (CN §31, invariant 12); they inform suggestions only (CN §32: age 5 → toys/laundry; 10 → bed/trash; 15 → laundry/shopping help).

### 2.4 Responsibilities (CN §§33–44)
- "Responsibility" > "task" (CN §33): something the household needs handled (clean kitchen, laundry, groceries, trash, pay electricity, maintain washing machine).
- Can be household-wide (CN §34), individually assigned (CN §35), multi-assignee (CN §36), with subtasks carrying their own assignees (CN §37: Vacuum→Alice, Dust→Bob, Shelves→Child).
- Assignment types (CN §38): Permanent; Recurring ("every Monday"); Rotating ("Alice and Bob alternate weekly"); Temporary ("next two weeks"); One-time; Household-wide ("somebody handle this").
- Scheduling (CN §39): smallest unit = **day**. Support daily, every-N-days, weekly, every-N-weeks, monthly, specific dates, temporary ranges, rotations. Hour/minute granularity explicitly future.
- Assignment authority (CN §40–41): owners assign; delegation possible (Responsible Child assigns selected responsibilities to younger children); self-assignment allowed with permission.
- Completion (CN §42): timestamp, optional note, optional image proof. **No refusal workflow** (CN §43): complete / skip / miss only. Skips/misses alert owner/assigner per notification prefs and enter history (CN §44).

### 2.5 Home & operations (CN §§45–50)
Routines organize responsibilities (morning/evening/weekly/monthly buckets). Rooms (kitchen, bedroom, …, custom). Assets (fridge, washer, TV, car…). Maintenance flows asset → due → service → expense(future). Supplies with states Available / Running low / Out. Shopping chain: supply low → shopping list → purchase → replenish → record expense (expense recording is deferred with the finance module; the rest is v1).

### 2.6 Finance (CN §§51–61) — **deferred module** (v1 reserves permission keys only)
Scope when built: income, expenses ("I spent X on Y" first), categories (Food/Groceries, Housing, Utilities, Transportation, Education, Healthcare, Communication, Household supplies, Clothing, Family support, Savings, Entertainment, Other — households add their own), optional accounts (cash/bank/mobile money/savings/credit), simple+detailed modes, financial privacy by permission, assigned money (child gets 500 birr for groceries, records bread/milk/eggs, remainder tracked; actual spending becomes the household expense), bills/commitments lifecycle, budgets vs actual, savings goals. **No loan/debt concept anywhere.**

### 2.7 Calendar, activity, assistant (CN §§62–64)
Household calendar aggregates responsibilities, bills, maintenance, shopping, appointments, dates, events (does not replace personal calendars). Activity reads like a story ("Hana assigned laundry to Abebe"), obeys permissions. The assistant is a behavior layer (not foundation): attention/due/overdue/coming/low/spending-signals/patterns/suggestions — proactive but quiet. v1 ships its deterministic subset (Today aggregation, low-supply prompts, backup nudges, age-progressions later); ML-ish patterns belong to Phase 10.

### 2.8 Free local tier (CN §§65–69)
Local username+password account; no online account needed. Multi-person household managed on one device per permissions. **No automatic multi-device sharing in free tier** — moving happens via household copy file (export → transfer → open). TXT must be structured, parsable, human-readable, portable, copyable, **versioned** (CN §68). **Conflicting imports are BLOCKED — never merged, never overwritten, never guessed** (CN §69, invariant 6).

### 2.9 Paid connected tier (CN §§70–82) — future phases
Online account + subscription + sync + multi-user/multi-device + collaboration + notifications/reminders + financial alerts + device management. Local→connected migration keeps existing data ("Connect this household", not "create new"), shows what will migrate, never destroys local data on failure (no partial migration). Account-less persons join without duplication. Device info only what improves experience/security/support (type, platform, app version, language, timezone, capabilities, last active, friendly name); device management with revoke. Preference layers: Household (currency, config, responsibilities, roles, permissions) / Person (language, notifications) / Device (name, theme, local settings, capability). Offline-connected use: work offline → changes stored locally → synchronize on return, automatically (CN §74).

### 2.10 Notifications (CN §§80–82)
Types: assignments ("You have a new responsibility"), reminders ("Bathroom cleaning is due today"), completions ("Daniel completed the responsibility you assigned"), missed, finance alerts, bill alerts. Per-person category preferences; recipient device influences delivery (future). Human-language copy; deep-links; complete-from-notification (future).

### 2.11 Ethiopian localization (CN §§83–95)
Four layers: Language, Locale, Household reality, Culture. English + አማርኛ both first-class; parent EN / child AM is normal. User-generated content may be bilingual ("Laundry — ልብስ ማጠብ") and must feel natural. Ethiopian calendar support: Gregorian / Ethiopian / both — **device/personal-level preference**. ETB default currency for Ethiopia. Optional **Ethiopia starter profile**: ETB + EN/AM + Ethiopian calendar + local categories + local shopping examples (market, local shop, supermarket, pharmacy, bakery, online, custom — no supermarket-centric assumption) + local responsibility templates — all editable. Culture through real behavior (extended family, coffee tradition as OPTIONAL event flow with supplies/shopping/guest prep/budget impact, guest gatherings) — never stereotypes, never decorative nationalism, **never gender-based assignment defaults** (cooking↛mother, car↛father).

### 2.12 UX philosophy (CN §§96–99) — binding tone
Smart defaults, shallow surface, deep configuration. Simple → Suggested → Use immediately → Customize later. Not a giant setup wizard. One-minute onboarding (language → household → yourself → people → starter setup → accept suggestions → start). **Today-first home screen** (greeting; Today; Coming up). **Household setup center** hub: People, Family roles, Permissions, Responsibilities, Routines, Money, Categories, Rooms, Supplies, Notifications, Devices, Language & region.

### 2.13 All 82 micro-interactions (CN Part XIII) — each binding as UX law
1. Never choose a module first — open to "What needs attention?" 2. One universal "+" (Responsibility/Expense/Shopping item/Bill/Person/Event). 3. Context determines defaults (usual Thursday grocery → Groceries preselected). 4. "Same as last time" repeat offers. 5. Quick-complete from anywhere (visible ✓). 6. Optional swipe-right completes; visible buttons remain. 7. Completion one tap ("✓ Done", then offer note/photo). 8. Proof optional. 9. Undo important actions ("Deleted — Undo") over confirmation dialogs. 10. Conversational confirmations ("Laundry completed.", "1,250 birr added to groceries."). 11. Don't ask what's inferable (parse "Laundry every Monday assigned to Hana" into fields). 12. Natural-language entry eventually ("Buy shiro tomorrow" → suggestion). 13. Don't require perfect input ("Food 500" acceptable, categorize later). 14. "Later" is first-class ("Set category later"). 15. Suggested setup = Keep/Change/Skip. 16. Domain vocabulary: Responsibility/Assignment/Routine/Expense/Bill — not "task" everywhere. 17. Inline explanations of unfamiliar concepts ("Responsibility — something your household needs to have handled"). 18. Recurring visually obvious (↻ badge). 19. "Why am I seeing this?" explains suggestions. 20. Dismiss suggestions without punishment (Add / Not now / Don't suggest again). 21. "Not now" over "No" (Do now / Remind me later / Skip). 22. Simple snooze (1h/Tonight/Tomorrow/Weekend/Pick date). 23. Human-language notifications; never internal identifiers. 24. Deep-link notifications to the actual item. 25. Complete-from-notification (Complete/Snooze/Open). 26. Simplified child experience — children see relevant responsibilities, not administration. 27. "My responsibilities" one tap for everyone. 28. Parent/guardian child view ("Daniel 2/3 · Sara 3/3"). 29. "Assign again" from history. 30. Reassign instead of recreate; preserve recurring responsibility. 31. Temporary changes explicit ("This week only: Abebe"). 32. Rotation reads naturally ("Alternate between Hana and Abebe every week"). 33. Expense prompt human ("500 birr — what was it? Groceries"). 34. Show remaining budget. 35. Tap numbers for explanation (transactions behind totals). 36. Bills are obligations ("Electricity — due Friday — expected ~1,800 birr"). 37. Ranges when appropriate ("1,500–2,000 birr"). 38. Shopping "Buy together" grouping by trip/category. 39. Running-low actionable ("Detergent — Running low [Add to shopping]"). 40. Smart quantity suggestions. 41. Temporary/guest access = future scope. 42. Household announcements = future feature. 43. Activity feed reads like a story. 44. Group noisy activity ("12 household updates"). 45. Skipped work isn't an emergency — severity levels. 46. Financial alert severities (Informational/Warning/Important/Critical). 47. Empty states teach ("Your household is ready. Add your first responsibility."). 48. Never show a completely empty first dashboard — suggested examples. 49. Say "You can change this later". 50. Hide advanced permissions initially. 51. Explain permissions with real examples. 52. Preview another person's experience ("View as Daniel"). 53. Show access boundaries ("Daniel can see his responsibilities. Daniel cannot see household finances."). 54. "Who can see this?" for sensitive info (Owners/Selected/Everyone). 55. Sensible defaults, no per-record privacy config required. 56. Device setup nearly invisible ("This looks like your new phone. Syncing…"). 57. Friendly device names. 58. Human sync status (✓ Up to date / ↻ Syncing… / Offline — changes saved). 59. Offline reassures ("You're offline. Your changes are saved and will sync when you're back online."). 60. Local→connected feels like an upgrade. 61. Show what will migrate (counts). 62. Explain TXT contents (+ "Your password is not included"). 63. Friendly backup filenames (`My-Household-2026-08-25.txt`). 64. Gentle backup reminders. 65. One-tap "Save household copy". 66. Import feels like opening ("Open household copy"/"Bring in a household"). 67. Never silently merge; block message verbatim. 68. Household health summary (✓ bills ✓ no overdue ✓ shopping ready ⚠ budget). 69. Do not rank family members — no leaderboards. 70. Positive feedback = contribution ("3 responsibilities completed this week"). 71. Create recurring from history ("You do this often. Make it recurring?"). 72. Capture first, organize later. 73. Recover from ambiguity gracefully ("I understood: Buy shiro tomorrow. Add/Change"). 74. Smart enough, predictable enough — assistant never silently changes permissions/reassignments/budgets/ownership/schedules. 75. Test Amharic layouts (wrapping, buttons, headings, notifications, mixed-language, long names, numbers). 76. Mixed-language content normal. 77. Language switching safe — never modifies data. 78. Role renames never change permissions. 79. Roles change over time (Child→Teenager); history remains. 80. Age progression suggests review; never auto-changes permissions. 81. Detect→suggest→user decides (age changed→review role? task repeatedly moved→adjust schedule? budget exceeded→raise? detergent repurchased→recurring? new device→enable notifications?). 82. Formula: **Remember everything you can. Ask only what matters. Suggest before demanding. Never surprise the user.** Decision rule: safely infer→infer; safely suggest→suggest; doesn't matter now→don't ask; sensitive/destructive→ask explicitly.

### 2.14 Business model & positioning (CN §§XIV–XVII)
Free = complete local household (everything in §3 scope list + TXT export/import, no mandatory cloud). Paid = connected household (sync, connected users, devices, collaboration, notifications/reminders, shared history, delegated responsibilities, financial alerts, device management). Marketing angles: mental load ("Stop remembering everything"), coordination, money visibility, privacy ("Your home. Your data."), offline, connected family, children ("Teach responsibility without constantly reminding"), Ethiopia ("Built around the way Ethiopian households live"). Landing page flow: Hero → mental load → responsibilities → coordination → finances → everything connects → private/local → portable TXT → connected → notifications → Ethiopian localization → pricing.

### 2.15 Concept-note roadmap (CN Part XVIII) — phase map
Phase 0 discovery (research; partially satisfied by this product's Ethiopian-first design decisions) · Phase 1 household foundation (= v1) · Phase 2 home operations (= v1) · Phase 3 local finance (deferred) · Phase 4 TXT portability (= v1) · Phase 5 localization (= v1 core) · Phase 6 connected household (future) · Phase 7 offline/online sync (basic outbox pulled INTO v1; full merge/conflict UX future) · Phase 8 notifications (in-app subset = v1; push future) · Phase 9 device management (future) · Phase 10 assistant intelligence (future).

### 2.16 Critical product invariants (CN Part XIX) — inviolable
1. Local completeness (works without internet). 2. Household ownership of data. 3. Strict authorization. 4. **No indirect leakage** — restricted data never appears via history/notifications/assistant. 5. Portable household (TXT first-class). 6. Safe conflicts (block, never merge). 7. Connected mode stays offline-capable. 8. Safe migration (can't destroy local data). 9. Family role ≠ inherently permission (defaults, customizable). 10. Ownership separate from displayed identity (Mother/Grandmother/Guardian/custom can own). 11. Person-specific beats role permission. 12. Age/sex never authorize. 13. Every role customizable. 14. Every role resets appropriately (builtin→factory; custom→create-time). 15. Role creation frictionless (name required, description optional).

---

## 3. v1 Scope (user-locked)

**Included** — Concept-note Phase 1 (foundation) + Phase 2 (home operations) + Phase 4 (TXT portability) + Phase 5 core localization + Phase 8 in-app subset:
households · people · relationship-flavored roles · permissions (full catalog incl. reserved finance keys) · ownership via owner-permission role · responsibilities · subtasks with assignees · assignment rules (all CN §38 types) · routines (organizational) · occurrences + complete/skip/miss/reopen/reassign · Today screen · activity feed (filterable) · per-member analytics (counts only) · in-app notifications + per-person prefs + digest reminders · rooms/assets/maintenance-lite (service records) · supplies states · shopping list→purchase→restock loop · profile switching with password gates · view-as read-only preview · EN/አማርኛ full dictionaries · Gregorian/Ethiopian calendar display · ETB money formatting · Ethiopia starter profile · TXT export/import with conflict blocking · printable weekly fridge sheets · installable PWA + service-worker offline shell + offline outbox writes.

**Deferred (do not build in v1):**
Finance module end-to-end (schema impact limited to reserved permission keys) · connected tier: online accounts beyond local, subscriptions, multi-household membership, device management registry, push notifications · assistant intelligence/pattern detection (deterministic aggregation ships) · full offline multi-device sync/merge (basic outbox ships) · hour/minute scheduling granularity (CN §39 future) · proof-photo upload flow (column reserved) · temporary/guest access (CN micro-41) · household announcements (CN micro-42).

**Rationale anchors:** user chose Foundation+Home ops over finance-included (Turn 2); finance was the largest remaining block and its absence doesn't hollow the daily-use story; portability + localization were non-negotiable identity features of the pitch.

---

## 4. Architecture — Every Technical Decision

### 4.1 Stack (with reasons)
| Choice | Reason |
|---|---|
| Next.js 15 App Router + React 19, TypeScript | User mandate "Next.js application (fullstack)"; route handlers host the REST API so web + future mobile share one origin/cookie story |
| pnpm workspaces monorepo | Mobile app later will consume shared contracts; clean separation of pure domain vs apps |
| Tailwind CSS v4 (`@theme` tokens) | Custom warm design tokens without corporate kit defaults |
| Radix UI primitives + **bespoke component kit** (NOT default shadcn look) | Accessibility foundations while keeping the non-corporate family aesthetic |
| `motion` (framer-motion successor) | Micro-interactions/animations mandate |
| `@tanstack/react-query@5` | User mandate — sole client data path; no server actions/RSC fetching |
| axios | User mandate (replaces earlier ky pick): request interceptor attaches Bearer token + optional X-View-As-Person-Id; response interceptor normalizes envelope errors and purges session on 401 |
| @reduxjs/toolkit + react-redux + redux-persist | Auth/session slice only (token, user, activePerson, household, permissionMap display-copy), persisted to localStorage; Flutter later mirrors in secure storage |
| `zod` (contracts in packages/core) | Single validation source shared by web API + worker + future mobile |
| Drizzle ORM + `node-postgres` on **PostgreSQL** | User chose Postgres for the cloud path; Drizzle = TS-first, light, fast cold starts (vs Prisma's heavier engine) |
| Express 4 + **pg-boss v10** (worker app) | User mandated minimal Express for cronjobs/queues; pg-boss gives cron+retry+queue ON Postgres — no Redis to run |
| `@node-rs/argon2` | Fast argon2 password hashing, native |
| i18next + react-i18next, typed dictionaries | Client-side instant language switch that never touches data (CN §77); TS error on missing key guarantees AM parity |
| `idb-keyval` + `@tanstack/query-async-storage-persister` | IndexedDB persistence for offline reads |
| `canvas-confetti`, `lucide-react`, `sharp` (icon build script), `tsx` (worker dev) | Completion celebration, icons, PWA asset generation, TS worker runner |
| Fonts: Fraunces (display/greetings), Nunito Sans (body), Noto Sans Ethiopic | Warm editorial feel + guaranteed Ethiopic glyph coverage |

### 4.2 Repository layout
```
chorify/
├── package.json            # workspaces; root scripts: dev (next+worker concurrent), test, db:generate/migrate/seed, typecheck
├── pnpm-workspace.yaml     # apps/* packages/*
├── .env.example            # DATABASE_URL, WORKER_ADMIN_TOKEN
├── plan.md                 # THIS DOCUMENT
├── apps/
│   ├── web/                # Next.js: UI + ALL business REST under /api/v1
│   └── worker/             # Express: pg-boss cron/queue + /health + /admin endpoints ONLY
└── packages/
    ├── db/                 # Drizzle schema, client, migrations, seed.ts
    └── core/               # zod contracts, permissions, schedule, calendar, txt, notify, activity builders, services (pure, db injected)
```

### 4.3 Binding architectural rules
1. All business logic in `packages/core` (pure functions/services over an injected db handle). Route handlers are thin: parse → authorize → call service → serialize. Worker imports the same services.
2. Every wire payload has a zod schema in `packages/core/src/contracts/*` — shared with the future mobile app.
3. Web pages are `'use client'`; server data exclusively through TanStack Query hooks living in feature `api/` folders. One axios client (`lib/api/client.ts`) with interceptors; response envelope `{data}` / `{error:{code,message,missingPermission?}}`; **Bearer-token-only auth (no cookies)**.
4. Server authorizes every endpoint via `requirePermission(key)`; the client permission map only hides UI.
5. No server actions anywhere; no DB access outside `packages/db`.
6. Modular monolith doctrine: backend domain modules and frontend feature folders follow the fixed file anatomy of §4.15; no types/helpers/utils live outside their owning files.
7. Cross-module imports ONLY via public `index.ts` barrels; ESLint `no-restricted-imports` enforces this on both apps; shared kernels (`core/errors`, `core/permissions`, `core/db`) are importable everywhere.
8. Every multi-write mutation is transactional: services receive an executor (`db | tx`), wrapped via `withTransaction` from `packages/db`; worker jobs included.
9. Identity state lives solely in the RTK authSlice (persisted); server data solely in TanStack Query — never duplicated between them.
10. Shared UI primitives are props-config only (`components/ui/*`); feature components stay feature-private until deliberately promoted.

### 4.4 Runtime & environment facts
Node v22.12.0 · pnpm 10.33.2 · Linux x64 · dev ports: web :3000, worker :4001 · env: `DATABASE_URL` (Postgres 16+ assumed running locally; user runs their own — deployment decision "dev scripts only"), `WORKER_ADMIN_TOKEN` (bearer guard for worker admin endpoints). Do NOT substitute another database (Postgres was explicitly chosen).

### 4.5 Data model (packages/db/src/schema.ts) — complete
Conventions: every table has `id uuid pk default gen_random_uuid()`, `createdAt timestamptz default now()` unless noted; household-scoped tables carry `householdId uuid not null`.

- **households**: `name text` · `currency text default 'ETB'` · `timezone text default 'Africa/Addis_Ababa'` · `lastExportAt timestamptz null`. (Calendar preference deliberately NOT here — device-level per CN §86.)
- **users**: `username text unique` · `passwordHash text` (argon2; REQUIRED whenever a user row exists) · `personId uuid null` · `householdId uuid null`. Credential doctrine: person **with** user row = credentialed identity (password-gated switching; max ONE user per person); person **without** = passwordless quick-switch profile (children default).
- **sessions**: `userId uuid null` · `activePersonId uuid not null` · `tokenHash text` (sha256 of 32-byte random token; raw token only ever in cookie/body) · `expiresAt` (sliding 30-day). One session per login; **profile switching mutates activePersonId (+userId when target credentialed)** instead of minting sessions.
- **people**: `name text` · `sex text null` (`male|female` only, CN §30) · `birthDate date null` · `age int null` (when birthDate unknown; suggestions only) · `avatarEmoji text default '🙂'` · `roleId uuid null` · `permissionOverrides jsonb default '{}'` (partial Record<PermKey,boolean>) · `language text null` (reserved connected-tier; device localStorage governs v1).
- **roles**: `builtinKey text null` (set on the 11 presets) · `name text` · `description text null` · `isOwnerRole boolean default false` · `isBuiltin boolean` · `permissions jsonb` (complete Record<PermKey,boolean>) · `defaultPermissions jsonb` (reset snapshot: factory matrix for builtins; copy of permissions at creation for custom).
- **routines**: `name` · `icon text default '🌅'` · `timeBucket text` (`morning|afternoon|evening|anytime`).
- **responsibilities**: `title` · `notes text null` · `routineId uuid null` · `roomId uuid null` · `archivedAt timestamptz null` · `createdByPersonId uuid null` · `icon text default '📌'`.
- **subtasks**: `responsibilityId` · `title` · `sortOrder int` · `assigneePersonId uuid null` (CN §37).
- **assignment_rules**: `responsibilityId` · `pattern text` (`once|daily|every_n_days|weekly|every_n_weeks|monthly|dates|range`) · `interval int null` · `daysOfWeek jsonb null` (ints 0–6, Sunday=0) · `anchorDate date null` (phase anchor for every_n_days / weekly-interval / rotation; defaults to creation date) · `monthDay int null` (1–31 clamped to month length) · `dates jsonb null` (ISO dates) · `startDate date` · `endDate date null` (range/temporary) · `rotation jsonb null` (`{periodDays:7, personIds:uuid[]}` — array order IS the rotation) · `personIds jsonb default '[]'` (fixed assignees; EMPTY ARRAY = household-wide claimable) · `active boolean default true` · `createdByPersonId uuid null`.
- **occurrences**: `responsibilityId` · `ruleId uuid` · `dueDate date` · `personIds jsonb` (resolved at materialization) · `status text default 'pending'` (`pending|completed|skipped|missed`) · `completedByPersonId uuid null` · `completedAt timestamptz null` · `note text null` · `proofPath text null` (reserved) · `skipReason text null` · `subtaskStates jsonb default '{}'` (`{"<subtaskId>":{done,personId}}`). **UNIQUE INDEX `(ruleId, dueDate)`** — generator idempotency cornerstone.
- **rooms**: `name` · `icon text default '🏠'`.
- **assets**: `roomId uuid null` · `name` · `icon text default '🔧'` · `maintenanceIntervalDays int null`.
- **service_records**: `assetId` · `servicedOn date` · `note text null`. Next-due = max(servicedOn)+intervalDays.
- **supplies**: `name` · `state text default 'available'` (`available|low|out`) · `note text null`.
- **shopping_items**: `name` · `quantityText text null` · `category text null` · `sourceSupplyId uuid null` · `purchasedAt timestamptz null`.
- **activity_events**: `actorPersonId uuid null` · `type text` (e.g. person.added, role.updated, responsibility.completed, occurrence.missed, occurrence.reassigned, supply.low, shopping.purchased, household.exported) · `payload jsonb` · `domain text` (`household|responsibilities|finances|home|resources` — visibility gate).
- **notifications**: `recipientPersonId` · `category text` (`assignment|reminder|completion|missed|finance|bill|backup`) · `type text` (i18n key like `notify.reminder.digest`) · `paramsJson jsonb` · `linkPath text null` · `readAt timestamptz null`. **No persisted prose — clients localize historical entries.**
- **notification_prefs**: `personId pk` · `categories jsonb` (partial toggles; defaults all-true except finance/bill false).
- **jobs_audit**: `name text` · `ranAt timestamptz` · `result jsonb` (worker bookkeeping surfaced by admin endpoint).

No loans/debt tables (CN exclusion). No rewards/points tables (user removal, Turn 7).

### 4.6 Identity, auth, sessions, profile switching
- Register: username+password+displayName → single transaction creates: user · household · creator person attached to a preset role **cloned with isOwnerRole=true** · all 11 builtin role rows · starter template rows. Auto-login.
- Login: verify argon2 hash → create session row (random 32-byte token; sha256 stored) → returns `{token, user, activePerson, household, permissionMap}`. **Bearer-token-only transport (user decision D36):** no cookies; the axios request interceptor attaches `Authorization: Bearer <token>` from the RTK slice; redux-persist keeps it in localStorage (Flutter later: secure storage). Logout deletes the session server-side and clears redux-persist + query cache.
- `/me` returns `{user, activePerson, household, permissionMap}` for the current session.
- Profiles: `GET /profiles` → people each flagged `{requiresPassword}` (=has linked user). `POST /profiles/switch {personId, password?}`: target credentialed → password REQUIRED, verified against THAT user (`401 PASSWORD_REQUIRED` absent · `401 WRONG_PASSWORD` incorrect); target passwordless → instant switch. Session mutates in place.
- Every request resolves permissions from `session.activePersonId`.
- View-as (owner simulation): header `X-View-As-Person-Id`, allowed only if actor resolves `configure_permissions` OR `manage_ownership`; **strictly read-only — any mutation returns `403 VIEW_AS_READONLY`**; acting for someone happens via profile switch.
- Self-service: change OWN password freely; create/change ANOTHER person's account requires `configure_permissions`.
- Person deletion cascades linked user + revokes their sessions (LAST_OWNER still guards). Activity keeps actor ids displayable.
- Security: login rate limit 5 failures/min per username+IP (in-memory); sessions never store raw tokens.

### 4.7 Permission system (packages/core/src/permissions.ts)
Catalog (domain → keys), fixed forever:
- `household`: view_people, add_people, invite_people(reserved-connected), remove_people, manage_roles, manage_ownership, configure_permissions
- `responsibilities`: view, create, assign, reassign, manage_routines, complete, view_history
- `finances`: view, view_expenses, create_expenses, edit_expenses, view_accounts, manage_accounts, view_budgets, manage_budgets, manage_goals *(module deferred; catalog shipped now)*
- `home`: view_assets, manage_assets, manage_maintenance
- `resources`: manage_supplies, manage_shopping, manage_purchases

Resolution precedence (invariant CN §23): `person.permissionOverrides[key]` → `role.isOwnerRole ? true` → `role.permissions[key]` → **false**.

Built-in preset matrices (seeded per household; reset restores exactly these):

| Role | household | responsibilities | finances | home | resources |
|---|---|---|---|---|---|
| Father, Mother | all true | all | all | all | all |
| Grandfather, Grandmother | view_people, add_people | all | view, view_expenses, create_expenses | all | all |
| Guardian | view_people, add_people | all | view, view_expenses, create_expenses, view_accounts, view_budgets, manage_goals | all | all |
| Adult | view_people, add_people | all except manage_routines | view, view_expenses, create_expenses, view_accounts, view_budgets | view_assets, manage_maintenance | all |
| Teenager | view_people | view, create, complete, view_history | — | view_assets | manage_supplies, manage_shopping |
| Responsible Child | view_people | view, create, assign, complete, view_history | — | view_assets | manage_supplies, manage_shopping |
| Child | view_people | view, complete | — | — | — |
| Supervised Child | view_people | view, complete | — | — | — |
| Family Member | view_people | view, complete, view_history | — | view_assets | manage_shopping |

Custom roles: baseline = responsibilities.view+complete true, everything else false; `defaultPermissions` snapshots config AT CREATION → Reset restores that snapshot. Rename NEVER touches permissions (CN §78). Role creation frictionless: name alone saves (CN §15). "Custom" is an action, not a preset row.

LAST_OWNER invariant (service-enforced, transactional): block any role-edit/unassignment/person-deletion that would leave zero persons holding an isOwnerRole role → `409 LAST_OWNER`.

### 4.8 Scheduling engine (packages/core/src/schedule.ts)
Pure `expandRule(rule, windowStart, windowEnd)` returning `[{date, personIds}]`:
- once → single date · daily → every day · weekly(+interval w/ anchorDate) → matching daysOfWeek · every_n_days → anchor+k·N · monthly → monthDay clamped to month length · dates → literal set · range → inclusive daily window.
- Rotation: index = floor((date − anchorDate)/periodDays) mod len(personIds) — anchored at rule creation; editing rotation membership never rewrites past.
- Multiple rules per responsibility legal (weekday/weekend splits); same-day collisions render as separate cards.
- Generator horizon `[today, today+13]` (14 days ⇒ offline devices hold ≥2 weeks of chores; print week always covered). **Backfill insurance:** also materialize unmaterialized dates from `max(rule.startDate, rule.createdAt-date, greatest existing materialized dueDate+1)` through today — fires only after real infra downtime (hosting is ours/always-on; users cannot cause gaps).
- Unique `(ruleId,dueDate)` upserts make reruns idempotent. Rule edits regenerate forward only: delete pending occurrences `dueDate ≥ today`, re-expand, one transaction; completed/skipped/missed immutable.

### 4.9 Occurrence lifecycle & background jobs
Actions on `/occurrences/:id`: `complete` (status/completedBy/completedAt/note; auto-checks all subtasks in subtaskStates; activity event; notifications out; **on non-pending target → `409 ALREADY_DONE` with `{completedByPersonId, completedAt}` payload — first-write-wins, D40**) · `skip` (skipReason optional; same ALREADY_DONE guard) · `reopen` (only completing actor, ≤10 min after completion; leaves subtaskStates untouched) · `reassign` (pending only; occurrence-scoped "This week only", never mutates rule; activity event). Terminal statuses immutable. Authorization to complete/skip: actor-or-viewed resolves `responsibilities.complete` — parents may close anyone's chore; assignees aren't the only completers. Multi-assignee: one completion satisfies all. Household-wide (empty personIds): claimable by any member whose effective `complete`=true; completedBy records taker.

Worker (apps/worker, Express + pg-boss):
| Job | Cron (tz = households.timezone) | Behavior |
|---|---|---|
| generate-occurrences | `*/15 * * * *` | expansion + backfill, all households |
| sweep-missed | `10 * * * *` | pending ∧ dueDate<today(household tz) → missed; activity; notify creator else owners |
| due-today-reminders | `0 7 * * *` | ONE digest notification per person: params `{count, previewTitles}`, deep-link `/chores` |
| backup-nudge | `0 18 * * 0` | lastExportAt null or >14d → backup notification to owner holders |

Contingency (pre-decided): if pg-boss timezone-cron misbehaves → daily `tick` job computes per-household local times and enqueues one-off jobs; behavior contract unchanged. All jobs force-runnable via `POST /admin/jobs/:name/run` (WORKER_ADMIN_TOKEN bearer); `GET /health`, `GET /admin/jobs` (last runs from jobs_audit).

Missed grace visibility (user-authored policy): missed items appear on Today's subdued strip until `dueDate + grace(cadence)` where grace = once/dates/range +1d · every_n_days +N d · weekly/every_n_weeks +7×interval d · monthly +7d; afterwards history/analytics only.

### 4.10 Notifications & activity
Recipient resolver (`packages/core/src/notify.ts`, pure): assignment→rule assignees · completion→rule.creator else owner-role holders (minus actor) · missed→creator else owners · reminder digest→occurrence assignees · backup→owner holders · supply low/out→manage_supplies holders minus actor. Every recipient filtered through notification_prefs category toggles.
Activity events persist `{type, params}` + permission `domain`; feed filtered server-side by viewer domains (no-indirect-leakage invariant CN XIX-4); grouped noise ("12 household updates"); filters: member/action/chore/date-range.

### 4.11 Portability (TXT export/import)
Export: `GET /api/v1/export/household.txt` → `### CHORIFY-HOUSEHOLD v1` header line + pretty-printed JSON of all household tables (EXCLUDES password hashes/sessions/user credentials — CN §62 "your password is not included"); sets households.lastExportAt; Content-Disposition filename `My-Household-YYYY-MM-DD.txt`.
Import: `POST /api/v1/import` text/plain. Validate header + shape. Version ≤ current major required (`409 IMPORT_TOO_NEW` otherwise; older majors parse leniently). **Conflict policy: any target-household rows beyond the registering trio (own user/person/household) → `409 IMPORT_CONFLICT`, zero writes** (CN §67 message shown verbatim in UI). Fresh adoption maps importer onto imported owner seat: `users.personId` repoints to imported owner-role holder, placeholder register-person deleted, everything else adopted verbatim, one transaction; session stays valid.

### 4.12 Offline model (v1)
Hosting is ours and always-on; clients may be offline anytime. **Reads:** TanStack Query persisted to IndexedDB (idb-keyval persister) — the worker pre-materializes 14 days of occurrences, so upcoming chores exist on-device before disconnection. **Writes — outbox allowlist (D41), FIFO replay through the same axios client, sequential never parallel:**

| Queued mutation | Safety basis |
|---|---|
| PATCH /occurrences/:id complete / skip | uuid pre-exists (materialized ahead); non-pending → ALREADY_DONE dropped gently |
| PATCH /occurrences/:id reassign | absolute personIds set — replay-convergent |
| PATCH /supplies/:id {state} | absolute enum set — newest intent wins |
| POST /shopping-items | client-generated uuid, server upserts ON CONFLICT DO NOTHING → replay-proof |
| POST /shopping-items/:id/purchase | no-op when purchasedAt already set |
| notification read / read-all | boolean flags |

**Cap 100 intents (user decision):** soft warning banner at 80 ("Sync queue getting long"), oldest-evicted beyond 100 with a visible notice. Replay order global FIFO by enqueue time. Every intent carries header `X-Chorify-Intent: <intent-uuid>` for tracing; the outbox dedupes locally by intent id before send (never re-fires a settled intent, even across restarts). Server-side idempotency inventory: purchase purchasedAt-guard · shopping upsert-by-id · occurrence terminal guards · supply/notification absolute sets — a shared Idempotency-Key memo table is reserved as future hardening if Flutter needs broader coverage.
**Online-required (controls disabled with calm hint "You're offline — this needs a connection", CN micro-59):** responsibilities/routines/rooms/assets/people/roles/import/settings/profile-switch — chained ids or fresh-state invariants make queuing dishonest.
**Busy & disabled discipline (D46):** every mutation control shows pending spinner and blocks re-submit while in flight; forms validate via feature zod schemas before firing; outboxable controls stay enabled offline and gain a "will sync" dot after enqueue; non-outboxable ones disable per above. SyncStatus chip: ✓ Up to date / ↻ Syncing… (with queued count) / Offline — changes saved (CN micro-58/59). Full multi-device merge stays Phase 7.

### 4.13 PWA / service worker
manifest.webmanifest (name Chorify, standalone, theme #FAF6F0, icons 192/512+maskable generated by sharp script `pnpm --filter web icons`) + apple-touch/meta tags. Hand-rolled `public/sw.js`, registered production-only: precache `/_next/static/**` cache-first (content-hashed), navigation network-first with last-cached-document fallback, runtime-cache Google Fonts; caches versioned by Next buildId; skipWaiting+clientsClaim.

### 4.14 REST API surface (apps/web/src/app/api/v1)
Envelope `{data}` / `{error:{code,message,missingPermission?,params?}}`. Error codes: 401 UNAUTHENTICATED · 401 PASSWORD_REQUIRED / WRONG_PASSWORD · 403 FORBIDDEN(+missingPermission) / VIEW_AS_READONLY · 404 NOT_FOUND · 409 CONFLICT / LAST_OWNER / IN_USE / IMPORT_CONFLICT / IMPORT_TOO_NEW / ALREADY_DONE(+who/when) · 422 VALIDATION_ERROR(+zod issues) · 429 RATE_LIMITED(+retryAfterSeconds). Frozen code→UX map lives in §5.8.

- Auth/me: POST /auth/register · POST /auth/login · POST /auth/logout · GET /me · GET /profiles · POST /profiles/switch
- Meta/static: GET /permissions (catalog+presets) · GET /meta (locales, currencies, Ethiopia starter profile templates)
- People/roles: GET|POST /people · PATCH|DELETE /people/:id · GET|POST /roles · PATCH /roles/:id · POST /roles/:id/reset
- Chores: GET|POST /responsibilities (payload nests subtasks+assignmentRules) · PATCH|DELETE /responsibilities/:id (archive) · GET|POST /routines · PATCH|DELETE /routines/:id · GET /occurrences?from&to&personId&status · PATCH /occurrences/:id {action: complete|skip|reopen|reassign, note?, skipReason?, personIds?}
- Dashboard: GET /today → {todayOccurrences, missedInGrace[], upcoming[7d], lowSupplies, openShoppingItems, maintenanceDue[], recentActivity[5]} (single round-trip home screen)
- Home ops: GET|POST /rooms · PATCH|DELETE /rooms/:id · GET|POST /assets · PATCH|DELETE /assets/:id · POST /assets/:id/service-records
- Resources: GET|POST /supplies · PATCH /supplies/:id (state transitions; activity only entering low/out) · GET|POST /shopping-items · PATCH /shopping-items/:id · POST /shopping-items/:id/purchase (idempotent; supply→available; activity)
- Social: GET /activity?cursor&member&action&chore&from&to · GET /notifications?unread · PATCH /notifications/:id/read · POST /notifications/read-all · GET|PUT /notifications/preferences
- Portability: GET /export/household.txt · POST /import

No rewards endpoints — feature removed by user decision.

---

### 4.15 Code Organization Conventions (Turn 10 law)

Backend — one folder per domain under `packages/core/src/modules/<domain>/` (auth, people, roles, responsibilities, occurrences, routines, rooms, assets, supplies, shopping, notifications, activity, portability), each containing exactly: `<domain>.model.ts` (drizzle model re-export/type), `<domain>.schema.ts` (zod wire contracts — the mobile app's source of truth), `<domain>.rules.ts` (pure domain logic), `<domain>.service.ts` (class methods, executor-injected, transaction-wrapped), `<domain>.helpers.ts` (pure small utils), `<domain>.types.ts`, `index.ts` (PUBLIC barrel). Drizzle table definitions themselves are split per domain in `packages/db/src/models/<domain>.model.ts` (drizzle-kit config points at the folder). Next route handlers mirror domains as thin controllers under `app/api/v1/<module>/…`.
Shared kernels (importable by anything): `core/errors` (`AppError{code,httpStatus}` hierarchy mapping 1:1 onto §4.14 error codes), `core/permissions` (catalog, resolvePermission, requirePermission factory), `core/db` (client + `withTransaction`).
Frontend — one folder per feature under `apps/web/src/features/<feature>/` (chores, household, routines, home, supplies, shopping, activity, notifications, settings, print, auth, onboarding): `<feature>.types.ts`, `<feature>.schemas.ts`, `<feature>.helpers.ts`, `<feature>.endpoints.ts` (URL registry feeding the wrappers), `api/<feature>.queries.ts` + `api/<feature>.mutations.ts` (generic useApiQuery/useApiMutation factories parameterized by endpoint registry entries + queryKeys), `components/*` (feature-private), `index.ts` barrel. Cross-feature reuse goes through `components/ui/*` primitives (Selector, Dropdown, Accordion, Input+validation binding, Table/Card, Sheet, Toast…) configured purely by props/values.
Boundary enforcement: ESLint `no-restricted-imports` bans deep imports across modules/features from day one; removing a module = delete folder + its route/controller registrations, nothing else breaks.
Reusable permission management: `usePermission(permKey)` boolean hook + `<Can I="assign" a="responsibilities">` wrapper reading the permissionMap from the RTK slice (display-only gating; server re-authorizes).
Profile switching / view-as exit / logout call `queryClient.clear()` + reset the RTK session fields — cached server data is person-scoped, so wholesale clear is the correct simple policy (D38).

### 4.16 Tooling & quality pins
typescript-eslint strict type-checked · `eslint-plugin-boundaries` with element types (shared-kernel / module / controller / feature / ui-primitive / app) expressing the barrel law mechanically (D37) alongside import/no-restricted-paths · eslint-plugin-react-hooks · Prettier + prettier-plugin-tailwindcss (printWidth 100, single quotes) · vitest workspace: packages/core unit suite only in v1 (no jsdom yet) · zod env schemas parsed at boot, fail-fast (`DATABASE_URL` required in web+worker; `WORKER_ADMIN_TOKEN` worker-only) · no git hooks/CI in v1 (deployment = dev scripts).

### 4.17 Workspace TypeScript strategy
Internal TS-source packages (D44): `@chorify/core` and `@chorify/db` export `src/index.ts` directly via package.json `main`; tsconfig path aliases resolve them; Next transpiles them; worker runs under `tsx` in dev (`tsc --noEmit` typecheck scripts per package; worker prod start also tsx). No dist builds, no project references — least ceremony, Turborepo-compatible later.

### 4.18 Drizzle data-access style
Typed `relations()` defined for every table in packages/db. Services read via the relational query builder on the injected executor (`executor.query.people.findMany({ with: { role: true } })`); explicit select/joins/sql fragments only for aggregates (/today rollups, analytics counts). Rows pass through `<domain>.schema.ts` `.parse()` at the service boundary (parse, don't cast). Contingency pre-decided: if the relational API misbehaves inside transactions on our driver version, those specific reads fall back to joins without changing service signatures.

## 5. Frontend & Experience — Every Decision

### 5.1 Shell & navigation
- Mobile (<1024px): top greeting bar (Fraunces italic greeting + avatar chip + SyncStatus chip) · bottom tab bar: **Today `/` · Chores `/chores` · central `+` FAB · Household `/household` · More `/more`**.
- Wide (≥1024px): persistent left rail with expanded destinations (Today, Chores, Routines, Home, Supplies, Shopping, Activity, Notifications, Household setup, Settings); two-pane layout on `/chores` (list + live detail).
- FAB `+` opens create sheet: Responsibility · Shopping item · Person (+ disabled-soon entries labeled "soon": Expense, Bill — CN micro-2 keeps them visible but inert until finance module).
- Avatar chip → ProfileSwitcher sheet: every household member, 🔒 marker on credentialed profiles, inline password field appears on selecting a locked profile.
- `/more` hub: Activity, Notifications, Supplies, Shopping, Home (rooms/assets), Settings, plus **Household setup center `/setup`** (CN §99): People, Family roles, Permissions, Responsibilities, Routines, Rooms, Supplies, Notifications, Language & region.
- Background watermark themes: `<SectionWatermark variant/>` per section — leaves (Today), bubbles (Chores), house outline (Household), coffee steam swirl (Settings); SVG pattern layers at opacity ≈0.04–0.06, aria-hidden, pointer-events-none. Never printed.

### 5.2 Theme tokens (Tailwind v4 `@theme`)
`--color-cream #FAF6F0` page bg · `--color-surface #FFFDF9` cards · `--color-ink #2D2A26` text · `--color-terracotta #C96F4A` primary · `--color-olive #7A8B6F` secondary/success · `--color-mustard #E3B23C` accents/warnings · `--color-clay-red #C75B5B` missed/danger · `--color-sky #6FA8DC` info. Radii 16–24px; warm-tinted soft shadows; emoji avatars everywhere (people/rooms/routines/assets) — playful family feel, explicitly anti-corporate. Bespoke kit on Radix primitives (`apps/web/src/components/ui/*`): Button, Card, Sheet (bottom-sheet mobile / centered dialog desktop), Switch, Select, Tabs, Field, Chip, EmptyState, Skeleton, Toast.

### 5.3 Motion & micro-interactions
Page transitions fade+8px slide 200ms · button press scale .97 · **chore check-off**: spring pop + green wash sweep + small canvas-confetti burst + `navigator.vibrate?(10)` · optimistic completion with server-backed Undo (toast offers 5s; reopen endpoint allows ≤10 min by same actor) · swipe-right-to-complete with visible ✓ fallback (CN micro-6) · staggered list entrance 30ms/item capped 10 · bottom-sheet drag-to-dismiss · skeleton shimmer · number tick-up counters on Today · conversational toasts: "Laundry completed." / "Detergent added to shopping." (CN micro-10).
- **Busy & disabled discipline (D46):** every mutating control renders a pending state (spinner/morph) and cannot double-fire; disabled-not-hidden while loading lists; outboxable actions offline stay live and show a "will sync" dot once queued; online-required ones show the offline hint. Loading skeletons already standard for reads.

### 5.4 Route map
`/login` · `/onboarding` · `/` Today · `/chores` (+`/chores/[id]`) · `/routines` (+detail) · `/household` people · `/setup/roles` (+role editor) · person sheet (modal from /household) · `/setup` hub · `/setup/rooms`, `/home`, asset detail · `/supplies` · `/shopping` · `/activity` · `/notifications` · `/settings` · `/more` · `/print`.

### 5.5 Screen behaviors
- **Login:** username+password; links to onboarding. **Onboarding stepper:** language (English/አማርኛ) → account (username/password/display name) → household (name + Ethiopia starter profile card auto-suggested, default ON when locale suggests) → add people (quick-add rows: name, relationship-flavored role select, optional age/sex/emoji; optional "Set up account" per row — skipped ⇒ passwordless quick-switch profile; attachable later) → starter responsibilities from template with **Keep / Change / Skip** (CN micro-15) → finish → `/`. Copy reassures "You can change this later." (micro-49). Empty states teach with suggested examples (micro-47/48).
- **Today:** greeting by time-of-day; sections — **Today** (pending due-today chore cards: emoji, title, assignee chip, ↻ recurring badge, quick ✓; ordered routine-bucket morning→evening then title), **Missed recently** (subdued collapsible gray strip "Missed last 7 days · N", clay-red count; grace-window membership per §4.9; expires to history), **Attention** (low/out supplies each with inline [Add to shopping]; assets maintenance-due), **Coming up** (next 7d compact), progress line "3 responsibilities completed this week" (contribution framing, micro-70).
- **Chores:** tabs Mine / Everyone / Overdue; groups Today/This week/Later. Detail: subtask checkboxes (assignee chips per subtask), natural-language schedule readout ("Every Monday · Assigned to Hana", CN micro-11/32), history strip filterable member/action/chore, Assign/Reassign incl occurrence-level "This week only: Abebe" (micro-30/31), routine membership, "Assign again" prefills one-time rule tomorrow (micro-29). Create/edit: title, emoji, multi-assignee picker with rotation builder ("Alternate weekly"), pattern picker with live natural-language preview (same engine `expandRule` powers it), routine/room optional, subtasks repeater. Household-wide chores render flagged "Up for grabs".
- **Household:** people cards (avatar, name, role chip, owner dot ●). Person sheet: profile edit, role select with preset description, "Customize permissions" expanding domain-grouped switches pre-filled from role with highlighted overrides (CN §25–26), access-boundary sentence ("Daniel can see his responsibilities and cannot see household finances.", micro-53), Create account / Change password (configure_permissions-gated), Delete person (cascade warning), **Print weekly sheet**, View-as (owners/configure_permissions; read-only banner + exit), **stats block: finished N · missed N (week/month), trend sparkline, breakdown by responsibility/routine — facts only, zero ranking vocabulary**. Roles editor (`/setup/roles`): builtin-tagged list, name-only save, optional description, per-domain grid, Reset-to-default explaining WHICH default applies (factory vs create-time), owner-role toggle guarded by LAST_OWNER explanation.
- **Routines:** Morning/Afternoon/Evening/Anytime buckets with contained responsibilities; purely organizational (no scheduling power).
- **Home:** rooms grid (watermark per room icon) → room's assets → asset detail (maintenance interval, next-due countdown, service log, [Log service]).
- **Supplies:** Available/Running low/Out chips, one-tap state cycle, [Add to shopping] when low/out (micro-39). **Shopping:** grouped by category ("Buy together", micro-38), quantity suggestions, check-off purchase → "Bought rice — supply refilled." + Undo; purchased collapse to history.
- **Activity:** story-feed grouped by day, noise collapsed ("12 household updates"), permission-filtered server-side; filters member/action/chore/date-range.
- **Notifications:** unread dot on More tab; category icons; human copy from `{type,params}`; tap deep-links (micro-24); mark-read on open; Read all; preferences editor mirrors category enum.
- **Settings:** Language EN/አማርኛ instant switch · Calendar display Gregorian/Ethiopian/Both (device localStorage; Both shows "Aug 25 · መስከረም 19") · money label preview · Household name/timezone · Backup: **Save household copy** one-tap download (micro-63/65) + gentle banner driven by backup-nudge notification (micro-64) · **Open household copy** import picker surfacing block messages verbatim (IMPORT_CONFLICT/TOO_NEW copy, micro-67) · Sign out.
- **Universal empty-state rule:** teach + suggest + "you can change this later".

### 5.6 Printables (fridge sheets) — full spec
Entry points: Chores toolbar **Print** (defaults to all-members week) · person sheet **Print weekly sheet** (that member). Both open `/print` preview route rendering the sheet + a minimal toolbar (Print button → window.print(); Customize expander).
Defaults (zero configuration required): current Mon–Sun week · all members (or the one member from person-sheet entry) · morning/evening bucket labels shown · big checkbox squares on member sheets · header line with household name, EN/አማርኛ title, Gregorian + Ethiopic date range per device pref · ink-friendly warm-gray palette.
Customize expander (only these four controls): week picker · member multi-select · bucket-labels on/off · checkboxes on/off.
Access gating (effective permissions, NOT owner-only): member sheets need `responsibilities.view`; all-members chart additionally `household.view_people`.
Implementation shape: dedicated `@media print` stylesheet strips nav/FAB/watermarks/chips/toasts; sheet markup is plain tables/lists sized for A4 portrait; Noto Sans Ethiopic intact; no new backend endpoints (reuses GET /occurrences + /people).

### 5.7 Data layer internals
`lib/api/client.ts`: axios instance — request interceptor injects `Authorization: Bearer` from RTK authSlice and `X-View-As-Person-Id` when simulating; response interceptor unwraps the envelope, maps `error.code` to toast/banner behavior, and on 401 purges the session (redux reset + `queryClient.clear()` + redirect `/login`). Redux store (`lib/store`): `authSlice` {token, user, activePerson, household, permissionMap} via redux-persist → localStorage. Generic factories `useApiQuery(config)` / `useApiMutation(config)` take endpoint-registry entries from `<feature>.endpoints.ts`; feature hooks compose them with the shared `queryKeys.ts` factory (['me'], ['profiles'], ['today'], ['occurrences',filters], …). Optimistic set unchanged: occurrence complete/reopen, shopping purchase, supply state. QueryClient staleTime 30s, retry 1, IndexedDB persister (idb-keyval) + outbox (`lib/api/outbox.ts`, replay on online/interval/focus, LWW, drop-on-409/409-with-toast) + SyncStatus chip all unchanged.

---

### 5.8 Error-code → UX map (frozen, Turn 11)

| Code | UX behavior |
|---|---|
| UNAUTHENTICATED | axios interceptor purges session (redux reset + queryClient.clear) → redirect `/login`; silent, no toast |
| PASSWORD_REQUIRED | ProfileSwitcher sheet reveals the inline password field for that member |
| WRONG_PASSWORD | inline field error + shake animation |
| FORBIDDEN +missingPermission | toast "You don't have permission for this" (localized); control hides after permissionMap refresh |
| FORBIDDEN plain | toast with server message |
| VIEW_AS_READONLY | gentle toast "Preview only — exit View-as to make changes" + banner pulse |
| NOT_FOUND | toast "This item no longer exists"; list invalidates |
| CONFLICT | toast with human params from server |
| LAST_OWNER | explanatory modal (owner requirement), not a dismissible toast |
| IN_USE | toast naming referencing count ("Room used by 3 assets") |
| IMPORT_CONFLICT / IMPORT_TOO_NEW | blocking modal with spec-verbatim copy (§67 tone: nothing was changed) |
| ALREADY_DONE | soft info toast "Already completed by {name}" (+when); card state corrects; outbox drops silently-with-record |
| VALIDATION_ERROR | zod issues mapped to inline field errors where paths match; else toast |
| RATE_LIMITED | login form shows retry countdown from retryAfterSeconds |

All copy renders via i18n dictionaries keyed on code + params — never raw keys or server prose.

## 6. Locked Domain Service Semantics (consolidated — binding on web routes AND worker)

1. Rule edits regenerate forward only (pending ∧ dueDate≥today deleted+re-expanded, one tx); terminal statuses immutable.
2. Temporary reassignment = PATCH occurrence personIds; never mutates rule; writes occurrence.reassigned event; pending only.
3. Household-wide rules (personIds=[]) materialize claimable; any member with effective complete=true may take; completedBy records taker.
4. Completion authorization: actor (or viewed-as) resolves responsibilities.complete — parents can close anyone's chore.
5. Multi-assignee: one completion satisfies all listed.
6. Undo: reopen permitted only by completing actor within 10 minutes; UI toast 5s.
7. Completing an occurrence marks ALL its subtasks done in subtaskStates; reopen leaves subtaskStates untouched.
8. Day boundaries compute in households.timezone; DATE columns carry no time-of-day.
9. Age derived from birthDate when present else stored age; suggestions never authorization.
10. Archives: archived responsibilities stop generating + hide from lists; history retained. Rooms/assets referenced elsewhere reject DELETE → 409 IN_USE.
11. Supplies: any explicit transition among available|low|out legal; activity event ONLY entering low/out; purchase sets linked supply → available.
12. Purchase idempotency: no-op when purchasedAt already set.
13. Localized server events: activity_events + notifications store {type, params}, never prose.
14. Notification recipient map + prefs filtering exactly as §4.10; reminders are ONE digest per person/day.
15. Rotation anchor stability: anchorDate fixed at creation; membership edits don't rewrite past.
16. Generator horizon [today, today+13] + downtime backfill formula (§4.8); unique (ruleId,dueDate).
17. Profile switching per §4.6 (password gates; session mutates; permissions follow activePersonId).
18. View-as strictly read-only → 403 VIEW_AS_READONLY on mutations.
19. Missed grace windows per cadence (§4.9 table); expiry moves item to history-only.
20. LAST_OWNER invariant enforced transactionally across role edits/unassignments/person deletions.
21. Self-service own-password change always allowed; others' accounts need configure_permissions.
22. Person deletion cascades user row + sessions; history preserves actor ids.
23. Import version policy + conflict blocking + owner-seat mapping exactly per §4.11.
24. Login rate limit 5 fails/min per username+IP, in-memory.
25. Completion/skip on non-pending occurrences → `409 ALREADY_DONE` (first-write-wins); outbox drops such replays with gentle toast.
26. Outbox = six-entry allowlist, FIFO sequential replay, cap 100 (warn 80, oldest evict), X-Chorify-Intent dedupe; all other mutations online-required with disabled-with-hint UI.
27. Busy/disabled discipline applies to every mutation surface; forms zod-validate before fire.


## 7. Demo Data & Seed (packages/db/src/seed.ts)

Household "Bekele Family": Hana (Mother — role cloned isOwnerRole=true, credentialed) · Abebe (Father) · Daniel 13 (Responsible Child) · Sami 8 (Child, passwordless) · Sara (Guardian). Rooms Kitchen/Living Room. Asset Washing Machine + one service record. Supplies Detergent(low)/Rice/Coffee. Shopping list seeded. Rules: Laundry weekly Mon→Hana · Trash daily rotating Daniel↔Sami · Dishes daily→Abebe. A few days of completion history + one missed. Prints login `hana / hana1234`. Purpose: instant meaningful demo + deterministic verification fixture.

---

## 8. Security & Privacy Posture

argon2 hashing (library defaults) · session tokens random 32B, stored sha256-only · **Bearer-only transport (D36 — user decision): tokens live in redux-persist localStorage; accepted XSS-sensitive tradeoff, mitigated by the no-`dangerouslySetInnerHTML` policy, CSP baseline, and server-side revocation on logout/password change** · no cookies ⇒ CSRF out of threat model; CORS stays same-origin for web, explicit origin allowlist when Flutter arrives · authorization checked server-side on EVERY handler (permission map client-side is cosmetic) · cross-household ids return 404 (never confirm existence) · worker admin endpoints behind WORKER_ADMIN_TOKEN bearer · login rate limit 5/min per username+IP · export files exclude all credential material · personal data limited to product needs (names, optional age/sex, emojis) · no third-party analytics/telemetry v1 · 401 interceptor purge is the single session-invalidation UX path.

## 9. Indexes & Performance Notes

Required indexes beyond PKs/uniques already stated: occurrences(householdId, dueDate) · partial index occurrences(status='pending') on dueDate for sweeper · activity_events(householdId, createdAt DESC) · notifications(recipientPersonId) partial WHERE readAt IS NULL · sessions(tokenHash) unique lookup · assignment_rules(responsibilityId) · FK columns generally indexed.
Budgets/guidelines: /today is ONE round-trip (aggregated endpoint) — target snappy on home Wi-Fi-class hardware; lists cursor-paginate (activity, occurrences ranges); confetti particle count small; Ethiopic font weights limited 400/600 subsets; no image uploads in v1 (proofPath reserved).

---

## 10. Explicitly Rejected / Removed (never reintroduce without user reversal)

Rewards/points/stars economies (removed Turn 7) · leaderboards/ranking of members (CN §69 invariant) · loans/debt concepts (CN §51) · resident/non-resident/dependent classification (CN §7) · refusal/reject-task workflow (CN §43) · Parent/Grandparent/Adult-Child role names (CN §9 removals) · silent merge or overwrite imports (CN §67) · cloud dependency in free tier (CN §2) · per-record privacy configuration requirement (CN micro-55) · supermarket-centric shopping assumptions (CN §91) · gender-stereotyped default assignments (CN §95) · server actions / RSC data fetching / direct DB access from pages (architecture mandate) · self-hosted deployment assumption (Turn 6 clarification: hosting is ours, always-on) · Docker deliverable in v1 (dev scripts only).

---

## 13-preview pointer: sections 11–15 continue below.

---

## 11. Verification (definition of done)

**Prereqs:** Postgres running locally · `DATABASE_URL` set · `pnpm i` · `pnpm db:migrate && pnpm db:seed` · `pnpm dev` (web :3000, worker :4001).

1. **Unit tests (vitest, packages/core) must pass:** expandRule — weekly-Monday hits only Mondays · every-3-days crosses month boundary correctly · monthly day-31 clamps to Feb 28 · rotation index flips exactly at the 7-day boundary · range window inclusive of endDate · anchorDate shifts phases predictably. resolvePermission — person override beats role beats owner-flag beats false (all four tiers proven). Custom-role reset restores create-time snapshot while rename leaves permissions untouched. TXT serialize→parse roundtrip equality. Conflict detector blocks any non-fresh household. Grace-window calculator matches the cadence table. Notify recipient map covers all six categories minus actors and prefs-filtered.
2. **API smoke (curl + cookie jar):** register → login hana → GET /today returns Trash/Dishes/Laundry occurrences · complete Laundry appears in /activity ("Hana completed Laundry") · POST /profiles/switch {sami} passwordless → 200, /me now Child-scoped · switch {hana} without password → 401 PASSWORD_REQUIRED · wrong → 401 WRONG_PASSWORD · correct `hana1234` → 200 · X-View-As-Person-Id mutation → 403 VIEW_AS_READONLY · non-owner view-as header ignored/rejected per gate.
3. **Jobs (admin force-run):** generate-occurrences → 14 days materialized (spot-check /occurrences range) · backdate an occurrence → sweep-missed flips status, digest notification exists for Hana, item visible on Today's missed strip · move its dueDate beyond grace → strip excludes it while history retains · null lastExportAt → backup-nudge creates backup notification.
4. **Portability:** export downloads `My-Household-YYYY-MM-DD.txt` · re-import into SAME household → 409 IMPORT_CONFLICT with row counts unchanged · drop DB → fresh register → import succeeds AND /me resolves activePerson = imported owner Hana with placeholder person gone · forged header version → IMPORT_TOO_NEW.
5. **Browser walkthrough (390×844 then 1280×800):** login hana/hana1234 → direct Today · complete chore → confetti + Undo genuinely rolls back · toggle አማርኛ → EVERY screen renders Amharic incl. Ethiopic glyphs, data untouched · customize Guardian permissions then Reset → factory defaults return · rename role → permissions unchanged · name-only custom role saves · view-as Sami → admin nav hidden, finances absent, banner shown, writes blocked · profile-switch Sami (no prompt) ↔ Hana (password gate works both ways) · detergent Out → Add-to-shopping → purchase → supply Available + activity entry · Save household copy downloads correct filename · DevTools-offline → complete Trash offline (queued indicator) → online → outbox replays, activity records Daniel completing Trash, SyncStatus ✓ Up to date · `/print` preview correct with defaults untouched; browser print preview chrome-free with Amharic + Ethiopic date line · `curl -I /manifest.webmanifest` → 200 · LAST_OWNER guard fires when demoting sole owner role.
6. **Regression guard:** `pnpm test` green + typecheck clean before hand-off.

---

## 12. Implementation Order

**Commit discipline (user law, D47):** many small commits over bulky ones — one concern per commit; aim ≤ ~300 changed lines; conventional messages (`feat(chores): …`, `fix(db): …`, `chore(worker): …`); commit at every green checkpoint (a §12 step completed, or a passing test batch) instead of accumulating multi-feature diffs; refactors ride ALONE in their own commits, never mixed into features; generated artifacts (drizzle migrations, PWA icons) commit separately from hand-written edits; working tree clean before any hand-off.

1. Scaffold workspaces, tsconfig base, Tailwind v4 in web, `.env.example`, root scripts. (Postgres assumed running per user; dev-scripts deployment.)
2. packages/db — schema per §4.5 (+indexes §9), drizzle-kit generate+migrate, seed.ts per §7.
3. packages/core — zod contracts, permissions.ts, schedule.ts, calendar.ts, txt.ts, notify.ts, activity builders, service modules (auth, people, roles, responsibilities/occurrences, rooms/assets, supplies/shopping, notifications, portability) — pure over injected db. Contracts unblock 4–8 in parallel.
4. Auth + middleware (session→activePerson resolution, requirePermission, view-as gate, rate limit) + /auth/* · /me · /profiles* · /permissions · /meta routes.
5. People/roles routes (reset, LAST_OWNER, cascade delete).
6. Responsibilities/routines/occurrences routes + /today aggregate.
7. Rooms/assets/service-records + supplies/shopping(+purchase) routes.
8. Activity(filters), notifications(+prefs), export/import routes.
9. Worker app: pg-boss wiring, four jobs calling core services, admin endpoints, jobs_audit.
10. Web foundation: theme tokens, Providers (redux-persist store + QueryClient + async persister + i18n + SW registration), axios client + interceptors, endpoints registries + generic query/mutation factories, outbox + SyncStatus, app shell (tabs/rail, watermarks, FAB, avatar/profile-switcher chip, Sheet/Toast kits, motion presets).
11. Login + onboarding stepper.
12. Today screen; Chores list/detail/create (+completion micro-interaction, claimable cards).
13. Household people/roles editors (+overrides, reset, profile switching UI, view-as banner, person stats).
14. Routines, Home rooms/assets, Supplies, Shopping screens.
15. Activity (filters), Notifications, Settings, export/import UI, printables (`/print` + print stylesheet).
16. Full Amharic dictionary parity across ALL screens (am.ts complete, layout QA per CN §75), Ethiopic calendar toggle, PWA manifest/icons/SW polish.
17. Full §11 verification pass; fix and re-run until green.

Dependencies: 2→3→(4..8 ∥)→9; frontend 10→(11..15 in route order as APIs land)→16→17. Steps 4–8 mutually independent once core contracts exist.

---

## 13. Open Items / Future Backlog (planning-continuation hooks)

Finance module schema + flows (income/expense/account/bill/budget/goal, assigned-money ledger, simple/detailed modes, Ethiopian category template validation CN §89–90) · connected tier (accounts, subscription, multi-household membership CN §6, device registry + management screens Phase 9, push notifications Phase 8 completion) · Phase-7 full sync (beyond-LWW merge policy, conflict UX) · assistant intelligence (patterns, "why am I seeing this?", detect→suggest catalog micro-81, age-progression prompts micro-80) · natural-language entry (micro-12/73) · snooze options on reminders (micro-22) · guest/temporary access (micro-41) · household announcements (micro-42) · proof-photo uploads · full month-calendar screen · household health summary card (micro-68) · CSP hardening · Amharic layout QA findings loop.

---

## 14. Appendix A — Decision Log (traceability)

| # | Decision | Source |
|---|---|---|
| D1 | Scope = Foundation + Home ops; finance deferred | User, Turn 2 |
| D2 | PostgreSQL over SQLite | User, Turn 2 |
| D3 | Installable manifest (later upgraded to SW offline shell) | User, Turn 2 |
| D4 | API-first: TanStack Query only; no server actions/RSC fetching | User mandate, Turn 1 |
| D5 | Express worker for cron/queues only; pg-boss on Postgres | User mandate Turn 1 + assistant selection |
| D6 | Profile switching: passwordless children, password-gated adults; session mutates activePersonId | User, Turn 4 |
| D7 | Works offline in-browser via service workers, not only installed | User, Turn 4 |
| D8 | Full Amharic dictionary all screens | User, Turn 4 |
| D9 | Deployment = dev scripts only | User, Turn 4 |
| D10 | View-as read-only (VIEW_AS_READONLY) | User accepted recommendation, Turn 5 |
| D11 | Reminders = one digest/person/day | User accepted recommendation, Turn 5 |
| D12 | Hosting ours always-on; backfill = downtime insurance only | User clarification, Turn 6 |
| D13 | Offline reads from persisted cache; writes queue in IndexedDB outbox and auto-replay | User clarification, Turn 6 |
| D14 | Missed grace by cadence (daily+1d/weekly+1w/once+1d) then history-only | User authored rule, Turn 6 |
| D15 | History filterable member/action/chore/date | User, Turn 6 |
| D16 | Per-member analytics = finished/missed counts + breakdowns; never ranking | User, Turns 6–7 |
| D17 | Rewards removed entirely | User interjection, Turn 7 (superseding priority) |
| D18 | Printables permission-gated, per-member/all-members weekly, optional time labels, defaults-first Customize-if-wanted | User, Turn 7 |
| D19 | plan.md in project root as full self-contained record | User, Turns 5 & 9 |
| D20–33 | Engineer defaults locked without objection (forward-only regeneration, claimable household-wide, subtask auto-complete, multi-rule legal, pending-only mutations, routines non-scheduling, self-service passwords, cascade deletes, rate limit, import versioning + owner-seat mapping, device-level calendar pref, money label via dict, responsibilities.icon, Today redesign sans permanent Overdue block) | Assistant proposals, Turn 5–6, user invited objections, none raised |
| D34 | axios + interceptors replace ky; generic useApiQuery/useApiMutation wrappers over per-feature endpoint registries | User, Turn 10 |
| D35 | Redux Toolkit = auth/session slice only (token/user/activePerson/household/permissionMap), redux-persist → localStorage | User, Turn 10 |
| D36 | Bearer-token-only transport, no cookies (mobile-ready); accepted XSS tradeoff with CSP/no-inline-HTML mitigations | User, Turn 10 |
| D37 | Module boundaries enforced mechanically (barrels + ESLint no-restricted-imports) | User, Turn 10 |
| D38 | Profile switch / view-as exit / logout clears ALL TanStack caches | User, Turn 10 |
| D39 | Fixed file anatomy per module/feature (.model/.schema/.rules/.service/.helpers/.types/.endpoints + index barrel); no stray utils/types anywhere; transaction-wrapped multi-write mutations | User, Turn 10 |
| D40 | Completion conflicts first-write-wins → 409 ALREADY_DONE | User, Turn 11 |
| D41 | Offline outbox = six-entry allowlist (occurrence actions, supply state, shopping create w/ client uuid, purchase, notification reads); rest online-required | User after deep-dive, Turn 11 |
| D42 | Outbox cap 100 (soft warn 80, oldest evicted visibly) | User amendment, Turn 11 |
| D43 | Expanded error codes + frozen code→UX map (§5.8) | User accepted, Turn 11 |
| D44 | Internal TS-source packages (@chorify/core, @chorify/db) | User accepted, Turn 11 |
| D45 | Drizzle relational-first reads; zod-parse at service boundary | User accepted, Turn 11 |
| D46 | Global busy/disabled mutation discipline + offline hints + will-sync dots | User mandate, Turn 11 |
| D47 | Incremental small commits: one concern, ≤~300 lines, conventional messages, refactors isolated, green-checkpoint cadence | User, Turn 12 |
| D48 | AGENTS.md as the binding agent rulebook complementing plan.md | User, Turn 12 |

## 15. Appendix B — Harness Issue Log

`xd://propose` rejected every submission while plan mode was active — verbatim error: *"No plan is awaiting approval — xd://propose only accepts a plan title while plan mode is active."* Attempts: 7 (payload formats tried: `slug:/title:` pair · `Title [slug]` · bare slug · repeat after report). Reported via `xd://report_issue` (acknowledged, unfixed). Consequence: approvals proceeded via direct user commands in chat. Any new session hitting this should not stall — record and continue per user instruction.
