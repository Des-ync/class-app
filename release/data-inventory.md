# Data inventory for store privacy forms

This describes the shipped demo build. Every value below stays on the device; nothing is transmitted to the developer or a third party.

| Data                                                      | Handling                                                        |
| --------------------------------------------------------- | --------------------------------------------------------------- |
| Name, email, rider category                               | Entered or seeded locally; stored in AsyncStorage on device     |
| Home address, stop, school/work destination, time windows | Local route configuration in AsyncStorage                       |
| Subscription, seat, receipts                              | Simulated locally; receipts can be shared by the user           |
| Payment details                                           | None collected. Checkout uses fixed, read-only test values      |
| Boarding and trip history                                 | Local activity and consumption ledger                           |
| Driver contact                                            | Fictional; "Call driver" shows a notice and never dials         |
| Location                                                  | Simulated coordinates only; no location permission requested    |
| Keys                                                      | Per-process in-memory signing key for demo QR passes; not saved |
| Diagnostics                                               | None. No analytics, crash reporting or advertising SDKs         |

## Store answers this supports

- **Apple App Privacy:** "Data Not Collected". Apple defines collection as transmitting data off the device, which the app never does. The iOS privacy manifest (`app.config.ts`) declares no tracking and no collected data types.
- **Google Play Data safety:** no data collected and no data shared. Local profiles are not developer-held accounts, so there is no server-side account to delete; the in-app **Delete local data** action and uninstalling remove everything.
- **Export compliance:** the app uses signing (Ed25519, for demo QR passes) and the operating system's HTTPS only. That use is typically exempt, which supports `EXPO_IOS_NON_EXEMPT_ENCRYPTION=false`; the account holder must make and own that declaration.
- **Age rating / audience:** no user-generated content, chat, purchases of real goods, or data collection.

Adding any SDK, network call or permission requires updating this inventory, `PRIVACY.md` and the store disclosures before release.
