# ShuttlePass launch setup

Status as of **23 October 2026 (Africa/Accra): release tooling is configured; public production launch is blocked.** The application is still a single-device simulator. No cloud project, store record, payment account, or backend has been created or published by this task.

## Available now

- EAS CLI is pinned in the lockfile. `eas.json` defines development, internal preview and store production profiles; Android previews are APKs and production targets are AABs. Production version numbers increment through EAS.
- Demo and preview identifiers are `app.shuttlepass.mobile.dev` and `app.shuttlepass.mobile.preview`. The provisional production identifier remains `app.shuttlepass.mobile`; its ownership/availability needs verification before registration.
- `app.config.ts` supplies branded splash configuration, separate names/schemes, HTTPS transport policy, disabled Android backup, and blocked unused recording, camera, overlay, vibration and storage permissions. OTA delivery is disabled; these releases use store binaries.
- Production config, runtime and EAS preflight reject the simulator. Changing environment flags or filling URLs does not create a production client.
- CI verifies source, tests, all platform bundles, browser offline workflows and release configuration. A separate security job reports dependency advisories. Manual cloud-build workflow uses operator-owned EAS credentials only; it does not submit or publish store releases.
- `release/readiness.json` records missing evidence. `release/capabilities.json` accurately describes the implementation. These records are not substitutes for code, external accounts, or device tests.

## Reproducible local commands

Use Node from `.nvmrc` and npm from `packageManager`.

```sh
npm ci
npm run verify
EXPO_OFFLINE=1 npm run export:all
EXPO_OFFLINE=1 npm run test:smoke
npm run security:audit
npm run launch:report
npm run launch:check
```

`launch:report` writes `release/status.json` and succeeds so CI can retain the report. `launch:check` deliberately exits nonzero while blockers exist. `security:audit` writes a lockfile-bound report and exits nonzero for high/critical registry findings. Reports contain public metadata, not credential values. Documentation fetches from Expo were blocked by the execution environment; the installed SDK/CLI schemas and declarations were used to validate configuration.

## Operator-owned accounts and environment

1. Establish the actual transport operator, operating authorization, service area, support ownership and handling of student/minor data. Register the production bundle/package identifiers in the operator's Apple Developer and Google Play accounts.
2. Create an operator-owned Expo project. Set `EXPO_APP_OWNER` and `EXPO_PUBLIC_EAS_PROJECT_ID` in EAS environments and the matching GitHub environment variables. `.env.example` documents the public values; never put a payment, database, signing or service-account secret in an `EXPO_PUBLIC_*` variable.
3. Configure iOS signing, Android signing and store credentials in EAS under those accounts. Configure `EXPO_TOKEN` as a GitHub environment secret. Tokens are exposed only to the explicit cloud-build step. Store service-account keys and signing files are ignored by Git/EAS uploads.
4. Review the actual release encryption classification before setting `EXPO_IOS_NON_EXEMPT_ENCRYPTION`. No export-compliance answer is invented by this configuration.
5. Create `preview` and `production` GitHub environments, enter the documented public variables, and protect the release branch and workflow permissions. Workflows are committed locally; activating them requires pushing this repository to its operator-owned remote.

Once the project and signing credentials exist, `npm run build:preview` creates internal review builds. The manual **Build mobile release** workflow offers the same preview target. A preview always carries simulator branding and must not be represented as the live transport service.

## Required production implementation

A full public service still needs the following work; it is not implemented by the release configuration:

