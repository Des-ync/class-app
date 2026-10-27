# ShuttlePass improvement log

## Baseline — 2026-10-22 (Africa/Accra)

- Problem identified: the existing application was present in the working tree but had not been committed. The audit found payment/seat races, checksum-only passes, unsafe persistence writes, and tracking coupled to the selected screen/run.
- Changes made: checkpoint the existing application before atomic fixes. No existing work is discarded.
- Verification: `npm run lint`, `npm run typecheck`, and `npm test` pass (9 tests).

## Iteration 1 — idempotent checkout and seat reservation

- Problem identified: concurrent checkout could double-charge the simulation and overwrite validity; registrations reused seat 15, and no seats were reserved before payment latency.
- Changes made: hold route seats synchronously before payment, allocate unique route seats only on activation, reuse persisted request IDs on retries, reject conflicting purchases, and discard results invalidated by demo reset. Active route transfers enforce capacity; registration IDs are unique and unpaid riders have seat 0. Checkout UI retains a request ID through retries. New fields on receipts are optional for old stored data.
- Verification: lint and TypeScript pass; all 13 tests pass, including concurrent duplicate purchase, persisted replay, last-seat contention, stale completion, registration collisions, and full-route transfers. Existing tests retained.

## Iteration 2 — signed, trip-bound boarding passes

- Problem identified: the public FNV checksum could be forged; malformed/future subscription dates could pass validation; QR payloads were reusable across directions and restarted trips.
- Changes made: replace checksum tokens with Ed25519 signatures, secure Expo Crypto entropy, strict token limits/time windows, half-open subscription validity, per-trip/direction/day/seat/subscription claims, and a persisted boarding-consumption ledger. Reject obsolete checksum QR images while retaining subscriptions. Use an in-memory simulated issuer; no private keys are persisted. Added only standard cryptography dependencies required for this fix. Expo documentation fetch was policy-blocked (403); the installed SDK 58 source and declarations were inspected for secure randomness APIs.
- Verification: lint, TypeScript, and all 17 tests pass, including forged/future/legacy tokens, malformed dates, renewal invalidation, wrong-trip screenshots, and consumed-pass replay after rehydration. Existing assertions retained. A first-use screenshot within the validity window and cross-device offline replay require a real trusted backend/challenge-response; these limits are documented in README.

## Iteration 3 — ordered persistence and safe cache recovery

- Problem identified: asynchronous state writes could finish out of order or reject without handling; unreadable data could be overwritten by fresh defaults; cached models were trusted without validation.
- Changes made: serialize/coalesce snapshots, retain failed writes in memory for background/manual retry, surface unsaved-state warnings, pause writes after failed/corrupt reads, and validate/migrate cached riders, subscriptions, receipts, trip progress, and boarding records. Repair legacy duplicate seats without dropping valid profiles. Skip simulation mutations before hydration.
- Verification: lint, TypeScript, and all 22 tests pass. New tests cover delayed concurrent disk writes, failed-write recovery, corrupt/unreadable cache protection, old-schema loading, malformed validity, unknown routes, and invalid progress. Active passes remain cached locally; pending changes cannot survive process termination if the device itself refuses durable writes. There is no remote synchronization backend in this local simulator.

## Iteration 4 — independent runs, elapsed-time tracking, and stop consistency

- Problem identified: only the viewed direction advanced, trip completion affected every route, ETA disagreed with map timing, and absence could erase boarded attendance.
- Changes made: independent per-route/direction trip state with backward-compatible legacy `trips` mirror; elapsed-time catch-up; shared distance-based map/stop/ETA calculations; Accra timezone dates; route-scoped boarding, capacity, notification and completion. Make starts/ends idempotent, reject passed-stop notifications and invalid return slots, preserve boarded/completed journeys on absence, and synchronize the service day before manual boarding.
- Verification: lint and TypeScript pass; all 31 tests pass. Added route isolation, both-direction advancement, background/delayed ticks, clock rollback, stop geometry/ETA, scanner route checks, state-transition protection, invalid schedule input, and service-day boarding tests. Existing browser smoke also passes with signed QR tokens. iOS, Android, and web exports compile; final exports and browser offline checks follow in the next test-gap iteration.

## Iteration 5 — close the idle-flush race and exercise offline boarding

- Problem identified: an idle flush could leave a same-turn boarding write queued, and clearing a storage warning could enqueue an undrained snapshot. Offline browser behavior and integrated failed-disk boarding lacked coverage.
- Changes made: avoid idle flush locks and drain reentrant snapshots before declaring success. Add integrated optimistic-boarding/durable-ledger recovery tests. Make browser smoke self-contained: fresh web build, ephemeral server, portable Chromium selection, and guaranteed cleanup. Disconnect browser networking during QR boarding and cached-pass display; reconnect and verify reload persistence. Refresh screenshot artifacts.
- Verification: lint and TypeScript pass; all 34 automated tests pass. Browser checkout/receipt/QR/offline/pass/reload/admin flows pass with no runtime errors. Fresh iOS, Android, and web bundles compile. No original tests were deleted or relaxed; geometry tests use a numerical tolerance appropriate for floating-point interpolation.

## Iteration 6 — immutable payment intent

- Problem identified: a caller could mutate a pending payment object so the store activated a different plan from the charged receipt; direct simulated API calls also read mutable customer validity after waiting.
- Changes made: snapshot payment fields and customer subscription before asynchronous work, and constrain idempotency-key format/length so persisted retries remain representable by the cache schema.
- Verification: lint, TypeScript, and all 36 tests pass. New tests mutate the caller’s plan, payment method, request ID, and subscription dates during checkout, then assert the original price/plan/identity/validity and idempotent retry remain intact.

