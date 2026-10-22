# ShuttlePass improvement log

## Baseline — 2026-10-22 (Africa/Accra)

- Problem identified: the existing application was present in the working tree but had not been committed. The audit found payment/seat races, checksum-only passes, unsafe persistence writes, and tracking coupled to the selected screen/run.
- Changes made: checkpoint the existing application before atomic fixes. No existing work is discarded.
- Verification: `npm run lint`, `npm run typecheck`, and `npm test` pass (9 tests).
