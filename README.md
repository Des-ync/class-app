# ShuttlePass

A self-contained Expo / React Native subscription shuttle app for iOS, Android, and web. Built with TypeScript, React Navigation, Zustand, AsyncStorage, SVG maps, and real QR rendering.

## Launch

From this directory, run:

```sh
npx expo start
```

Scan the QR in Expo Go on iOS or Android, press `i` for an installed iOS Simulator (macOS), `a` for an Android Emulator, or `w` for web. Dependencies are installed in this workspace. On a fresh checkout, run `npm ci` once first. If Expo’s remote compatibility service is unavailable, use `EXPO_OFFLINE=1 npx expo start`.

## Try the complete flow

- Use **Login as Student**, **Login as Worker**, or **Login as Driver**. Login and Profile also offer Commuter / Driver / Admin switching.
- **Route:** choose an office or school destination, bus stop or home pickup, morning window, and return window. Doorstep pricing adjusts to GHS 950. Save and activate the matching plan.
- **Plans:** activate Student Standard (GHS 450), Worker Express (GHS 650), or Doorstep VIP (GHS 950). Choose MTN MoMo, Telecel Cash, AirtelTigo Money, or Visa / Mastercard. Demo phone: `0241234567`; demo card: `4242424242424242`, expiry `12/35`, CVV `123`. Receipts are viewable and downloadable/shareable.
- **Home:** view subscription days, toggle auto-renew preference, change evening return, mark today absent, or call the driver through the device dialer.
- **Track:** switch morning/evening, zoom the simulated map, tap stop markers or timeline rows, and watch the shuttle advance. One simulation step occurs every two seconds while the app is open. A complete journey takes about 11 minutes. Location and ETA are illustrative.
- **Pass:** show the generated QR, avatar, validity, route, and seat. Tokens rotate every 30 seconds. Reveal a token for the driver validator if desired.
- **Driver:** select a manifest route, switch inbound/outbound, start/end a run, notify arriving, mark boarded, skip passengers, or validate a QR token. The simulated scan picker provides current rider QR payloads without requesting camera access. The student demo is on SP 02; the worker demo is on SP 01. Driver events update the commuter dashboard and history immediately.
- **Admin:** inspect route demand, service runs, subscriptions, and simulated collections.
- **Profile:** switch demo accounts, inspect activity, sign out, or reset local demo data. New local accounts start without a subscription.

## Data and architecture

- `types/index.ts`: domain models.
- `data/mockData.ts`: Accra routes, landmarks, driver, plans, riders, schedules.
- `services/api.ts`: asynchronous local authentication/payment simulation and rotating pass validation.
- `store/useShuttleStore.ts`: persisted account, booking, billing, manifest, trip, and activity state.
- `components/`: shared UI and animated SVG map.
- `screens/`: connected commuter, driver, admin, and profile workflows.

All data is local to the device. Driver and commuter share one store; this is not a multi-device network backend. Service-day rollover clears attendance and resets trips on the next simulation tick. Payment details are never persisted. Renewals add 30 days to active validity; selecting another tier applies the new plan immediately. Auto-renew is a saved preference and does not initiate unattended payments. The weekday service schedule is informational; demo runs can be exercised any day.

## Verification

```sh
npm run typecheck
npm test
EXPO_OFFLINE=1 npx expo export --platform ios --platform android
EXPO_OFFLINE=1 npx expo export --platform web --output-dir dist-web
```

The browser smoke workflow in `tests/smoke.cjs` expects the exported web app served on port 8082 and system Chromium at `/usr/bin/chromium`. Screenshots are saved under `artifacts/`.

## Deployment boundary

This is a runnable, complete **local simulation** of the requested workflows. It does not collect real payments, authenticate against a real identity provider, perform real GPS tracking, or scan camera images. QR validation is a local demo token check, not a server-backed security mechanism. An actual transport deployment requires a backend with protected roles and signed passes, a payment provider, driver location sharing, privacy controls, monitoring, and native device acceptance testing. iOS/Android Metro exports validate compilation; they do not replace simulator or physical-device testing.
