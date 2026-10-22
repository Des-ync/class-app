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
