import nacl from "tweetnacl";
import { getRandomValues } from "expo-crypto";
import { Rider, Run, Trip } from "../types";
import { dayKey, driver } from "../data/mockData";
import { isSubscriptionActive } from "./subscriptions";

export interface PassContext {
  run: Run;
  serviceDay: string;
  tripId: string;
}
export function ticketContext(
  run: Run,
  trip: Trip,
  serviceDay = dayKey(),
): PassContext {
  return { run, serviceDay, tripId: trip.id || `${serviceDay}:${run}:legacy` };
}
let issuer: nacl.SignKeyPair | undefined;
// Local simulated issuer only. Production scanners must receive a pinned public
// key from an authenticated backend; issuer private keys must never ship in apps.
function issuerKey(): nacl.SignKeyPair {
  if (!issuer)
    issuer = nacl.sign.keyPair.fromSeed(getRandomValues(new Uint8Array(32)));
  return issuer;
}
const hex = (bytes: Uint8Array) =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
// Hermes does not guarantee a global TextEncoder. Encode UTF-8 without a
// Node/browser-only API so the signed byte sequence is identical on all clients.
function message(text: string): Uint8Array {
  const bytes: number[] = [];
  for (const character of text) {
    let code = character.codePointAt(0)!;
    if (code >= 0xd800 && code <= 0xdfff) code = 0xfffd;
    if (code < 0x80) bytes.push(code);
    else if (code < 0x800) bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    else if (code < 0x10000)
      bytes.push(
        0xe0 | (code >> 12),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f),
      );
    else
      bytes.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 0x3f),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f),
      );
  }
  return new Uint8Array(bytes);
}
const subscriptionClaim = (rider: Rider) =>
  hex(
    nacl.hash(
      message(
        JSON.stringify(
          rider.subscription && [
            rider.subscription.planId,
            rider.subscription.start,
            rider.subscription.end,
          ],
        ),
      ),
    ),
  );
const defaultContext = (now: number): PassContext => {
  const serviceDay = dayKey(now);
  return { run: "morning", serviceDay, tripId: `${serviceDay}:morning:legacy` };
};
export function passToken(
  rider: Rider,
  now = Date.now(),
  context = defaultContext(now),
): string {
  const payload = [
    "SP2",
    rider.id,
    rider.routeId,
    rider.seat,
    Math.floor(now / 30000),
    context.serviceDay,
    context.run,
    context.tripId,
    subscriptionClaim(rider),
  ].join("|");
  return `${payload}|${hex(nacl.sign.detached(message(payload), issuerKey().secretKey))}`;
}
export function verifyPass(
  token: string,
  riders: Rider[],
  now = Date.now(),
  context = defaultContext(now),
): Rider {
  const invalid = () =>
    new Error("Invalid or expired pass. Refresh the rider’s QR code.");
  if (typeof token !== "string" || token.length > 2048 || !Number.isFinite(now))
    throw invalid();
  const parts = token.trim().split("|");
  const [
    version,
    id,
    route,
    seat,
    bucket,
    serviceDay,
    run,
    tripId,
    claim,
    signature,
  ] = parts;
  if (
    parts.length !== 10 ||
    version !== "SP2" ||
    !/^[0-9a-f]{128}$/.test(signature) ||
    !/^\d+$/.test(bucket)
  )
    throw invalid();
  const tick = Number(bucket),
    current = Math.floor(now / 30000);
  if (
    !Number.isSafeInteger(tick) ||
    tick > current ||
    tick < current - 1 ||
    serviceDay !== context.serviceDay ||
    serviceDay !== dayKey(now) ||
    run !== context.run ||
    tripId !== context.tripId
  )
    throw invalid();
  const bytes = Uint8Array.from(signature.match(/../g)!, (b) =>
    parseInt(b, 16),
  );
  if (
    !nacl.sign.detached.verify(
      message(parts.slice(0, 9).join("|")),
      bytes,
      issuerKey().publicKey,
    )
  )
    throw invalid();
  const rider = riders.find((r) => r.id === id);
  if (
    !rider ||
    rider.routeId !== route ||
    String(rider.seat) !== seat ||
    !Number.isInteger(rider.seat) ||
    rider.seat < 1 ||
    rider.seat > driver.capacity
  )
    throw invalid();
  if (!isSubscriptionActive(rider.subscription, now))
    throw new Error("This subscription has expired or is not yet valid.");
  if (subscriptionClaim(rider) !== claim) throw invalid();
  return rider;
}
export function boardingKey(rider: Rider, context: PassContext): string {
  return JSON.stringify([
    context.serviceDay,
    context.run,
    context.tripId,
    rider.routeId,
    rider.id,
  ]);
}
