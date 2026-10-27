# ShuttlePass Demo launch guide

Status as of **27 October 2026**: the app is ready to ship to the stores as **ShuttlePass Demo**, a self-contained demonstration that runs entirely on the device. The privacy policy, support and data-deletion pages are live on Netlify, and the support email and export-compliance answer are set. What remains needs the account holder's own logins: the Expo project, the Apple and Google store records, and testing on real devices. `npm run launch:check` lists exactly which items are still open (5/9 pass today).

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

## Store pages (done)

The static site in `site/` is deployed to the Netlify project `shuttlepass-demo` (`netlify.toml` publishes only that folder):

| Store field                              | URL                                               |
| ---------------------------------------- | ------------------------------------------------- |
| Privacy policy (both stores)             | https://shuttlepass-demo.netlify.app/privacy/     |
| Support URL (App Store) / website (Play) | https://shuttlepass-demo.netlify.app/support/     |
| Data deletion (Play, if asked)           | https://shuttlepass-demo.netlify.app/delete-data/ |
| Support email                            | kingema93@gmail.com                               |

`eas.json` sets `EXPO_PUBLIC_PRIVACY_URL`, `EXPO_PUBLIC_SUPPORT_EMAIL` and `EXPO_IOS_NON_EXEMPT_ENCRYPTION=false` for preview and production builds, so the app's Profile links work without extra setup. When you edit `PRIVACY.md`, edit `site/privacy/index.html` to match (a release test compares their headings and date), then redeploy. To have Netlify redeploy on every push, connect the repository once in the Netlify dashboard (Project configuration > Build & deploy > Link repository, choose GitHub and `Des-ync/class-app`, production branch `main`, build command empty, publish directory `site`). `netlify.toml` then skips any build where `site/` and `netlify.toml` are unchanged, and pull requests that touch the site get a Deploy Preview.

## One-time setup (account holder)

1. **Expo.** Create or choose an Expo account or organization, then link the project: `npx eas-cli@25.3.0 login` and `npx eas-cli@25.3.0 init`. Note the project ID and owner slug.
2. **GitHub.** In the repository settings, create `preview` and `production` environments. Add the variables `EXPO_APP_OWNER` and `EXPO_PUBLIC_EAS_PROJECT_ID`, and the secret `EXPO_TOKEN` (create one at expo.dev under Access tokens). Set the same two variables in the EAS `preview` and `production` environments. Never put secrets in `EXPO_PUBLIC_*`.
3. **Stores.** Register `app.shuttlepass.mobile` in App Store Connect (Apple Developer Program, USD 99/year) and Google Play Console (USD 25 one-time). Let EAS manage signing (`npx eas-cli@25.3.0 credentials`) or upload your own. New personal Google Play accounts may have to run a closed test with a minimum number of testers for about two weeks before production access; check the current rule in Play Console.
4. **Store listing.** Use the URLs above. Fill in Apple App Privacy and Google Play Data safety from `release/data-inventory.md` ("Data Not Collected" / no data collected or shared). Answer export compliance with "No" for non-exempt encryption, matching `EXPO_IOS_NON_EXEMPT_ENCRYPTION=false`.
5. **Evidence.** Set `store_accounts` in `release/readiness.json` to `verified` with the App Store Connect app ID and Play package link once both records exist.

## Release checklist

1. `npm ci && npm run verify` (lint, typecheck, 48 unit and release tests).
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
