# ShuttlePass improvement log

## Baseline — 2026-10-22 (Africa/Accra)

- Problem identified: the existing application was present in the working tree but had not been committed. The audit found payment/seat races, checksum-only passes, unsafe persistence writes, and tracking coupled to the selected screen/run.
- Changes made: checkpoint the existing application before atomic fixes. No existing work is discarded.
- Verification: `npm run lint`, `npm run typecheck`, and `npm test` pass (9 tests).

## Iteration 1 — idempotent checkout and seat reservation

- Problem identified: concurrent checkout could double-charge the simulation and overwrite validity; registrations reused seat 15, and no seats were reserved before payment latency.
- Changes made: hold route seats synchronously before payment, allocate unique route seats only on activation, reuse persisted request IDs on retries, reject conflicting purchases, and discard results invalidated by demo reset. Active route transfers enforce capacity; registration IDs are unique and unpaid riders have seat 0. Checkout UI retains a request ID through retries. New fields on receipts are optional for old stored data.
- Verification: lint and TypeScript pass; all 13 tests pass, including concurrent duplicate purchase, persisted replay, last-seat contention, stale completion, registration collisions, and full-route transfers. Existing tests retained.
