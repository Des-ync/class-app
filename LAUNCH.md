# ShuttlePass Demo launch guide

Status as of **27 October 2026**: the app is ready to ship to the stores as **ShuttlePass Demo**, a self-contained demonstration that runs entirely on the device. What remains are things only the account holder can do: create the store and Expo accounts, host the privacy policy, and test on real devices. `npm run launch:check` lists exactly which of those are still open.

## What the release is

- One app, three environments. All of them run the same on-device simulation (`extra.dataMode: "simulation"`); nothing talks to a server.

  | Environment | EAS profile   | Name                | Bundle / package                 | Distribution            |
  | ----------- | ------------- | ------------------- | -------------------------------- | ----------------------- |
  | demo        | `development` | ShuttlePass Dev     | `app.shuttlepass.mobile.dev`     | internal, simulator APK |
  | staging     | `preview`     | ShuttlePass Preview | `app.shuttlepass.mobile.preview` | internal                |
  | production  | `production`  | ShuttlePass Demo    | `app.shuttlepass.mobile`         | App Store / Google Play |

- Every build shows the "DEMO • Payments and tracking are simulated" banner. Checkout uses fixed, read-only test details and never asks for real card or mobile money numbers. "Call driver" shows a notice instead of dialing. Profile has a privacy and support section and a **Delete local data** action.
- No permissions are requested. Unused Android permissions are stripped, Android backup is off, iOS App Transport Security is strict, and the iOS privacy manifest declares no tracking and no collected data.
- OTA updates are disabled; fixes ship as new store builds. Production build numbers increment remotely through EAS.

## Store review risk: read this first

Apple's App Review Guideline 2.2 says demos and trial versions belong in TestFlight, not the App Store, and 4.2 rejects apps without enough lasting value. A clearly labelled interactive demo of a service that does not exist yet is likely to be rejected on iOS. Google Play is usually more tolerant of a clearly labelled demo, but still enforces its misrepresentation policy.

The safe path is:

1. **TestFlight and Google Play internal or closed testing.** These accept demo builds and need no public review for internal testers. This is what `eas submit` targets by default here (`android.track: internal`, `releaseStatus: draft`).
2. **Public listing.** Only if you accept the review risk above. Describe the app on the listing as a demo, for example: "An interactive demo of a subscription shuttle service in Accra. Routes, drivers, payments and tracking are simulated; no real rides or payments." Use real screenshots of the demo.

## One-time setup (account holder)

1. **Expo.** Create or choose an Expo account or organization, then link the project: `npx eas-cli@25.3.0 init`. Note the project ID.
2. **Stores.** Register `app.shuttlepass.mobile` in Apple Developer / App Store Connect and Google Play Console. Let EAS manage signing (`npx eas-cli@25.3.0 credentials`) or upload your own.
3. **Privacy policy.** Host `PRIVACY.md` (edit it first if anything about your setup differs) at a public HTTPS URL, for example with GitHub Pages or Netlify.
4. **Store privacy forms.** Fill in Apple App Privacy and Google Play Data safety using `release/data-inventory.md` ("Data Not Collected" / no data collected or shared).
5. **Export compliance.** Decide your answer. The app only uses signing and the OS's HTTPS, which is typically exempt (`false`); the declaration is yours to make.
6. **Environment values.** Set these in the EAS `production` and `preview` environments (they are compiled into the app) and as GitHub environment variables for the build workflow:

   | Variable                         | Value                             |
   | -------------------------------- | --------------------------------- |
   | `EXPO_APP_OWNER`                 | Expo account or organization slug |
   | `EXPO_PUBLIC_EAS_PROJECT_ID`     | Project UUID from step 1          |
   | `EXPO_PUBLIC_PRIVACY_URL`        | Hosted privacy policy URL         |
   | `EXPO_PUBLIC_SUPPORT_EMAIL`      | A support address you monitor     |
   | `EXPO_IOS_NON_EXEMPT_ENCRYPTION` | `true` or `false`                 |

   Add `EXPO_TOKEN` as a GitHub environment secret. Never put secrets in `EXPO_PUBLIC_*`.

## Release checklist

1. `npm ci && npm run verify` (lint, typecheck, 47 unit and release tests).
2. `npm run build:preview` (or the **Build mobile release** workflow with `preview`) and install it on a physical iPhone and Android phone.
3. Run the device acceptance list below. Record the build IDs, devices, OS versions and results in `release/evidence/device-acceptance.md`.
4. Mark the evidence in `release/readiness.json`: set each item's `status` to `verified` and `evidence` to the file or link that proves it. Only do this once the item is actually done.
5. `npm run security:audit` (must be run within 24 hours of the build), then `npm run launch:check` until it reports READY.
6. `npm run build:production` (or the workflow with `production`). The EAS pre-install hook re-runs the same checks on the build server.
7. `npx eas-cli@25.3.0 submit --profile production` to send the builds to TestFlight and the Play internal track.

### Device acceptance list

On both platforms, from a fresh install:

- Launch, splash screen, demo banner visible, no permission prompts.
- Login as Student, Worker and Driver; create a local profile; sign out and back in.
- Route: change destination and pickup; save; activate the matching plan.
- Plans: buy each plan with each method; payment fields are read-only test values; receipt opens and shares through the share sheet.
- Home and Track: "Call driver" shows the simulated-call notice and does not open the dialer; map and timeline advance; leave the app for a few minutes and return.
- Pass: QR renders and rotates; driver validates it; a second scan of the same pass is rejected.
- Airplane mode: the pass still displays and boarding still works.
- Profile: privacy policy link and support email open; **Delete local data** clears everything.
- Kill and relaunch: state persists. Uninstall and reinstall: state is gone.
- Accessibility: VoiceOver and TalkBack can reach and name every control; text scales with the system font size.

## Commands

```sh
npm ci
npm run verify
EXPO_OFFLINE=1 npm run export:all
EXPO_OFFLINE=1 npm run test:smoke   # browser end-to-end, needs Chromium
npm run security:audit
npm run launch:report               # writes release/status.json, always exits 0
npm run launch:check                # exits nonzero while anything is open
```

## Dependency audit policy

`security:audit` audits the dependencies that ship in the app (`npm audit --omit=dev`) and fails on any high or critical advisory that is not covered by `release/audit-exceptions.json`. Each exception names one advisory, records how it was assessed, and expires within 120 days. A unit test fails once an exception expires, so it has to be reassessed rather than lingering. The full toolchain audit (EAS CLI, ESLint) is included in the report for information.

Current state: patched `node-forge` (1.4.1) and `tar` (7.5.22) are pinned through npm overrides. One exception remains: `zod` 3 inside the Expo CLI (GHSA-mrhx-c7xc-m3w5), which has no patched 3.x release. It runs only on developer and CI machines; the exported iOS, Android and web bundles were checked and contain no zod code. Remove the exception when Expo moves its CLI to a patched zod.

## Turning the demo into a real service later

The demo is deliberately single-device. A real launch would need a backend (accounts, seat booking, payment webhooks with a Ghana provider such as Paystack, server-held pass signing keys, live driver location) and a client that talks to it. `release/capabilities.json` records what is simulated today. Before any of that ships, update `PRIVACY.md`, `release/data-inventory.md`, the store privacy answers and this guide.
