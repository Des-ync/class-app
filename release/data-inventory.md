# Data inventory for release review

This describes the current simulator, not a final production privacy policy.

| Data                                                      | Current handling                                                  | Production requirement                                                                                              |
| --------------------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Name, email, rider category                               | Entered locally or seeded; stored in AsyncStorage                 | Verify identity, purpose, access controls, retention and deletion.                                                  |
| Home address, stop, school/work destination, time windows | Local persistent route configuration                              | Limit staff access; document routing purpose and retention; review student/guardian requirements.                   |
| Subscription and seat entitlement                         | Simulated locally and cached                                      | Server authority, tamper-resistant entitlement verification and revocation.                                         |
| Card/mobile-money input                                   | Demo validation in memory; not saved                              | Hosted/tokenized provider collection; no raw card data in the app/backend.                                          |
| Receipts and billing activity                             | Simulated persistent records; user can export/share text          | Provider-backed receipts, audited access, financial retention and refund/deletion rules.                            |
| Boarding/trip history                                     | Local activity and consumption ledger                             | Audited staff access, explicit offline sync status and dispute process.                                             |
| Driver contact                                            | Seeded phone; device dialer opens when selected                   | Approved operator contact channels and consent.                                                                     |
| Location                                                  | Simulated coordinates; no live GPS collection                     | Document actual driver/rider location use, consent, retention, permissions and background behavior before enabling. |
| Keys and credentials                                      | Per-process simulator signing key; no production auth credentials | Server/KMS issuer key, pinned public keys, secure device session storage and revocation.                            |
| Diagnostics                                               | Local errors/test artifacts                                       | Choose a monitoring processor and redact passenger/payment data before telemetry.                                   |

A local demo reset is not a production account-deletion workflow. No analytics/advertising tracker, live payment processor or live location service has been configured. Adding any SDK/service requires updating this inventory and the actual store disclosures.