## Completion audit — 2026-10-22 (Africa/Accra)

- Six atomic fix iterations are committed after the baseline checkpoint. The original 9 tests remain covered; the suite now contains 36 passing tests. No failing lint/type checks or locally actionable critical-path defects were identified in the final audit.
- Final checks: `npm run lint`, `npm run typecheck`, `npm test`, `EXPO_OFFLINE=1 npm run test:smoke`, `EXPO_OFFLINE=1 npx expo export --platform all --output-dir dist-web`, and `git diff --check` pass. Browser tests use a freshly built fixture and include network-disconnected pass display/boarding, reconnection, receipt download, and reload persistence with no runtime errors. Latest screenshots are retained in `artifacts/`.
- Architectural limits: this application still intentionally has a single-device simulated backend. Global seat uniqueness/payment idempotency across devices, protected issuer keys and scanner identities, authoritative time, and coordinated offline conflict resolution require a trusted backend/database. First-use screenshot impersonation needs challenge/response or identity verification. These cannot be truthfully guaranteed by a local-only simulator. No external backend or paid service was added.
- Device limitation: native bundles compile for iOS and Android, but no simulator/physical-device runtime was available for native acceptance testing. Storage failures that prevent durable writes cannot preserve new in-memory changes after process termination; unreadable caches remain protected from automatic overwrite.

## Production launch preparation — 2026-10-23 (Africa/Accra)

- Request: set up the codebase for a full production launch. Audit confirmed the app still has a simulator-only client and no configured Expo/store/backend/payment identities. No public deployment or store submission is claimed.
- Changes: pinned EAS CLI and Node, added validated development/preview/store profiles, dynamic app identity and branded splash, native transport/backup/unused-permission restrictions, production runtime/config/pre-install guards, public environment template and credential exclusions. Added immutable-action CI, manual cloud-build workflow, dependency updates/audit, lockfile-bound readiness reports, release checks, data inventory and a concrete launch/operations runbook. Demo/preview app identities and the visible simulation banner distinguish internal review builds.
- Dependency remediation: applied compatible published overrides for Joi, minimatch 5, nanoid 3, AJV 8 and YAML 2; rejected breaking audit suggestions to downgrade Expo/EAS. The remaining registry audit reports 0 critical, 25 high, 8 moderate and 1 low package findings, including unpatched upstream braces/node-forge and tar advisories. These are recorded as release blockers, not waived or presented as proven runtime exploits.
- Verification: a clean `npm ci` succeeds; lint and TypeScript pass; all 36 existing tests and 10 release-policy/config tests pass (46 total). EAS schema validation, native iOS/Android config introspection, all-platform JS/Hermes export and browser offline/checkout/receipt/boarding/reload workflows pass. Workflow YAML parses and action refs are pinned to resolved commit SHAs. Native config confirms ATS restrictions, backup disabled and removal directives for unused permissions.
- Expected blocked checks: `launch:check`, production Expo config and production build preflight exit nonzero; `security:audit` exits nonzero for the outstanding high advisories. The generated launch report remains BLOCKED (0/25 checks in this unconfigured environment). `LAUNCH.md` lists the actual backend/client work, merchant/signing/store setup, legal details, monitoring and device acceptance needed to unblock a live service. Release setup is not a substitute for those implementations or identities.

## Demo store release: 2026-10-27 (Africa/Accra)

- Decision: ship the on-device simulation to the stores as **ShuttlePass Demo** instead of waiting for a backend. Payments stay simulated.
- Release policy: removed the simulator block from app config, entrypoint and EAS preflight. Production now resolves to `app.shuttlepass.mobile` / "ShuttlePass Demo" / scheme `shuttlepass`. Launch checks dropped the backend, billing and capability gates and now require the EAS project and owner, a public privacy policy URL, a support email, an export-compliance answer, store-account, privacy-policy and device-acceptance evidence, and a fresh shipped-dependency audit (9 checks).
- Store safety: checkout shows fixed, read-only test details and never accepts real card or mobile money numbers. "Call driver" shows a notice instead of dialing the seeded number, which could belong to a real person. Profile gained a privacy and support section (from `EXPO_PUBLIC_PRIVACY_URL` / `EXPO_PUBLIC_SUPPORT_EMAIL`) and a clearly named **Delete local data** action. Added an iOS privacy manifest declaring no tracking and no collected data, `PRIVACY.md`, and a data inventory mapped to Apple and Google privacy forms.
- Dependencies: pinned patched `node-forge` 1.4.1 and `tar` 7.5.22. The audit gate now covers shipped dependencies (`--omit=dev`) and accepts an advisory only through `release/audit-exceptions.json`, with a written assessment and an expiry of at most 120 days. The single exception is `zod` 3 inside the Expo CLI (no patched 3.x); iOS, Android and web bundles were exported with source maps and contain no zod code.
- Verification: lint, TypeScript, 36 domain tests and 11 release tests pass (47). All-platform export and the browser smoke test pass. A separate browser check confirmed the simulated-call notice, read-only checkout fields and the privacy and support buttons. `launch:check` reports 1/9 (the dependency audit); the other 8 need the account holder's Expo and store accounts, hosted privacy policy, export answer and physical-device testing.
