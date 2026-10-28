# TestFlight beta: ShuttlePass Demo

Copy these into App Store Connect > ShuttlePass Demo > TestFlight. Internal testers (people on your App Store Connect team, up to 100) can install as soon as a build finishes processing. External testers (up to 10,000, by email or public link) need Apple's beta review first, usually within a day.

## Test Information

**Beta App Description**

ShuttlePass Demo is an interactive demo of a monthly subscription shuttle service for school and work commutes in Accra, Ghana. Pick a route and pickup point, try a plan, show a QR boarding pass, follow the shuttle on a map, and switch to the driver and operator views. Routes, drivers, payments and tracking are simulated; there are no real rides or payments, and nothing you enter leaves your phone.

**Feedback Email**

kingema93@gmail.com

**Marketing URL**

https://shuttlepass-demo.netlify.app/

**Privacy Policy URL**

https://shuttlepass-demo.netlify.app/privacy/

## What to Test (per build)

Thanks for trying ShuttlePass Demo. Everything is simulated: no real rides, payments or phone calls.

1. Sign in with "Login as Student" or "Login as Worker".
2. Route tab: change destination and pickup, save, then activate the matching plan.
3. Plans tab: buy a plan (test details are pre-filled), open the receipt and share it.
4. Pass tab: check the QR code shows and refreshes.
5. Track tab: follow the shuttle and tap stops on the map.
6. Profile: switch to the driver view, choose your route, tap "Scan QR / validate pass", pick your name and board. Switch back to the commuter view and check the trip shows as boarded.
7. Turn on Airplane Mode and confirm your pass still shows.

Please report anything confusing, broken or slow using the screenshot feedback in TestFlight.

## Beta App Review Information (external testing only)

**Sign-in required:** No. Tap "Login as Student" on the first screen; no account or password is needed.

**Contact:** your name, kingema93@gmail.com and a phone number Apple can reach during review.

**Review notes**

This is a demonstration build. All data is simulated and stored only on the device. The app has no server, collects no data, requests no permissions, and never asks for real payment details: the checkout uses fixed, read-only test values and charges nothing. "Call driver" shows a notice instead of placing a call. Use "Login as Student", "Login as Worker" or "Login as Driver" on the first screen to explore each role.

## Export compliance

Answered in the build (`ITSAppUsesNonExemptEncryption = false`), so App Store Connect will not ask on each upload.