| Critical path | Required production behavior                                                                                                                                                                                                                                                                                              |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Identity      | Server-enforced rider/driver/admin permissions; verified registration, session expiry/revocation, recovery and account deletion. Rider input cannot grant staff access. Remove demo login, role switching and seed entitlements from the production client. Store credentials in device secure storage, not AsyncStorage. |
| Booking       | PostgreSQL or equivalent authoritative transactions; unique trip/seat reservations; expiring holds; server prices; idempotency keys scoped to the authenticated customer; no overselling across devices.                                                                                                                  |
| Billing       | Approved merchant account, hosted/tokenized payment collection, signed webhook verification, unique provider event/reference IDs, amount/currency verification, pending/failed/refunded states and reconciliation. Never activate from a client success screen alone or collect raw card details in the production app.   |
| Tickets       | Server-held signing key, key rotation/public-key provisioning, authoritative validity and per-trip consumption. Use a challenge/response or identity check to address first-use screenshot impersonation. The current in-process issuer must be excluded from production.                                                 |
| Offline       | Cache server-signed entitlements, queue uniquely identified boarding events, show pending synchronization, reconcile rejected/duplicate events and define supervisor procedures for a partition. Global offline replay exclusion requires coordinated scanners or an explicit operational constraint.                     |
| Tracking      | Authorized driver location ingestion; route/stop matching; timestamp/staleness handling; appropriate consent, native permissions and background-mode testing. Replace the simulated map feed with actual service data.                                                                                                    |
| Operations    | Authenticated health checks, structured redacted logs, error/crash monitoring, alert ownership, backup/restore drills and incident support.                                                                                                                                                                               |

After implementing these paths, route the production entrypoint to the live client, replace the simulator-only guard with tested production policy, update capability records to describe verified code, and attach evidence in readiness records. Do not merely flip readiness markers or remove checks to force a build.

## Security dependency status

Compatible published patches are pinned through npm overrides for Joi, minimatch 5, nanoid 3, AJV 8 and YAML 2. Some Expo/EAS transitive dependencies still have upstream advisories. At setup time, the registry's latest `braces` (3.0.3) and `node-forge` (1.4.0) were affected, with no published patched versions. `npm audit fix --force` suggested obsolete Expo/EAS downgrades, which were rejected.

Use the generated `release/dependency-audit.json` to assess exact advisory ranges and reachability for the locked toolchain. Remediate through supported upstream releases or document an actual security assessment; no risk acceptance is fabricated here. A reachability assessment documents risk but does not automatically waive the strict audit gate. CI security and production readiness remain blocked until high/critical findings are removed or a separately reviewed alternative policy is implemented.

## Store submission package

Before submission, replace simulator screenshots with real device screenshots of the live service and supply the actual operator's:

- App name, service territory, description, subscription conditions, cancellation/refund terms, support URL and privacy-policy URL.
- Apple privacy disclosures, encryption answers and age-rating responses; Google Data Safety and account-deletion URL. Use `release/data-inventory.md` as the factual starting point, then update it for live SDKs and services.
- Any student/guardian consent processes and school/operator agreements applicable to the service. Determine applicable requirements with the operator; no legal compliance claim is made by this repository.
- Store reviewer accounts and a functioning backend review environment. Never give reviewers production admin privileges.
- Actual App Store Connect app ID and Google service-account credentials in the EAS submit profile/credential store. The provided Android submit target is **internal / draft**, not a public rollout.

After the production checks pass and signed artifacts exist, submission can use the pinned EAS CLI with the configured production submit profile. This task does not run submission commands or bypass the missing identities and backend.

## Acceptance and controlled launch

Run both iOS and Android on real devices through registration/recovery, purchase pending/success/failure/duplicate webhook/refund, concurrent last-seat booking, revoked/expired/replayed QR, airplane-mode boarding and reconciliation, background/foreground tracking, accessibility and account deletion. Record build IDs, OS/device versions, test results and incident contacts in release evidence.

Start with store internal testing/TestFlight, then a limited commuter route and staged store rollout after the operator validates boarding and payment reconciliation. Monitor booking/boarding errors, unresolved payment events, location staleness and crash rates. Pause new purchases if reconciliation or seat consistency fails. Resume only after the operator's verified recovery procedure succeeds.

Keep the last known-good signed build and backend/database migration rollback instructions. Because OTA updates are disabled, client rollback/fixes use the appropriate store release process; backend/schema changes must preserve compatibility with already installed apps.
