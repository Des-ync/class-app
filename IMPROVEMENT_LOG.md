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
